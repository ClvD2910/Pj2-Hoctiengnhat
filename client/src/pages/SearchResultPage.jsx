import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchWords } from "../services/wordService";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import WordCard from "../components/WordCard";

export default function SearchResultPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const { user, logoutUser } = useAuth();

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

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-indigo-600 shrink-0">
            Mazii Clone
          </Link>
          <div className="flex-1">
            <SearchBar initialQuery={query} />
          </div>
          <nav className="flex items-center gap-3 shrink-0">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.username}
                </span>
                <button
                  onClick={logoutUser}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Query info */}
        {query && !loading && pagination && (
          <p className="text-sm text-gray-500 mb-4">
            Tìm thấy <strong>{pagination.total}</strong> kết quả cho "
            <strong>{query}</strong>"
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {/* No results */}
        {!loading && !error && results.length === 0 && query && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              Không tìm thấy kết quả cho "{query}"
            </p>
            <p className="text-gray-300 text-sm mt-1">
              Hãy thử từ khóa khác bằng Kanji, Hiragana hoặc tiếng Việt
            </p>
          </div>
        )}

        {/* Word list */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((word) => (
              <WordCard key={word._id} word={word} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            <span className="text-sm text-gray-500">
              Trang {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
