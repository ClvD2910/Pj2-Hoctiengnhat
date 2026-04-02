import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function WordCard({ word }) {
  const { user } = useAuth();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddToNotebook = async () => {
    setLoading(true);
    try {
      await api.post("/notebooks/add-word", { wordId: word._id });
      setAdded(true);
    } catch {
      alert("Không thể thêm vào sổ tay. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
      {/* Kanji + Furigana */}
      <div className="flex items-end gap-3 mb-3">
        {word.kanji ? (
          <ruby className="text-4xl font-bold text-gray-900">
            {word.kanji}
            <rp>(</rp>
            <rt className="text-sm font-normal text-indigo-500">
              {word.hiragana}
            </rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span className="text-4xl font-bold text-gray-900">
            {word.hiragana}
          </span>
        )}

        {word.romaji && (
          <span className="text-sm text-gray-400 mb-1">{word.romaji}</span>
        )}

        {word.jlpt_level && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mb-1">
            {word.jlpt_level}
          </span>
        )}
      </div>

      {/* Meanings */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Nghĩa
        </h4>
        <ul className="space-y-0.5">
          {word.meanings.map((m, i) => (
            <li key={i} className="text-gray-700">
              <span className="text-indigo-500 font-medium mr-1">{i + 1}.</span>
              {m}
            </li>
          ))}
        </ul>
      </div>

      {/* Examples */}
      {word.examples && word.examples.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Ví dụ
          </h4>
          <ul className="space-y-2">
            {word.examples.map((ex, i) => (
              <li key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-800 font-medium">{ex.japanese}</p>
                <p className="text-gray-500 text-sm mt-0.5">{ex.vietnamese}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add to Notebook button — only when logged in */}
      {user && (
        <button
          onClick={handleAddToNotebook}
          disabled={added || loading}
          className={`mt-2 text-sm px-4 py-2 rounded-lg transition font-medium ${
            added
              ? "bg-green-100 text-green-700 cursor-default"
              : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {added ? "✓ Đã thêm" : loading ? "Đang thêm..." : "+ Thêm vào sổ tay"}
        </button>
      )}
    </div>
  );
}
