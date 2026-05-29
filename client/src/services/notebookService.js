import api from "./api";

export const getNotebooks = () => api.get("/notebooks");

export const getNotebookById = (id) => api.get(`/notebooks/${id}`);

export const createNotebook = (name) => api.post("/notebooks/create", { name });

export const addWordToNotebook = (wordId, notebookId) =>
  api.post("/notebooks/add-word", { wordId, notebookId });

export const deleteNotebook = (id) => api.delete(`/notebooks/${id}`);

export const renameNotebook = (id, name) =>
  api.patch(`/notebooks/${id}/rename`, { name });

/**
 * Add a fully custom word entry (no original_word_id).
 * @param {string} notebookId
 * @param {{ word: string, phonetic?: string, meaning?: string, note?: string }} data
 */
export const addCustomWordToNotebook = (notebookId, data) =>
  api.post(`/notebooks/${notebookId}/custom-word`, data);

/**
 * Update personal fields of a notebook entry.
 * @param {string} notebookId
 * @param {string} entryId  — the embedded entry's _id
 * @param {{ phonetic?: string, meaning?: string, note?: string }} data
 */
export const updateWordInNotebook = (notebookId, entryId, data) =>
  api.put(`/notebooks/${notebookId}/words/${entryId}`, data);

/**
 * Remove a word entry from a notebook.
 * @param {string} notebookId
 * @param {string} entryId  — the embedded entry's _id (not the original word's _id)
 */
export const removeWordFromNotebook = (notebookId, entryId) =>
  api.delete(`/notebooks/${notebookId}/words/${entryId}`);

/**
 * Toggle (or set) the `mastered` flag of a notebook entry.
 * @param {string} notebookId
 * @param {string} entryId
 * @param {boolean} mastered  — the new value to set
 */
export const toggleWordMastered = (notebookId, entryId, mastered) =>
  api.patch(`/notebooks/${notebookId}/words/${entryId}/mastered`, { mastered });
