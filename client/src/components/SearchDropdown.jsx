import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { suggestWords } from "../services/wordService";

const HISTORY_KEY = "jisho_search_history";
const MAX_HISTORY  = 12;
const MAX_SUGGEST  = 6;
const DEBOUNCE_MS  = 220;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function addToHistory(query) {
  const q = query.trim();
  if (!q) return;
  let list = loadHistory().filter((h) => h !== q);
  list = [q, ...list].slice(0, MAX_HISTORY);
  saveHistory(list);
}

function removeFromHistory(query) {
  const list = loadHistory().filter((h) => h !== query);
  saveHistory(list);
}

function clearHistory() {
  saveHistory([]);
}

export default function SearchDropdown({
  placeholder = "Nhập Kanji, Hiragana hoặc tiếng Việt...",
  inputClassName = "",
  wrapperClassName = "",
  size = "sm",
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery]           = useState("");
  const [focused, setFocused]       = useState(false);
  const [history, setHistory]       = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggest, setLoading] = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const debounceRef  = useRef(null);

  // Sync with URL
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  // Load history on focus
  useEffect(() => {
    if (focused) setHistory(loadHistory());
  }, [focused]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await suggestWords(q.trim(), MAX_SUGGEST);
        setSuggestions(res.data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    fetchSuggestions(val);
  };

  const doSearch = (q) => {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    addToHistory(trimmed);
    setHistory(loadHistory());
    setFocused(false);
    setSuggestions([]);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const items = query.trim() ? suggestions : history;
    const total = items.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + total) % total);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const chosen = query.trim()
        ? (suggestions[activeIdx]?.kanji || suggestions[activeIdx]?.reading)
        : history[activeIdx];
      if (chosen) { setQuery(chosen); doSearch(chosen); }
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  const showDropdown = focused && (
    (!query.trim() && history.length > 0) ||
    (query.trim().length >= 1 && (loadingSuggest || suggestions.length > 0))
  );

  const isLg = size === "lg";

  return (
    <div className={`relative ${wrapperClassName}`} ref={containerRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className={inputClassName}
          />
          {/* Clear button — shown when has text */}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); setActiveIdx(-1); inputRef.current?.focus(); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          {/* Search submit button */}
          <button
            type="submit"
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition`}
          >
            <svg className={isLg ? "w-6 h-6" : "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-gray-900 text-left rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          {/* History mode (empty query) */}
          {!query.trim() && (
            <>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lịch sử tìm kiếm</span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { clearHistory(); setHistory([]); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  Xóa tất cả
                </button>
              </div>
              {history.map((h, i) => (
                <div
                  key={h}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setQuery(h); doSearch(h); }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition group ${
                    activeIdx === i ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-4 h-4 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="text-sm text-gray-700 truncate">{h}</span>
                  </div>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(h);
                      setHistory(loadHistory());
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition ml-2 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Suggestions mode (typing) */}
          {query.trim().length >= 1 && (
            <>
              {loadingSuggest && suggestions.length === 0 && (
                <div className="flex justify-center py-4">
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"/>
                </div>
              )}
              {suggestions.map((s, i) => {
                const display = s.kanji || s.reading || "";
                const showPhonetic = s.reading && s.reading !== s.kanji;
                const meaning = s.meanings?.[0] || "";
                return (
                  <div
                    key={s._id || i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setQuery(display); doSearch(display); }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                      activeIdx === i ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">{display}</span>
                        {showPhonetic && (
                          <span className="text-xs text-indigo-400">{s.reading}</span>
                        )}
                      </div>
                      {meaning && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{meaning}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loadingSuggest && suggestions.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-400 text-center">Không tìm thấy gợi ý</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
