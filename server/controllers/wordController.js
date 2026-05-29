const dictionaryRepo = require("../repositories/dictionaryRepository");
const Kanji = require("../models/Kanji");
const Word = require("../models/Word");
const wanakana = require("wanakana");

// Date-seeded shuffle helpers (mirrors kanjiController) 
const dateSeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const seededShuffle = (arr, seed) => {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// @desc    Search words (kanji, hiragana, romaji, or Vietnamese meaning)
// @route   GET /api/search?q=...&page=1&limit=20
const searchWords = async (req, res) => {
  try {
    const { q, page, limit } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const data = await dictionaryRepo.search(q.trim(), {
      page: pageNum,
      limit: limitNum,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    Get a single word by ID
// @route   GET /api/words/:id
const getWordById = async (req, res) => {
  try {
    const word = await dictionaryRepo.findById(req.params.id);
    if (!word) {
      return res.status(404).json({ message: "Không tìm thấy từ" });
    }
    res.json(word);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    JLPT — không có trong bộ dữ liệu hiện tại
// @route   GET /api/words/jlpt/:level
const getWordsByJlptLevel = async (_req, res) => {
  res.status(400).json({ message: "Dữ liệu hiện tại không phân loại theo JLPT" });
};

// @desc  Return n words that contain kanji from the top 600 most common, changing daily.
// @route GET /api/words/daily?n=6
const getDailyWords = async (req, res) => {
  try {
    const n = Math.min(parseInt(req.query.n) || 6, 20);

    // Fetch top 600 popular kanji characters
    const popularKanji = await Kanji.find(
      { freq: { $gt: 0 } },
      { kanji: 1, _id: 0 }
    ).sort({ freq: 1 }).limit(600).lean();

    if (popularKanji.length === 0) return res.json({ results: [] });

    const chars = popularKanji.map((k) => k.kanji);

    // Offset seed so today's word picks differ from the kanji picks
    const shuffledChars = seededShuffle(chars, dateSeed() + 999983);
    const pickedChars = shuffledChars.slice(0, 4);

    // Find words whose `kanji` field contains any of the picked characters
    const charClass = `[${pickedChars.join("")}]`;
    const words = await Word.find({ kanji: { $regex: charClass } }).limit(80).lean();

    if (words.length === 0) return res.json({ results: [] });

    const shuffled = seededShuffle(words, dateSeed() + 777);
    res.json({ results: shuffled.slice(0, n) });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// @desc  Fast autocomplete suggestions — no scoring, minimal projection
// @route GET /api/suggest?q=...&limit=6
const suggestWords = async (req, res) => {
  try {
    const { q, limit = 6 } = req.query;
    if (!q?.trim()) return res.json([]);

    const escaped     = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isJapanese  = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(q);
    // Vietnamese: contains diacritics or extended Latin chars
    const isVietnamese = /[àáảãạăắặằẳẵâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẶẰẲẴÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/.test(q);
    const isRomaji    = !isJapanese && !isVietnamese && wanakana.isRomaji(q.trim());
    const effectiveQ  = isRomaji ? wanakana.toHiragana(q.trim()) : q.trim();
    const escapedEff  = effectiveQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let matchStage;
    if (isJapanese || isRomaji) {
      matchStage = {
        $or: [
          { kanji:   { $regex: escapedEff, $options: "i" } },
          { reading: { $regex: escapedEff, $options: "i" } },
        ],
      };
    } else {
      // Vietnamese or unknown Latin — search meanings + sinoViet
      // Also include romaji-converted reading in case it's ambiguous ASCII
      matchStage = {
        $or: [
          { meanings: { $elemMatch: { $regex: escaped, $options: "i" } } },
          { sinoViet: { $regex: escaped, $options: "i" } },
        ],
      };
    }

    const cap = Math.min(parseInt(limit) || 6, 12);

    // Fetch a wider pool then sort in JS — exact > starts-with > contains
    const pool = await Word.find(matchStage)
      .select("kanji reading sinoViet meanings")
      .limit(cap * 8)
      .lean();

    const q2 = effectiveQ.toLowerCase();
    const score = (doc) => {
      if (isJapanese || isRomaji) {
        const k = (doc.kanji   || "").toLowerCase();
        const r = (doc.reading || "").toLowerCase();
        if (k === q2 || r === q2)               return 0;
        if (k.startsWith(q2) || r.startsWith(q2)) return 1;
        return 2;
      } else {
        const qLow = q.trim().toLowerCase();
        const meanings = (doc.meanings || []).map((m) => m.toLowerCase());
        const sv = (doc.sinoViet || "").toLowerCase();
        if (meanings.some((m) => m === qLow) || sv === qLow) return 0;
        if (meanings.some((m) => m.startsWith(qLow)) || sv.startsWith(qLow)) return 1;
        return 2;
      }
    };
    pool.sort((a, b) => score(a) - score(b));

    res.json(pool.slice(0, cap));
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { searchWords, getWordById, getWordsByJlptLevel, getDailyWords, suggestWords };
