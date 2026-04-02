const Word = require("../models/Word");

// ---------------------------------------------------------------------------
// Bulk write (dùng cho import script)
// ---------------------------------------------------------------------------

/**
 * Insert một batch records vào collection Word.
 * ordered: false → tiếp tục insert dù có document lỗi.
 * @param {Array} batch - Mảng các object word đã được chuẩn hoá
 * @returns {{ inserted: number, errors: number }}
 */
const bulkInsert = async (batch) => {
  try {
    const result = await Word.insertMany(batch, { ordered: false });
    return { inserted: result.length, errors: 0 };
  } catch (error) {
    // BulkWriteError: một số document lỗi nhưng phần còn lại vẫn insert thành công
    if (error.insertedDocs) {
      return {
        inserted: error.insertedDocs.length,
        errors: batch.length - error.insertedDocs.length,
      };
    }
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Query helpers (dùng cho API)
// ---------------------------------------------------------------------------

/**
 * Escape special regex characters in user input to prevent ReDoS
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Search by exact kanji match
 */
const findByKanji = async (kanji) => {
  return Word.find({ kanji });
};

/**
 * Search by hiragana (exact or prefix)
 */
const findByHiragana = async (hiragana) => {
  const escaped = escapeRegex(hiragana);
  return Word.find({ hiragana: { $regex: `^${escaped}`, $options: "i" } });
};

/**
 * Search by romaji (prefix match)
 */
const findByRomaji = async (romaji) => {
  const escaped = escapeRegex(romaji);
  return Word.find({ romaji: { $regex: `^${escaped}`, $options: "i" } });
};

/**
 * Search by Vietnamese meaning (partial match)
 */
const findByMeaning = async (meaning) => {
  const escaped = escapeRegex(meaning);
  return Word.find({ meanings: { $regex: escaped, $options: "i" } });
};

/**
 * Unified search: auto-detect input type and query accordingly
 */
const search = async (query, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const escaped = escapeRegex(query);

  // Detect if query contains Japanese characters (Kanji / Hiragana / Katakana)
  const isJapanese = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(query);
  // Detect if query is pure romaji (Latin letters only)
  const isRomaji = /^[a-zA-Z\s]+$/.test(query);

  let filter;

  if (isJapanese) {
    // Search across kanji and hiragana fields
    filter = {
      $or: [
        { kanji: { $regex: escaped, $options: "i" } },
        { hiragana: { $regex: escaped, $options: "i" } },
      ],
    };
  } else if (isRomaji) {
    // Could be romaji or Vietnamese — search both
    filter = {
      $or: [
        { romaji: { $regex: `^${escaped}`, $options: "i" } },
        { meanings: { $regex: escaped, $options: "i" } },
      ],
    };
  } else {
    // Vietnamese or mixed input — search meanings
    filter = {
      meanings: { $regex: escaped, $options: "i" },
    };
  }

  const [results, total] = await Promise.all([
    Word.find(filter).skip(skip).limit(limit).lean(),
    Word.countDocuments(filter),
  ]);

  return {
    results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Find a single word by its ID
 */
const findById = async (id) => {
  return Word.findById(id);
};

/**
 * Filter words by JLPT level
 */
const findByJlptLevel = async (level, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Word.find({ jlpt_level: level }).skip(skip).limit(limit).lean(),
    Word.countDocuments({ jlpt_level: level }),
  ]);

  return {
    results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  bulkInsert,
  findByKanji,
  findByHiragana,
  findByRomaji,
  findByMeaning,
  findById,
  findByJlptLevel,
  search,
};
