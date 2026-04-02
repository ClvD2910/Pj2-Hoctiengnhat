const dictionaryRepo = require("../repositories/dictionaryRepository");

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

// @desc    Get words by JLPT level
// @route   GET /api/words/jlpt/:level
const getWordsByJlptLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const validLevels = ["N5", "N4", "N3", "N2", "N1"];

    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({ message: "JLPT level không hợp lệ (N5-N1)" });
    }

    const { page, limit } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const data = await dictionaryRepo.findByJlptLevel(level.toUpperCase(), {
      page: pageNum,
      limit: limitNum,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { searchWords, getWordById, getWordsByJlptLevel };
