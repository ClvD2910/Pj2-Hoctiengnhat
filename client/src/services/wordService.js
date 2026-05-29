import api from "./api";

export const searchWords = (query, page = 1, limit = 20) => {
  return api.get("/search", { params: { q: query, page, limit } });
};

// Fast autocomplete — returns raw Word docs with kanji/reading/meanings
export const suggestWords = (query, limit = 6) => {
  return api.get("/suggest", { params: { q: query, limit } });
};

export const getWordById = (id) => {
  return api.get(`/words/${id}`);
};

export const getWordsByJlptLevel = (level, page = 1, limit = 20) => {
  return api.get(`/words/jlpt/${level}`, { params: { page, limit } });
};

//Fetch n daily-random words sourced from top-600 popular kanji (changes each day).
 
export const getDailyWords = (n = 6) =>
  api.get("/words/daily", { params: { n } });
