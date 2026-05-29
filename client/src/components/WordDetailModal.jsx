import { useState, useEffect, useCallback, useRef } from "react";
import WordCard from "./WordCard";
import CommentSection from "./CommentSection";
import { searchWords } from "../services/wordService";
import { analyzeKanji, getKanjiByChar } from "../services/kanjiService";

const KANJI_RE = /[\u4e00-\u9fff]/g;
const JP_FONT =
  "'Noto Sans JP', 'Noto Serif JP', 'Yu Gothic', 'Hiragino Kaku Gothic Pro', sans-serif";


// Utilities

function safeParse(str, fallback = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function splitReadings(str) {
  return str
    ? str
        .split(/[、,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function extractKanji(str) {
  return [...new Set((str || "").match(KANJI_RE) || [])];
}


// Inline KanjiCard

function ModalKanjiCard({ kanji, onKanjiClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onKanjiClick(kanji.kanji)}
      onKeyDown={(e) => e.key === "Enter" && onKanjiClick(kanji.kanji)}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all duration-200 select-none"
    >
      {/* Glyph + stroke count */}
      <div className="shrink-0 flex flex-col items-center w-10">
        <span
          style={{ fontFamily: JP_FONT }}
          className="text-2xl font-bold text-indigo-500 leading-none"
        >
          {kanji.kanji}
        </span>
        {kanji.stroke_count > 0 && (
          <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
            {kanji.stroke_count} nét
          </span>
        )}
      </div>

      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Readings + meaning */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-3 flex-wrap">
          {kanji.on && (
            <span className="flex items-center gap-1 text-xs">
              <span className="font-bold text-orange-400 tracking-wide">On</span>
              <span className="text-gray-600">{kanji.on}</span>
            </span>
          )}
          {kanji.kun && (
            <span className="flex items-center gap-1 text-xs">
              <span className="font-bold text-blue-400 tracking-wide">Kun</span>
              <span className="text-gray-600">{kanji.kun}</span>
            </span>
          )}
        </div>
        {kanji.mean && (
          <p className="text-sm font-semibold text-gray-700 truncate">
            {kanji.mean}
          </p>
        )}
      </div>

      {kanji.level > 0 && (
        <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
          N{kanji.level}
        </span>
      )}

      <svg
        className="w-4 h-4 text-gray-300 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

 // StrokeBox — stroke-order animation

 const STROKE_COLORS = [
  "#4338ca", "#7c3aed", "#db2777", "#ea580c", "#d97706",
  "#65a30d", "#16a34a", "#0891b2", "#2563eb", "#9333ea",
  "#c026d3", "#e11d48", "#dc2626", "#f59e0b", "#84cc16",
  "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function StrokeBox({ img, strokeCount }) {
  const containerRef = useRef(null);
  const timeoutIds   = useRef([]);
  const rafIds       = useRef([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Inject SVG imperatively so React re-renders never reset the DOM content
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = img
      ? img
          .replace(/width="[^"]*"/,  'width="100%"')
          .replace(/height="[^"]*"/, 'height="100%"')
      : "";
  }, [img]);

  const clearAll = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    rafIds.current.forEach(cancelAnimationFrame);
    rafIds.current = [];
  };

  const animate = useCallback(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const paths = Array.from(svg.querySelectorAll("path")).filter((p) =>
      p.hasAttribute("d")
    );
    if (paths.length === 0) return;

    const texts = Array.from(
      svg.querySelector('[id^="kvg:StrokeNumbers_"]')?.querySelectorAll("text") ?? []
    );

    clearAll();
    setIsPlaying(true);

    const STEP_MS = 600;
    const shuffled = [...STROKE_COLORS].sort(() => Math.random() - 0.5);

    const data = paths.map((p, i) => ({
      el:    p,
      len:   p.getTotalLength(),
      color: shuffled[i % shuffled.length],
    }));

    // Hide all paths and set per-stroke colour
    // CSS inline style for stroke → overrides inherited group CSS stroke:#000
    // SVG presentation attributes for dash pattern → no CSS cascade conflict
    data.forEach(({ el, len, color }) => {
      el.style.fill  = "none";
      el.style.stroke = color;
      el.setAttribute("stroke-width",      "3");
      el.setAttribute("stroke-linecap",    "round");
      el.setAttribute("stroke-linejoin",   "round");
      el.setAttribute("stroke-dasharray",  `${len} ${len}`);
      el.setAttribute("stroke-dashoffset", `${len}`);
    });
    texts.forEach((t) => { t.style.opacity = "0"; });

    const ease = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // One rAF loop per stroke, staggered by STEP_MS
    data.forEach(({ el, len }, i) => {
      if (len === 0) {
        if (texts[i]) texts[i].style.opacity = "1";
        return;
      }
      const tid = setTimeout(() => {
        const start = performance.now();
        const frame = (now) => {
          const progress = Math.min((now - start) / STEP_MS, 1);
          el.setAttribute("stroke-dashoffset", `${len * (1 - ease(progress))}`);
          if (progress < 1) {
            rafIds.current.push(requestAnimationFrame(frame));
          } else {
            if (texts[i]) {
              texts[i].style.transition = "opacity 0.3s";
              texts[i].style.opacity    = "1";
            }
          }
        };
        rafIds.current.push(requestAnimationFrame(frame));
      }, i * STEP_MS);
      timeoutIds.current.push(tid);
    });

    const doneId = setTimeout(
      () => setIsPlaying(false),
      data.length * STEP_MS + 400
    );
    timeoutIds.current.push(doneId);
  }, []);

  useEffect(() => {
    if (!img) return;
    const t = setTimeout(animate, 200);
    return () => {
      clearTimeout(t);
      clearAll();
    };
  }, [img, animate]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Thứ tự nét
        </p>
        <button
          onClick={animate}
          disabled={isPlaying}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
            isPlaying
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-indigo-50 text-indigo-500 hover:bg-indigo-100 active:scale-95"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Phát lại
        </button>
      </div>
      <div className="relative rounded-xl bg-gray-50 overflow-hidden aspect-square">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <rect
            x="0.5" y="0.5" width="99%" height="99%"
            fill="none" stroke="#e5e7eb" strokeWidth="1" rx="10"
          />
          <line
            x1="50%" y1="4%" x2="50%" y2="96%"
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4"
          />
          <line
            x1="4%" y1="50%" x2="96%" y2="50%"
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4"
          />
        </svg>
        {/* SVG content injected imperatively via useEffect */}
        <div ref={containerRef} className="w-full h-full p-4" />
      </div>
      {strokeCount > 0 && (
        <p className="mt-2 text-center text-xs text-gray-400">
          <span className="font-bold text-gray-600">{strokeCount}</span> nét
        </p>
      )}
    </div>
  );
}


// KanjiDetailPanel

function KanjiDetailPanel({ char, onWordClick, onKanjiClick }) {
  const [loading, setLoading] = useState(true);
  const [kanji, setKanji] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!char) return;
    setLoading(true);
    setError("");
    setKanji(null);
    getKanjiByChar(char)
      .then((res) => setKanji(res.data))
      .catch(() => setError("Không tìm thấy thông tin cho Hán tự này."))
      .finally(() => setLoading(false));
  }, [char]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !kanji) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p
          style={{ fontFamily: JP_FONT }}
          className="text-6xl text-gray-300 mb-3"
        >
          {char}
        </p>
        <p className="font-medium">{error || "Không tìm thấy dữ liệu."}</p>
      </div>
    );
  }

  const components = safeParse(kanji.compDetail, []);
  const examples = safeParse(kanji.examples, []);
  const kunReadings = splitReadings(kanji.kun);
  const onReadings = splitReadings(kanji.on);

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5 items-start">
      {/* LEFT COLUMN */}
      <div className="space-y-4 min-w-0">

        {/* Hero */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-start gap-4 flex-wrap">
            <span
              style={{ fontFamily: JP_FONT, lineHeight: 1 }}
              className="text-[80px] font-black text-gray-900 shrink-0 select-all"
            >
              {kanji.kanji}
            </span>
            <div className="flex-1 min-w-0 pt-2 space-y-2">
              <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide leading-tight">
                {kanji.mean}
              </h2>
              {/* Stat badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {kanji.level > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
                    JLPT N{kanji.level}
                  </span>
                )}
                {kanji.stroke_count > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                    {kanji.stroke_count} nét
                  </span>
                )}
                {kanji.freq > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                    Tần suất #{kanji.freq}
                  </span>
                )}
              </div>
              {/* Compact readings */}
              {(kunReadings.length > 0 || onReadings.length > 0) && (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  {kunReadings.length > 0 && (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="shrink-0 text-[10px] font-extrabold text-gray-500 uppercase tracking-wide">· Kun</span>
                      <div className="flex gap-x-3 gap-y-1 flex-wrap">
                        {kunReadings.map((r) => (
                          <span key={r} style={{ fontFamily: JP_FONT }} className="text-sm font-bold text-blue-600">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onReadings.length > 0 && (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="shrink-0 text-[10px] font-extrabold text-gray-500 uppercase tracking-wide">· On</span>
                      <div className="flex gap-x-3 gap-y-1 flex-wrap">
                        {onReadings.map((r) => (
                          <span key={r} style={{ fontFamily: JP_FONT }} className="text-sm font-bold text-orange-500">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bộ thủ cấu thành */}
        {components.length > 0 && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Bộ thủ cấu thành
            </p>
            <div className="space-y-2">
              {components.map((comp, i) => (
                <div
                  key={i}
                  onClick={() => onKanjiClick(comp.w)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer transition-all group"
                >
                  <span
                    style={{ fontFamily: JP_FONT }}
                    className="text-2xl font-bold text-indigo-500 w-9 text-center shrink-0 group-hover:scale-110 transition-transform"
                  >
                    {comp.w}
                  </span>
                  <div className="w-px h-6 bg-gray-200 shrink-0" />
                  <span className="text-sm font-bold text-amber-500 tracking-widest flex-1">
                    {comp.h}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-200 group-hover:text-indigo-300 transition shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Giải thích */}
        {kanji.detail && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Giải thích
            </p>
            <ul className="space-y-2">
              {kanji.detail.split("##").map((pt, i) => {
                const text = pt.trim();
                return text ? (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                    <span className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{text}</span>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        )}
        <CommentSection targetType="kanji" targetId={kanji.kanji} />
      </div>

      {/* RIGHT COLUMN: Stroke order + Từ ví dụ */}
      <div className="space-y-4 md:sticky md:top-0">
        {kanji.img && (
          <StrokeBox key={kanji.kanji} img={kanji.img} strokeCount={kanji.stroke_count} />
        )}

        {/* Từ ví dụ */}
        {examples.length > 0 && (
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Từ ví dụ
            </p>
            <div className="divide-y divide-gray-50">
              {examples.slice(0, 8).map((ex, i) => (
                <div
                  key={i}
                  onClick={() => onWordClick(ex.w)}
                  className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 rounded-xl -mx-1 px-1 transition group"
                >
                  <div className="shrink-0 min-w-0">
                    <p style={{ fontFamily: JP_FONT }} className="text-sm font-bold text-blue-500 leading-tight">
                      {ex.w}
                    </p>
                    {ex.p && <p className="text-xs text-indigo-400 mt-0.5 truncate">{ex.p.trim()}</p>}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs text-gray-600 line-clamp-2 leading-snug">{ex.m}</p>
                    {ex.h && <p className="text-xs text-amber-500 font-semibold mt-0.5">{ex.h}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
function WordSearchPanel({ query, onWordClick, onKanjiClick }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [exactMatch, setExactMatch] = useState(null);
  const [otherResults, setOtherResults] = useState([]);
  const [kanjiDetails, setKanjiDetails] = useState([]);

  // Fetch search results
  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setResults([]);
    setExactMatch(null);
    setOtherResults([]);
    searchWords(query)
      .then((res) => {
        const all = res.data.results || [];
        setResults(all);
        const idx = all.findIndex(
          (w) => w.reading === query || w.kanji === query
        );
        if (idx !== -1) {
          setExactMatch(all[idx]);
          setOtherResults(all.filter((_, i) => i !== idx));
        } else {
          setExactMatch(null);
          setOtherResults(all);
        }
      })
      .catch(() => {
        setResults([]);
        setExactMatch(null);
        setOtherResults([]);
      })
      .finally(() => setLoading(false));
  }, [query]);

  // Fetch kanji analysis for exact match
  useEffect(() => {
    const src = exactMatch?.kanji || "";
    const chars = src.match(KANJI_RE);
    if (!chars || chars.length === 0) {
      setKanjiDetails([]);
      return;
    }
    let cancelled = false;
    analyzeKanji(src)
      .then((res) => {
        if (!cancelled) setKanjiDetails(res.data);
      })
      .catch(() => {
        if (!cancelled) setKanjiDetails([]);
      });
    return () => {
      cancelled = true;
    };
  }, [exactMatch]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-2">🔍</p>
        <p className="font-medium">Không tìm thấy kết quả cho "{query}"</p>
        <p className="text-sm mt-1 text-gray-300">
          Thử tìm bằng Kanji, Hiragana hoặc tiếng Việt
        </p>
      </div>
    );
  }

  // Exact match found → 2-column layout
  if (exactMatch) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-4 min-w-0">
          <WordCard word={exactMatch} variant="large" />

          {kanjiDetails.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest px-1">
                Phân tích Hán tự
              </p>
              {kanjiDetails.map((k) => (
                <ModalKanjiCard key={k.kanji} kanji={k} onKanjiClick={onKanjiClick} />
              ))}
            </div>
          )}

          <CommentSection targetType="word" targetId={String(exactMatch._id)} />
        </div>

        {/* RIGHT COLUMN: Related words */}
        {otherResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm text-gray-400">
                Các từ liên quan tới{" "}
                <span className="font-bold text-gray-700">{query}</span>
              </p>
            </div>
            {otherResults.slice(0, 12).map((word) => (
              <button
                key={word._id}
                onClick={() => onWordClick(word.kanji || word.reading)}
                className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-indigo-50/40 transition-colors group"
              >
                <p className="text-base font-bold text-blue-500 leading-tight group-hover:text-indigo-600 transition-colors">
                  {word.kanji || word.reading}
                </p>
                {word.kanji && (
                  <p className="text-xs text-gray-400 mt-0.5">{word.reading}</p>
                )}
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2 leading-snug">
                  {(word.meanings || []).slice(0, 2).join("; ")}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // No exact match → simple list
  return (
    <div className="space-y-3">
      {results.slice(0, 10).map((word) => (
        <button
          key={word._id}
          onClick={() => onWordClick(word.kanji || word.reading)}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-indigo-200 hover:shadow-sm transition"
        >
          <p className="text-base font-bold text-blue-500">
            {word.kanji || word.reading}
          </p>
          {word.kanji && (
            <p className="text-xs text-gray-400 mt-0.5">{word.reading}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {(word.meanings || []).slice(0, 2).join("; ")}
          </p>
        </button>
      ))}
    </div>
  );
}


// WordDetailModal — main export

export default function WordDetailModal({ initialQuery, onClose }) {
  const [tab, setTab] = useState("word");
  const [query, setQuery] = useState(initialQuery);
  const [navHistory, setNavHistory] = useState([]);

  // Currently selected kanji char (for kanji tab chips)
  const [selectedKanjiChar, setSelectedKanjiChar] = useState(() => {
    const chars = extractKanji(initialQuery);
    return chars[0] || null;
  });

  // Recompute selectedKanjiChar when query changes
  const kanjiChars = extractKanji(query);

  // Internal navigation helpers
  const navigateToWord = (term) => {
    setNavHistory((prev) => [
      ...prev,
      { tab, query, selectedKanjiChar },
    ]);
    setQuery(term);
    setTab("word");
  };

  const navigateToKanji = (char) => {
    setNavHistory((prev) => [
      ...prev,
      { tab, query, selectedKanjiChar },
    ]);
    setSelectedKanjiChar(char);
    setTab("kanji");
  };

  const goBack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    setNavHistory((h) => h.slice(0, -1));
    setQuery(prev.query);
    setTab(prev.tab);
    setSelectedKanjiChar(prev.selectedKanjiChar);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    // When switching to kanji tab, ensure a char is selected
    if (newTab === "kanji" && !selectedKanjiChar) {
      const chars = extractKanji(query);
      setSelectedKanjiChar(chars[0] || null);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden sm:mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {navHistory.length > 0 && (
              <button
                onClick={goBack}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
                title="Quay lại"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <span
              style={{ fontFamily: JP_FONT }}
              className="text-lg font-bold text-gray-900 truncate"
            >
              {query}
            </span>
            {navHistory.length > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                ({navHistory.length} trang trước)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0 ml-2"
            title="Đóng"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-gray-100 px-5 shrink-0">
          <button
            onClick={() => handleTabChange("word")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === "word"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Từ vựng
          </button>
          <button
            onClick={() => handleTabChange("kanji")}
            disabled={kanjiChars.length === 0}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === "kanji"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Hán tự
            {kanjiChars.length > 0 && (
              <span className="ml-1.5 text-xs font-bold bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full">
                {kanjiChars.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "word" && (
            <WordSearchPanel
              key={query}
              query={query}
              onWordClick={navigateToWord}
              onKanjiClick={navigateToKanji}
            />
          )}

          {tab === "kanji" && (
            <div className="space-y-4">
              {/* Kanji character selector chips (when word has multiple kanji) */}
              {kanjiChars.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {kanjiChars.map((char) => (
                    <button
                      key={char}
                      onClick={() => setSelectedKanjiChar(char)}
                      style={{ fontFamily: JP_FONT }}
                      className={`w-11 h-11 flex items-center justify-center rounded-xl text-xl font-bold border transition-all ${
                        selectedKanjiChar === char
                          ? "bg-indigo-500 text-white border-indigo-500 shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              )}

              {selectedKanjiChar ? (
                <KanjiDetailPanel
                  key={selectedKanjiChar}
                  char={selectedKanjiChar}
                  onWordClick={navigateToWord}
                  onKanjiClick={(char) => {
                    if (kanjiChars.includes(char)) {
                      setSelectedKanjiChar(char);
                    } else {
                      navigateToKanji(char);
                    }
                  }}
                />
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p
                    style={{ fontFamily: JP_FONT }}
                    className="text-5xl text-gray-200 mb-3"
                  >
                    漢
                  </p>
                  <p>Không có Hán tự trong từ này</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
