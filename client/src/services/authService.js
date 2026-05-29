import api from "./api";

export const login = (email, password) => {
  return api.post("/auth/login", { email, password });
};

export const register = (username, email, password) => {
  return api.post("/auth/register", { username, email, password });
};

export const getMe = () => {
  return api.get("/auth/me");
};

export const updateProfile = (data) =>
  api.patch("/user/profile", data);

export const uploadAvatar = (formData) =>
  api.post("/user/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
