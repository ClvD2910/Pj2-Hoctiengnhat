import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { searchWords } from "../services/wordService";
import { analyzeKanji } from "../services/kanjiService";
import WordCard from "../components/WordCard";
import KanjiCard from "../components/KanjiCard";
import CommentSection from "../components/CommentSection";

// Matches CJK Unified Ideographs (the standard kanji block used in Japanese)
const KANJI_RE = /[\u4e00-\u9fff]/g;

export default function SearchResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const handleWordClick = (word) =>
    navigate("/search?q=" + encodeURIComponent(word.kanji || word.reading));

  const [results, setResults]       = useState([]);
  const [pagination, setPagination]  = useState(null);
  const [loading, setLoading]        = useState(false);
  const [error, setError]            = useState("");
  const [page, setPage]              = useState(1);
  const [kanjiDetails, setKanjiDetails] = useState([]);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError("");
    searchWords(query, page)
      .then((res) => {
        setResults(res.data.results);
        setPagination(res.data.pagination);
      })
      .catch(() => setError("Có lỗi xảy ra khi tìm kiếm"))
      .finally(() => setLoading(false));
  }, [query, page]);

  useEffect(() => { setPage(1); }, [query]);

  // Split exact match 
  const { exactMatch, otherResults } = useMemo(() => {
    if (!query || results.length === 0)
      return { exactMatch: null, otherResults: results };
    const idx = results.findIndex(
      (w) => w.reading === query || w.kanji === query
    );
    if (idx === -1) return { exactMatch: null, otherResults: results };
    const others = results.filter((_, i) => i !== idx);
    return { exactMatch: results[idx], otherResults: others };
  }, [results, query]);

  const hasExact = Boolean(exactMatch);

  // Kanji analysis fires whenever the exact-match word changes
  useEffect(() => {
    const src = exactMatch?.kanji || "";
    const chars = src.match(KANJI_RE);
    if (!chars || chars.length === 0) {
      setKanjiDetails([]);
      return;
    }
    let cancelled = false;
    analyzeKanji(src)
      .then((res) => { if (!cancelled) setKanjiDetails(res.data); })
      .catch(()  => { if (!cancelled) setKanjiDetails([]); });
    return () => { cancelled = true; };
  }, [exactMatch]);

  // Pagination controls 
  function Pagination() {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex justify-center items-center gap-3 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm hover:bg-gray-100 transition disabled:opacity-30"
        >
          ← Trước
        </button>
        <span className="text-sm text-gray-500">Trang {page} / {pagination.totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          disabled={page >= pagination.totalPages}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm hover:bg-gray-100 transition disabled:opacity-30"
        >
          Sau →
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-8 max-w-6xl mx-auto">
      {/* Result count */}
      {query && !loading && pagination && (
        <p className="text-sm text-gray-400 mb-6">
          Tìm thấy{" "}
          <strong className="text-gray-700">{pagination.total}</strong>{" "}
          kết quả cho{" "}
          <strong className="text-indigo-600">"{query}"</strong>
        </p>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 rounded-2xl p-5 text-center text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* No results */}
      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-24">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 font-medium">Không tìm thấy kết quả cho "{query}"</p>
          <p className="text-gray-300 text-sm mt-1">Hãy thử từ khóa khác bằng Kanji, Hiragana hoặc tiếng Việt</p>
        </div>
      )}

      {/* No query */}
      {!loading && !query && (
        <div className="text-center py-24 text-gray-300">
          <p className="text-5xl mb-3">🗾</p>
          <p className="font-medium">Nhập từ khóa vào ô tìm kiếm phía trên</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {hasExact ? (
            /* SCENARIO 1: 2-column layout */
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* LEFT: large card + kanji breakdown + comments (~70%) */}
              <div className="w-full md:w-[70%] flex flex-col gap-4">
                <WordCard word={exactMatch} variant="large" />

                {/* Kanji analysis cards */}
                {kanjiDetails.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest px-1">
                      Phân tích Hán tự
                    </p>
                    {kanjiDetails.map((k) => (
                      <KanjiCard key={k.kanji} kanji={k} />
                    ))}
                  </div>
                )}

                <CommentSection targetType="word" targetId={String(exactMatch._id)} />
              </div>

              {/* RIGHT: sticky related results list */}
              <div className="w-full md:w-[30%] md:sticky md:top-6 md:self-start flex flex-col gap-4">
                {otherResults.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-gray-100">
                      <p className="text-sm text-gray-400">
                        Các từ liên quan tới{" "}
                        <span className="font-bold text-gray-700">{query}</span>
                      </p>
                    </div>
                    {/* Items */}
                    {otherResults.map((word) => (
                      <button
                        key={word._id}
                        onClick={() => handleWordClick(word)}
                        className="w-full text-left px-5 py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-indigo-50/40 transition-colors group"
                      >
                        <p className="text-lg font-bold text-blue-500 leading-tight group-hover:text-indigo-600 transition-colors">
                          {word.kanji || word.reading}
                        </p>
                        {word.kanji && (
                          <p className="text-xs text-gray-400 mt-0.5">{word.reading}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug">
                          {(word.meanings || []).slice(0, 2).join("; ")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <Pagination />
              </div>
            </div>
          ) : (
            /* SCENARIO 2: centered list */
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-3">
                {results.map((word) => (
                  <WordCard key={word._id} word={word} variant="small" onClick={handleWordClick} />
                ))}
              </div>
              <Pagination />
            </div>
          )}


        </>
      )}
    </div>
  );
}