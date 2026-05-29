import api from "./api";

/**
 * Fetch kanji details for every unique kanji character found in `chars`.
 * Excludes SVG + examples to keep payload small (for batch use in search results).
 *
 * @param {string} chars - A string containing one or more kanji (e.g. "勉強中")
 */
export const analyzeKanji = (chars) =>
  api.get("/kanji/analyze", { params: { chars } });

/**
 * Fetch full detail for a single kanji character, including SVG stroke diagram
 * and examples. Used by KanjiDetailPage.
 *
 * @param {string} char - A single kanji character (e.g. "勉")
 */
export const getKanjiByChar = (char) =>
  api.get(`/kanji/${encodeURIComponent(char)}`);

/**
 * Fetch n daily-random kanji from the top 600 most common (changes each day).
 */
export const getDailyKanji = (n = 6) =>
  api.get("/kanji/daily", { params: { n } });
