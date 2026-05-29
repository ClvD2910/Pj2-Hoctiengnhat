import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import {
  updateProfile as updateProfileApi,
  uploadAvatar  as uploadAvatarApi,
} from "../services/authService";
import { SERVER_BASE } from "../services/api";

// Toggle 
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
    >
      <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 absolute top-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

// Profile Tab 
function ProfileTab() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    username: user?.username || "",
    jlptGoal: user?.jlptGoal || "N5",
  });
  const [saving,      setSaving]      = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError,   setSaveError]   = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Sync form fields if user object loads asynchronously
  useEffect(() => {
    if (user) {
      setForm({ username: user.username || "", jlptGoal: user.jlptGoal || "N5" });
    }
  }, [user]);

  // Avatar helpers
  const avatarSrc = user?.avatar
    ? user.avatar.startsWith("http") ? user.avatar : `${SERVER_BASE}${user.avatar}`
    : null;

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await uploadAvatarApi(fd);
      updateUser({ avatar: res.data.avatar });
    } catch (err) {
      setUploadError(err?.response?.data?.message || "Không thể tải ảnh lên");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Profile save
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await updateProfileApi({
        username: form.username,
        jlptGoal: form.jlptGoal,
      });
      updateUser(res.data.user);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-sm">

      {/* Avatar */}
      <div className="flex items-center gap-5">
        {/* Clickable avatar with camera overlay */}
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={handleAvatarClick}
          title="Đổi ảnh đại diện"
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-600 text-3xl font-bold flex items-center justify-center select-none">
              {user?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* User info */}
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{user?.username}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploading}
            className="text-xs text-indigo-500 hover:underline mt-1 disabled:opacity-50"
          >
            {uploading ? "Đang tải lên..." : "Đổi ảnh đại diện"}
          </button>
          {uploadError && (
            <p className="text-xs text-red-500 mt-1">{uploadError}</p>
          )}
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Tên hiển thị
        </label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Nhập tên hiển thị..."
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={user?.email || ""}
          readOnly
          className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
      </div>

      {/* JLPT goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Cấp độ JLPT mục tiêu
        </label>
        <select
          value={form.jlptGoal}
          onChange={(e) => setForm({ ...form, jlptGoal: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {["N5", "N4", "N3", "N2", "N1"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <button
        type="submit"
        disabled={saving}
        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
          saveSuccess
            ? "bg-green-500 text-white"
            : "bg-indigo-500 hover:bg-indigo-600 text-white"
        }`}
      >
        {saving ? "Đang lưu..." : saveSuccess ? "✓ Đã lưu!" : "Lưu thay đổi"}
      </button>
    </form>
  );
}

function LearningTab() {
  const { settings, updateSetting } = useSettings();

  const items = [
    {
      key: "showRomaji",
      label: "Hiển thị Romaji",
      desc: "Phiên âm La-tinh bên dưới từ (không áp dụng cho Sổ tay)",
    },
    {
      key: "showFurigana",
      label: "Hiển thị Furigana",
      desc: "Hiragana nhỏ phía trên chữ Kanji (không áp dụng cho Sổ tay)",
    },
    {
      key: "darkMode",
      label: "Chế độ tối",
      desc: "Giao diện màu tối (Dark Mode)",
    },
  ];

  return (
    <div className="space-y-2 max-w-sm">
      {items.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-500 transition">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{desc}</p>
          </div>
          <Toggle checked={settings[key]} onChange={(v) => updateSetting(key, v)} />
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const TABS = [{ key: "profile", label: "Hồ sơ" }, { key: "learning", label: "Tùy chọn học" }];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Cài đặt</h1>

      <div className="flex gap-8">
        {/* Vertical tabs */}
        <nav className="shrink-0 w-40 space-y-0.5">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${tab === key ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"}`}>
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === "profile"   && <ProfileTab />}
          {tab === "learning"  && <LearningTab />}
        </div>
      </div>
    </div>
  );
}
