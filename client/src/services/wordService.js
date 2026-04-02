import api from "./api";

export const searchWords = (query, page = 1, limit = 20) => {
  return api.get("/search", { params: { q: query, page, limit } });
};

export const getWordById = (id) => {
  return api.get(`/words/${id}`);
};

export const getWordsByJlptLevel = (level, page = 1, limit = 20) => {
  return api.get(`/words/jlpt/${level}`, { params: { page, limit } });
};
