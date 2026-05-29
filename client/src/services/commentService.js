import api from "./api";

export const getComments = (targetType, targetId, page = 1) =>
  api.get("/comments", { params: { targetType, targetId, page } });

export const addComment = (targetType, targetId, content) =>
  api.post("/comments", { targetType, targetId, content });

export const deleteComment = (id) =>
  api.delete(`/comments/${id}`);

export const voteComment = (id, vote) =>
  api.post(`/comments/${id}/vote`, { vote });
