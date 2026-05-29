const Word = require("../models/Word");
const wanakana = require("wanakana");

// Bulk write (dùng cho import script)

/**
 * Insert một batch records vào collection Word.
 * ordered: false - tiếp tục insert dù có document lỗi.
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

// Query helpers (dùng cho API)

/**
 * Escape special regex characters in user input to prevent ReDoS
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const generateSubstrings = (str) => {
  const chars = [...str]; // spread splits by Unicode code point
  const len = chars.length;
  const subs = new Set();
  for (let start = 0; start < len; start++) {
    for (let end = start + 1; end <= len; end++) {
      if (end - start < len) { // exclude the full string itself
        subs.add(chars.slice(start, end).join(""));
      }
    }
  }
  return [...subs];
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
 * Unified search: auto-detect input type, score by relevance, paginate.
 *
 * Scoring (Japanese input):
 *   100 – kanji exact match
 *    80 – reading exact match
 *    40 – kanji starts with query
 *    20 – reading starts with query
 *    +length bonus – shorter word = more direct hit
 *
 * Scoring (Vietnamese / Latin input):
 *   100 – any meaning is an exact match
 *    80 – sinoViet exact match
 *    40 – any meaning starts with query
 *    20 – sinoViet starts with query
 */
const search = async (query, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const escaped = escapeRegex(query);
  const isJapanese = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(query);

  // Romaji detection: pure-ASCII kana romanisation (e.g. "benkyou", "taberu").
  // wanakana.isRomaji returns false for Vietnamese (diacritics) and pure numbers.
  const isRomaji = !isJapanese && wanakana.isRomaji(query);

  // When romaji, convert to hiragana so we can search the `reading` field.
  const effectiveQuery  = isRomaji ? wanakana.toHiragana(query) : query;
  const escapedEffective = isRomaji ? escapeRegex(effectiveQuery) : escaped;

  let matchStage;
  let scoreExpr;

  if (isJapanese || isRomaji) {
    // Sub-word search: find entries whose kanji/reading is a proper substring of query
    // e.g. query="勉強中" → also returns "勉強" (限 10 chars to keep substrings bounded)
    const substrings = effectiveQuery.length <= 10 ? generateSubstrings(effectiveQuery) : [];

    matchStage = {
      $or: [
        { kanji:   { $regex: escapedEffective, $options: "i" } },
        { reading: { $regex: escapedEffective, $options: "i" } },
        ...(substrings.length > 0
          ? [{ kanji: { $in: substrings } }, { reading: { $in: substrings } }]
          : []),
      ],
    };
    scoreExpr = {
      $add: [
        { $cond: [{ $eq: ["$kanji", effectiveQuery] }, 100, 0] },
        { $cond: [{ $eq: ["$reading", effectiveQuery] }, 80, 0] },
        {
          $cond: [
            {
              $and: [
                { $gt: [{ $strLenCP: { $ifNull: ["$kanji", ""] } }, 0] },
                { $regexMatch: { input: "$kanji", regex: `^${escapedEffective}`, options: "i" } },
              ],
            },
            40, 0,
          ],
        },
        {
          $cond: [
            { $regexMatch: { input: { $ifNull: ["$reading", ""] }, regex: `^${escapedEffective}`, options: "i" } },
            20, 0,
          ],
        },
        // Bonus: ưu tiên từ ngắn hơn (khớp trực tiếp hơn)
        {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: ["$kanji", "$reading"] } }, 0] },
            { $divide: [10, { $strLenCP: { $ifNull: ["$kanji", "$reading"] } }] },
            0,
          ],
        },
        // Sub-word bonus: score by length so longer sub-word hits rank higher
        ...(substrings.length > 0
          ? [
              {
                $cond: [
                  { $and: [
                    { $gt: [{ $strLenCP: { $ifNull: ["$kanji", ""] } }, 0] },
                    { $in: [{ $ifNull: ["$kanji", ""] }, substrings] },
                  ]},
                  { $multiply: [{ $strLenCP: { $ifNull: ["$kanji", ""] } }, 5] },
                  0,
                ],
              },
              {
                $cond: [
                  { $and: [
                    { $gt: [{ $strLenCP: { $ifNull: ["$reading", ""] } }, 0] },
                    { $in: [{ $ifNull: ["$reading", ""] }, substrings] },
                  ]},
                  { $multiply: [{ $strLenCP: { $ifNull: ["$reading", ""] } }, 3] },
                  0,
                ],
              },
            ]
          : []),
      ],
    };
  } else {
    matchStage = {
      $or: [
        { meanings: { $regex: escaped, $options: "i" } },
        { sinoViet: { $regex: escaped, $options: "i" } },
      ],
    };
    scoreExpr = {
      $add: [
        // Nghĩa khớp chính xác
        {
          $cond: [
            {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$meanings", []] },
                      as: "m",
                      cond: { $eq: ["$$m", query] },
                    },
                  },
                },
                0,
              ],
            },
            100, 0,
          ],
        },
        // sinoViet khớp chính xác
        {
          $cond: [
            { $regexMatch: { input: { $ifNull: ["$sinoViet", ""] }, regex: `^${escaped}$`, options: "i" } },
            80, 0,
          ],
        },
        // Nghĩa bắt đầu bằng query
        {
          $cond: [
            {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$meanings", []] },
                      as: "m",
                      cond: { $regexMatch: { input: "$$m", regex: `^${escaped}`, options: "i" } },
                    },
                  },
                },
                0,
              ],
            },
            40, 0,
          ],
        },
        // sinoViet bắt đầu bằng query
        {
          $cond: [
            { $regexMatch: { input: { $ifNull: ["$sinoViet", ""] }, regex: `^${escaped}`, options: "i" } },
            20, 0,
          ],
        },
      ],
    };
  }

  const pipeline = [
    { $match: matchStage },
    { $addFields: { _score: scoreExpr } },
    { $sort: { _score: -1 } },
    {
      $facet: {
        results: [{ $skip: skip }, { $limit: limit }, { $project: { _score: 0 } }],
        total:   [{ $count: "count" }],
      },
    },
  ];

  const [agg] = await Word.aggregate(pipeline);
  const results = agg?.results ?? [];
  const total   = agg?.total?.[0]?.count ?? 0;

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
