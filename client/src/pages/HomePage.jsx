import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDailyWords } from "../services/wordService";
import { getDailyKanji } from "../services/kanjiService";
import WordCard from "../components/WordCard";
import KanjiCard from "../components/KanjiCard";
import SearchDropdown from "../components/SearchDropdown";

const SEARCH_GUIDE = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    ),
    title: "Tra bằng Kanji",
    desc: "Nhập trực tiếp chữ Hán để tìm từ chứa kanji đó.",
    examples: ["食", "学校", "日本語"],
    color: "indigo",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
      </svg>
    ),
    title: "Tra bằng Kana",
    desc: "Nhập Hiragana hoặc Katakana để tìm từ theo cách đọc.",
    examples: ["たべる", "がっこう", "コーヒー"],
    color: "blue",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
      </svg>
    ),
    title: "Tra bằng tiếng Việt",
    desc: "Nhập nghĩa tiếng Việt để tìm từ Nhật tương ứng.",
    examples: ["ăn", "trường học", "cà phê"],
    color: "violet",
  },
];

const COLOR_MAP = {
  indigo: { bg: "bg-indigo-50",  icon: "bg-indigo-100 text-indigo-600",  badge: "bg-indigo-100 text-indigo-600",  title: "text-indigo-700" },
  blue:   { bg: "bg-blue-50",    icon: "bg-blue-100 text-blue-600",       badge: "bg-blue-100 text-blue-600",       title: "text-blue-700"   },
  violet: { bg: "bg-violet-50",  icon: "bg-violet-100 text-violet-600",   badge: "bg-violet-100 text-violet-600",   title: "text-violet-700" },
  amber:  { bg: "bg-amber-50",   icon: "bg-amber-100 text-amber-600",     badge: "bg-amber-100 text-amber-600",     title: "text-amber-700"  },
  emerald:{ bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", badge: "bg-emerald-100 text-emerald-600", title: "text-emerald-700"},
  rose:   { bg: "bg-rose-50",    icon: "bg-rose-100 text-rose-600",       badge: "bg-rose-100 text-rose-600",       title: "text-rose-700"   },
};

export default function HomePage() {
  const navigate = useNavigate();

  const [dailyWords, setDailyWords]   = useState([]);
  const [dailyKanji, setDailyKanji]   = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    getDailyKanji(6)
      .then((r) => setDailyKanji(r.data || []))
      .catch(() => {});
    getDailyWords(6)
      .then((r) => setDailyWords((r.data.results || []).slice(0, 6)))
      .catch(() => {});
    // Load search history from localStorage (same key as SearchDropdown)
    try {
      const hist = JSON.parse(localStorage.getItem("jisho_search_history") || "[]");
      setSearchHistory(hist.slice(0, 10));
    } catch {
      setSearchHistory([]);
    }
  }, []);

  return (
    <div className="pb-24 md:pb-8">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-6 py-10 md:py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 leading-tight">Từ điển Nhật–Việt</h1>
          <p className="text-indigo-200 mb-8 text-base">Tra cứu nhanh Kanji, Hiragana hoặc nghĩa tiếng Việt</p>

          <div className="max-w-lg mx-auto">
            <SearchDropdown
              size="lg"
              placeholder="食べる / たべる / ăn..."
              wrapperClassName="w-full"
              inputClassName="w-full pl-5 pr-20 py-3 text-gray-800 text-sm rounded-2xl shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 bg-white border-0 transition"
            />
          </div>

          {/* Search history chips */}
          {searchHistory.length > 0 && (
            <div className="max-w-lg mx-auto mt-4 flex flex-wrap gap-2 justify-center">
              {searchHistory.map((h) => (
                <button
                  key={h}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(h)}`)}
                  className="px-3 py-1.5 text-sm text-indigo-100 bg-white/15 hover:bg-white/25 rounded-xl border border-white/20 transition"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search guide */}
      <div className="max-w-5xl mx-auto px-6 mt-10">


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEARCH_GUIDE.map((item) => {
            const c = COLOR_MAP[item.color];
            return (
              <div
                key={item.title}
                className={`${c.bg} rounded-2xl p-5 border border-white/60 hover:shadow-sm transition`}
              >
                {/* Icon + title */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${c.icon}`}>
                    {item.icon}
                  </span>
                  <h3 className={`font-bold text-sm ${c.title}`}>{item.title}</h3>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>

                {/* Example chips */}
                {item.examples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(ex)}`)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition hover:opacity-80 active:scale-95 ${c.badge}`}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hán tự hôm nay */}
      {dailyKanji.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Hán tự hôm nay</h2>
            <button onClick={() => navigate("/search?q=日")} className="text-sm text-indigo-500 hover:underline">Khám phá thêm →</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dailyKanji.map((k) => (
              <KanjiCard key={k._id} kanji={k} />
            ))}
          </div>
        </div>
      )}

      {/* Từ vựng hôm nay */}
      {dailyWords.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Từ vựng hôm nay</h2>
            <button onClick={() => navigate("/practice")} className="text-sm text-indigo-500 hover:underline">Luyện tập →</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailyWords.map((word) => (
              <WordCard key={word._id} word={word} variant="compact" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

