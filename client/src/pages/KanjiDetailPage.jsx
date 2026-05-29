import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getKanjiByChar } from "../services/kanjiService";
import CommentSection from "../components/CommentSection";

// Utilities

/** Safely parse a JSON-stringified field; returns fallback on error. */
function safeParse(str, fallback = []) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Split a reading string*/
function splitReadings(str) {
  return str ? str.split(/[、,]+/).map((s) => s.trim()).filter(Boolean) : [];
}

// Japanese font stack — falls back to common CJK system fonts
const JP_FONT = "'Noto Sans JP', 'Noto Serif JP', 'Yu Gothic', 'Hiragino Kaku Gothic Pro', sans-serif";

// color palette for stroke-order animation
const STROKE_COLORS = [
  "#292270", "#7c3aed", "#8b2d56", "#534943", "#4e2d09",
  "#3c5e0c", "#16a34a", "#0891b2", "#2563eb", "#010002",
  "#71167d", "#901530", "#7a1414", "#79510d", "#416609",
  "#128d64", "#06b6d4", "#3b82f6", "#291261", "#630434",
];

// Sub-components

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function ReadingChip({ text, type }) {
  const cls =
    type === "kun"
      ? "bg-blue-50 text-blue-600 border-blue-100"
      : "bg-orange-50 text-orange-600 border-orange-100";
  return (
    <span
      style={{ fontFamily: JP_FONT }}
      className={`inline-block px-3 py-1.5 rounded-xl text-sm font-bold border ${cls}`}
    >
      {text}
    </span>
  );
}

function StatCard({ label, value, colorClass }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm text-center flex flex-col items-center gap-1">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-2xl font-extrabold ${colorClass}`}>{value ?? "—"}</span>
    </div>
  );
}

/**
 * Stroke-order animator for KanjiVG SVG data.
 */
