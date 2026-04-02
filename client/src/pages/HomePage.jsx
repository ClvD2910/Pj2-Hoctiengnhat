import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

export default function HomePage() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600">
            Mazii Clone
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">
                  Xin chào, <strong>{user.username}</strong>
                </span>
                <button
                  onClick={logoutUser}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center py-32">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Từ điển Nhật-Việt
        </h2>
        <p className="text-gray-500 mb-8">
          Tìm kiếm bằng Kanji, Hiragana hoặc tiếng Việt
        </p>
        <SearchBar />
        <div className="flex gap-3 mt-6">
          {["N5", "N4", "N3", "N2", "N1"].map((level) => (
            <Link
              key={level}
              to={`/search?q=&jlpt=${level}`}
              className="px-4 py-1.5 text-sm rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
            >
              {level}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
