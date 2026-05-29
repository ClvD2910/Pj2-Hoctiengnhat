import { useNavigate } from "react-router-dom";
export default function KanjiCard({ kanji }) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/kanji/${kanji.kanji}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/kanji/${kanji.kanji}`)}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all duration-200 select-none"
    >
      {/* Kanji glyph + stroke count */}
      <div className="shrink-0 flex flex-col items-center w-10">
        <span className="text-2xl font-bold text-indigo-500 leading-none">
          {kanji.kanji}
        </span>
        {kanji.stroke_count > 0 && (
          <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
            {kanji.stroke_count} nét
          </span>
        )}
      </div>

      {/* Vertical divider */}
      <div className="w-px self-stretch bg-gray-100 shrink-0" />

      {/* Readings + meaning */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {/* On / Kun row */}
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
        {/* Vietnamese meaning */}
        {kanji.mean && (
          <p className="text-sm font-semibold text-gray-700 truncate">
            {kanji.mean}
          </p>
        )}
      </div>

      {/* Level badge */}
      {kanji.level > 0 && (
        <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
          N{kanji.level}
        </span>
      )}

      {/* Chevron */}
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