function StrokeBox({ img, strokeCount }) {
  const containerRef = useRef(null);
  const timeoutIds   = useRef([]);
  const rafIds       = useRef([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Inject SVG imperatively so React re-renders never reset it
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = img
      ? img
          .replace(/width="[^"]*"/,  'width="100%"')
          .replace(/height="[^"]*"/, 'height="100%"')
      : "";
  }, [img]);

  /** Cancel all pending timers and animation frames. */
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

    const STEP_MS = 600; // ms per stroke

    // Shuffle palette so adjacent strokes always look distinct
    const shuffled = [...STROKE_COLORS].sort(() => Math.random() - 0.5);

    // Pre-compute lengths + colours
    const data = paths.map((p, i) => ({
      el:    p,
      len:   p.getTotalLength(),
      color: shuffled[i % shuffled.length],
    }));

    // Hide every path and set its colour
    // Use CSS inline style for stroke (overrides inherited group CSS stroke).
    // Use SVG presentation attributes for dash pattern (no CSS cascade conflict).
    data.forEach(({ el, len, color }) => {
      el.style.fill   = "none";
      el.style.stroke = color;
      el.setAttribute("stroke-width",      "3");
      el.setAttribute("stroke-linecap",    "round");
      el.setAttribute("stroke-linejoin",   "round");
      el.setAttribute("stroke-dasharray",  `${len} ${len}`);
      el.setAttribute("stroke-dashoffset", `${len}`);
    });
    texts.forEach((t) => { t.style.opacity = "0"; });

    // Ease-in-out
    const ease = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Launch one rAF loop per stroke, staggered by STEP_MS
    data.forEach(({ el, len }, i) => {
      if (len === 0) {
        if (texts[i]) texts[i].style.opacity = "1";
        return;
      }

      const tid = setTimeout(() => {
        const start = performance.now();
        const frame = (now) => {
          const progress = Math.min((now - start) / STEP_MS, 1);
          // setAttribute is the correct way to drive SVG presentation attributes
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

    // Mark done after the last stroke finishes
    const doneId = setTimeout(
      () => setIsPlaying(false),
      data.length * STEP_MS + 400
    );
    timeoutIds.current.push(doneId);
  }, []);

  // Auto-play when kanji changes (key={kanji.kanji} on StrokeBox triggers remount)
  useEffect(() => {
    if (!img) return;
    // 200 ms lets the innerHTML effect flush before we query the SVG
    const t = setTimeout(animate, 200);
    return () => {
      clearTimeout(t);
      clearAll();
    };
  }, [img, animate]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      {/* Header */}
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

      {/* Canvas with practice-paper grid */}
      <div className="relative rounded-xl bg-gray-50 overflow-hidden aspect-square">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="99%" height="99%" fill="none" stroke="#e5e7eb" strokeWidth="1" rx="10" />
          <line x1="50%" y1="4%" x2="50%" y2="96%" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="4%"  y1="50%" x2="96%" y2="50%" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
        {/* SVG content is injected imperatively via useEffect — not controlled by React */}
        <div ref={containerRef} className="w-full h-full p-5" />
      </div>

      {/* Footer: stroke count */}
      {strokeCount > 0 && (
        <p className="mt-3 text-center text-xs text-gray-400">
          <span className="font-bold text-gray-600">{strokeCount}</span> nét
        </p>
      )}
    </div>
  );
}

/** Scrollable chip grid of recently viewed kanji (from localStorage). */
function RecentKanjiWidget({ currentChar }) {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recentKanji") || "[]");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(stored.filter((c) => c !== currentChar).slice(0, 8));
  }, [currentChar]);

  if (recent.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Vừa xem
      </p>
      <div className="flex flex-wrap gap-2">
        {recent.map((c) => (
          <button
            key={c}
            style={{ fontFamily: JP_FONT }}
            onClick={() => navigate(`/kanji/${encodeURIComponent(c)}`)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-lg font-bold text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 transition-all"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main page

export default function KanjiDetailPage() {
  const { char } = useParams();
  const navigate = useNavigate();
  const [kanji, setKanji] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch
  useEffect(() => {
    if (!char) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setKanji(null);
    getKanjiByChar(char)
      .then((res) => setKanji(res.data))
      .catch(() => setError("Không tìm thấy thông tin cho Hán tự này."))
      .finally(() => setLoading(false));
  }, [char]);

  // Persist to recently-viewed list
  useEffect(() => {
    if (!char) return;
    const stored = JSON.parse(localStorage.getItem("recentKanji") || "[]");
    const updated = [char, ...stored.filter((c) => c !== char)].slice(0, 9);
    localStorage.setItem("recentKanji", JSON.stringify(updated));
  }, [char]);

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not found / error
  if (error || !kanji) {
    return (
      <div className="text-center py-40">
        {char && (
          <p style={{ fontFamily: JP_FONT }} className="text-7xl text-gray-300 mb-4">
            {char}
          </p>
        )}
        <p className="text-gray-500 font-medium">
          {error || "Không tìm thấy dữ liệu."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-5 flex items-center gap-1 mx-auto text-indigo-500 text-sm font-semibold hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // Parse fields
  const components  = safeParse(kanji.compDetail, []);
  const examples    = safeParse(kanji.examples,   []);
  const kunReadings = splitReadings(kanji.kun);
  const onReadings  = splitReadings(kanji.on);

  // Render
  return (
    <div className="p-4 md:p-6 pb-24 md:pb-10 max-w-6xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">

        {/* LEFT COLUMN */}
        <div className="space-y-5">

          {/* Hero card */}
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex items-start gap-5 flex-wrap">

              {/* Giant kanji glyph */}
              <span
                style={{ fontFamily: JP_FONT, lineHeight: 1 }}
                className="text-[96px] font-black text-gray-900 shrink-0 select-all"
              >
                {kanji.kanji}
              </span>

              {/* Metadata block */}
              <div className="flex-1 min-w-0 pt-2 space-y-3">
                <h1 className="text-3xl font-extrabold text-gray-800 uppercase tracking-wide leading-tight">
                  {kanji.mean}
                </h1>

                {/* Compact stats row */}
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
                  <div className="flex flex-col gap-1.5">
                    {kunReadings.length > 0 && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="shrink-0 text-[10px] font-extrabold text-gray-600 uppercase tracking-wide"><span className="mr-1">·</span>Kun</span>
                        <div className="flex gap-x-3 gap-y-1 flex-wrap">
                          {kunReadings.map((r) => (
                            <span key={r} style={{ fontFamily: JP_FONT }} className="text-sm font-bold text-blue-600">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {onReadings.length > 0 && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="shrink-0 text-[10px] font-extrabold text-gray-600 uppercase tracking-wide"><span className="mr-1">·</span>On</span>
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
            <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
              <SectionTitle>Bộ thủ cấu thành</SectionTitle>
              <div className="space-y-2">
                {components.map((comp, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(`/kanji/${encodeURIComponent(comp.w)}`)}
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
            <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
              <SectionTitle>Giải thích</SectionTitle>
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

          {/* Bình luận */}
          <CommentSection targetType="kanji" targetId={kanji.kanji} />
        </div>
        {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN (sticky) */}
        <div className="space-y-4 md:sticky md:top-6">
          <StrokeBox key={kanji.kanji} img={kanji.img} strokeCount={kanji.stroke_count} />

          {/* Từ ví dụ */}
          {examples.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <SectionTitle>Từ ví dụ</SectionTitle>
              <div className="divide-y divide-gray-50">
                {examples.slice(0, 8).map((ex, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      navigate(`/search?q=${encodeURIComponent(ex.w)}`)
                    }
                    className="flex items-center gap-3 py-2.5 -mx-1 px-1 rounded-xl cursor-pointer hover:bg-gray-50 transition group"
                  >
                    <div className="shrink-0">
                      <p
                        style={{ fontFamily: JP_FONT }}
                        className="text-sm font-bold text-blue-500 leading-tight"
                      >
                        {ex.w}
                      </p>
                      {ex.p && (
                        <p className="text-xs text-indigo-400 mt-0.5">
                          {ex.p.trim()}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs text-gray-700 line-clamp-2 leading-snug">{ex.m}</p>
                      {ex.h && (
                        <p className="text-xs text-amber-500 font-semibold mt-0.5">
                          {ex.h}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RecentKanjiWidget currentChar={kanji.kanji} />
        </div>

      </div>
    </div>
  );
}
