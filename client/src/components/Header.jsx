import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GREETINGS = [
  "Chào mừng trở lại",
  "Xin chào",
  "Học tốt nhé",
];
import { SERVER_BASE } from "../services/api";
import SearchDropdown from "./SearchDropdown";

// Reusable avatar circle — shows image if available, else colored initial
function AvatarCircle({ user, size = "w-9 h-9", textSize = "text-sm" }) {
  const src = user?.avatar
    ? (user.avatar.startsWith("http") ? user.avatar : `${SERVER_BASE}${user.avatar}`)
    : null;

  if (src) {
    return (
      <img
        src={src}
        alt={user?.username || "avatar"}
        className={`${size} rounded-xl object-cover border border-gray-100`}
      />
    );
  }
  return (
    <div className={`${size} rounded-xl bg-indigo-100 text-indigo-700 font-bold ${textSize} flex items-center justify-center select-none`}>
      {user?.username?.[0]?.toUpperCase() || "U"}
    </div>
  );
}

export default function Header() {
  const { user, logoutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-6 gap-4 shrink-0">
      {/* Search bar */}
      <SearchDropdown
        size="sm"
        placeholder="Nhập Kanji, Hiragana hoặc tiếng Việt..."
        wrapperClassName="flex-1 max-w-xl mx-auto"
        inputClassName="w-full pl-4 pr-20 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 transition"
      />

      {/* Greeting + Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {user && (
          <span className="hidden md:block text-sm text-gray-500 dark:text-gray-400">
            {greeting},{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user.username}</span>!
          </span>
        )}

        {user ? (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="hover:ring-2 hover:ring-indigo-300 rounded-xl transition"
            >
              <AvatarCircle user={user} />
            </button>

            {open && (
              <div className="absolute right-0 top-11 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl w-52 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <AvatarCircle user={user} size="w-10 h-10" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.username}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { navigate("/settings"); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Cài đặt
                  </button>
                  <button
                    onClick={() => { logoutUser(); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="text-sm px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
