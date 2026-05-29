const Kanji = require("../models/Kanji");

// CJK Unified Ideographs — the standard range for Kanji used in Japanese
const KANJI_RE = /[\u4e00-\u9fff]/g;

// ── Date-seeded shuffle helpers ─────────────────────────────────────────────
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

/**
 * @desc  Fetch kanji details for every unique kanji character found in `chars`.
 * @route GET /api/kanji/analyze?chars=勉強中
 */
const analyzeKanji = async (req, res) => {
  try {
    const { chars } = req.query;

    if (!chars || typeof chars !== "string") {
      return res.status(400).json({ message: "Query param `chars` is required." });
    }

    // Deduplicate while preserving input order
    const unique = [...new Set(chars.match(KANJI_RE) || [])];

    if (unique.length === 0) {
      return res.json([]);
    }

    // Exclude the heavy SVG + examples fields to keep batch payloads small
    const rows = await Kanji.find(
      { kanji: { $in: unique } },
      { img: 0, examples: 0, __v: 0 }
    ).lean();

    // Build a fast lookup map, then return results in input order
    const map = Object.fromEntries(rows.map((r) => [r.kanji, r]));
    const ordered = unique.map((c) => map[c]).filter(Boolean);

    res.json(ordered);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * @desc  Fetch full details for a single kanji character (includes SVG + examples).
 * @route GET /api/kanji/:char
 */
const getKanjiByChar = async (req, res) => {
  try {
    const char = decodeURIComponent(req.params.char);

    if (!char || !/[\u4e00-\u9fff]/.test(char)) {
      return res.status(400).json({ message: "Tham số không hợp lệ." });
    }

    const kanji = await Kanji.findOne({ kanji: char }, { __v: 0 }).lean();

    if (!kanji) {
      return res.status(404).json({ message: `Không tìm thấy Hán tự "${char}".` });
    }

    res.json(kanji);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

/**
 * @desc  Return n kanji from the top 600 most common (by freq), changing daily.
 * @route GET /api/kanji/daily?n=6
 */
const getDailyKanji = async (req, res) => {
  try {
    const n = Math.min(parseInt(req.query.n) || 6, 20);

    const pool = await Kanji.find(
      { freq: { $gt: 0 } },
      { img: 0, examples: 0, __v: 0 }
    ).sort({ freq: 1 }).limit(600).lean();

    if (pool.length === 0) return res.json([]);

    res.json(seededShuffle(pool, dateSeed()).slice(0, n));
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { analyzeKanji, getKanjiByChar, getDailyKanji };
