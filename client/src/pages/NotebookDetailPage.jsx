import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WordDetailModal from "../components/WordDetailModal";
import {
  getNotebookById,
  removeWordFromNotebook,
  updateWordInNotebook,
  addCustomWordToNotebook,
  toggleWordMastered,
} from "../services/notebookService";

// TTS helper
function speakWord(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "ja-JP";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

// Extract date string from MongoDB ObjectId
function idToDate(id) {
  try {
    const ts = parseInt(String(id).substring(0, 8), 16) * 1000;
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "";
  }
}

// Add custom word modal
function AddWordModal({ notebookId, onSave, onClose }) {
  const [word,     setWord]     = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [meaning,  setMeaning]  = useState("");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word.trim()) { setError("Nhập từ cần lưu"); return; }
    if (!meaning.trim()) { setError("Nhập nghĩa của từ"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await addCustomWordToNotebook(notebookId, { word, phonetic, meaning, note });
      onSave(res.data.entry);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể thêm từ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Thêm từ mới</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ <span className="text-red-400">*</span></label>
            <input
              autoFocus
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="かんじ / カタカナ / chữ tự do..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cách đọc</label>
            <input
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="ひらがな / romaji..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nghĩa <span className="text-red-400">*</span></label>
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Nghĩa tiếng Việt..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Ví dụ, cách nhớ..."
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition disabled:opacity-60">
              {saving ? "Đang lưu..." : "Thêm vào sổ tay"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function EditModal({ entry, notebookId, onSave, onClose }) {
  const [phonetic, setPhonetic] = useState(entry.phonetic || "");
  const [meaning,  setMeaning]  = useState(entry.meaning  || "");
  const [note,     setNote]     = useState(entry.note      || "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meaning.trim()) { setError("Nhập nghĩa của từ"); return; }
    setSaving(true);
    try {
      const res = await updateWordInNotebook(notebookId, entry._id, { phonetic, meaning, note });
      onSave(res.data.entry);
    } catch {
      setError("Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Chỉnh sửa từ cá nhân</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Original word — read-only reference */}
        <p className="text-sm text-gray-400 mb-4">
          Từ gốc: <span className="font-semibold text-gray-700">{entry.word}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cách đọc (phonetic)</label>
            <input
              value={phonetic}
              onChange={(e) => setPhonetic(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="ひらがな / romaji..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nghĩa (của bạn) <span className="text-red-400">*</span></label>
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Nghĩa tiếng Việt..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú cá nhân</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Ghi chú, ví dụ, cách nhớ..."
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Word card
function WordListItem({ entry, onRemove, onEdit, removing, onOpenDetail, onToggleMastered, displaySettings }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [mastered, setMastered]   = useState(!!entry.mastered);
  const [toggling, setToggling]   = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    const next = !mastered;
    setMastered(next);          // optimistic update
    setToggling(true);
    try {
      await onToggleMastered(entry._id, next);
    } catch {
      setMastered(!next);       // revert on error
    } finally {
      setToggling(false);
    }
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    speakWord(entry.word || entry.phonetic);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 800);
  };

  const dateStr = idToDate(entry._id);
  const showPhonetic = entry.phonetic && entry.phonetic !== entry.word;
  const ds = displaySettings || { word: true, phonetic: true, meaning: true, sinoViet: true };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:shadow-sm transition relative">
      {/* Row 1: word + phonetic + TTS + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
          {ds.word && (
            <button
              onClick={() => onOpenDetail(entry.word || entry.phonetic)}
              className="text-blue-500 font-bold text-base leading-snug hover:underline hover:text-indigo-600 transition-colors text-left"
            >
              {entry.word}
            </button>
          )}
          {ds.phonetic && showPhonetic && (
            <button
              onClick={() => onOpenDetail(entry.phonetic)}
              className="text-gray-400 text-sm hover:text-indigo-400 transition-colors"
            >
              「{entry.phonetic}」
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Mastered toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={mastered ? "Đã thuộc — nhấn để đổi" : "Chưa thuộc — nhấn để đổi"}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition mr-0.5 ${
              mastered
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            } disabled:opacity-60`}
          >
            {mastered ? (
              <>
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Đã thuộc
              </>
            ) : (
              "Chưa thuộc"
            )}
          </button>
          {/* TTS */}
          <button
            onClick={handleSpeak}
            title="Phát âm"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
              speaking ? "text-indigo-500 bg-indigo-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[150px]">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(entry); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onRemove(entry._id); }}
                  disabled={removing}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                >
                  {removing ? "Đang xóa..." : "Xóa khỏi sổ tay"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: sinoViet */}
      {ds.sinoViet && entry.sinoViet && (
        <p className="text-xs text-gray-400 font-semibold tracking-[0.2em] mt-1.5 uppercase">
          「{entry.sinoViet}」
        </p>
      )}

      {/* Row 3: meaning */}
      {ds.meaning && entry.meaning && (
        <p className="text-gray-700 text-sm mt-1.5 leading-snug">{entry.meaning}</p>
      )}

      {/* Row 4: note + date */}
      <div className="flex items-end justify-between gap-2 mt-3">
        {entry.note ? (
          <p className="text-gray-400 text-xs italic leading-snug flex-1">{entry.note}</p>
        ) : (
          <button
            onClick={() => onEdit(entry)}
            className="flex items-center gap-1 text-gray-300 text-xs hover:text-indigo-400 transition"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Thêm ghi chú của bạn ở đây
          </button>
        )}
        {dateStr && (
          <span className="text-[10px] text-gray-300 shrink-0">{dateStr}</span>
        )}
      </div>
    </div>
  );
}

// Flashcard mini preview
function MiniCard({ entry }) {
  const [speaking, setSpeaking] = useState(false);
  const handleSpeak = (e) => {
    e.stopPropagation();
    speakWord(entry.word || entry.phonetic);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 800);
  };

  return (
    <div className="min-w-[140px] h-[170px] bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-1 shadow-sm shrink-0 px-3 relative">
      <p className="text-blue-500 font-bold text-lg text-center leading-tight">
        {entry.word || entry.phonetic}
      </p>
      {entry.phonetic && entry.word && entry.phonetic !== entry.word && (
        <p className="text-gray-400 text-sm">{entry.phonetic}</p>
      )}
      {entry.sinoViet && (
        <span className="text-xs font-bold tracking-widest text-amber-500">
          {entry.sinoViet}
        </span>
      )}
      {entry.meaning && (
        <p className="text-gray-500 text-xs text-center mt-0.5 line-clamp-2 leading-tight">
          {entry.meaning}
        </p>
      )}
      <button
        onClick={handleSpeak}
        title="Phát âm"
        className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg transition ${
          speaking ? "text-indigo-500 bg-indigo-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>
    </div>
  );
}

// Page 
export default function NotebookDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [notebook, setNotebook]     = useState(null);
  const [words, setWords]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [removing, setRemoving]     = useState(null);
  const [search, setSearch]         = useState("");
  const [editEntry, setEditEntry]   = useState(null);
  const [addingWord, setAddingWord] = useState(false);
  const [page, setPage]             = useState(1);
  const [detailQuery, setDetailQuery] = useState(null);

  // Settings menu state
  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [settingsPanel, setSettingsPanel]   = useState(null); // null | "filter" | "sort" | "display"
  const [filterMastered, setFilterMastered] = useState("all"); // "all" | "mastered" | "unmastered"
  const [sortMode, setSortMode]             = useState("newest"); // "newest" | "oldest" | "az" | "za"
  const [displaySettings, setDisplaySettings] = useState({ word: true, phonetic: true, meaning: true, sinoViet: true });

  // Close settings menu on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e) => { if (settingsRef.current && !settingsRef.current.contains(e.target)) { setSettingsOpen(false); setSettingsPanel(null); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  useEffect(() => {
    getNotebookById(id)
      .then((res) => {
        setNotebook(res.data);
        setWords(res.data.words || []);
      })
      .catch(() => navigate("/notebooks"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleRemoveWord = async (entryId) => {
    setRemoving(entryId);
    try {
      await removeWordFromNotebook(id, entryId);
      setWords((prev) => prev.filter((e) => e._id !== entryId));
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  const handleSaveEdit = (updatedEntry) => {
    setWords((prev) =>
      prev.map((e) => (e._id === updatedEntry._id ? updatedEntry : e))
    );
    setEditEntry(null);
  };

  const handleAddCustomWord = (newEntry) => {
    setWords((prev) => [...prev, newEntry]);
    setAddingWord(false);
  };

  const handleToggleMastered = async (entryId, newVal) => {
    // Optimistic update already done in WordListItem; server call here
    await toggleWordMastered(id, entryId, newVal);
  };

  const handleShuffle = () => {
    setWords((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setPage(1);
  };

  const filtered = (() => {
    let result = search.trim()
      ? words.filter((e) =>
          (e.word     || "").includes(search) ||
          (e.phonetic || "").includes(search) ||
          (e.meaning  || "").toLowerCase().includes(search.toLowerCase()) ||
          (e.note     || "").toLowerCase().includes(search.toLowerCase())
        )
      : words;

    if (filterMastered === "mastered")   result = result.filter((e) => e.mastered);
    if (filterMastered === "unmastered") result = result.filter((e) => !e.mastered);

    if (sortMode === "newest")      result = [...result].reverse();
    else if (sortMode === "az")     result = [...result].sort((a, b) => (a.word || "").localeCompare(b.word || "", "ja"));
    else if (sortMode === "za")     result = [...result].sort((a, b) => (b.word || "").localeCompare(a.word || "", "ja"));
    // "oldest" = keep original (insertion) order

    return result;
  })();

  const PAGE_SIZE  = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (val) => { setSearch(val); setPage(1); };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!notebook) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ── Edit modal ── */}
      {editEntry && (
        <EditModal
          entry={editEntry}
          notebookId={id}
          onSave={handleSaveEdit}
          onClose={() => setEditEntry(null)}
        />
      )}

      {/* ── Add word modal ── */}
      {addingWord && (
        <AddWordModal
          notebookId={id}
          onSave={handleAddCustomWord}
          onClose={() => setAddingWord(false)}
        />
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3">
          {/* Back button */}
          <button
            onClick={() => navigate("/notebooks")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Quay lại
          </button>

          {/* Title row */}
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 mr-auto">{notebook.name}</h1>

            {/* Search within notebook */}
            <div className="relative hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52 bg-gray-50"
              />
            </div>

            {/* Shuffle button */}
            <button
              onClick={handleShuffle}
              title="Trộn ngẫu nhiên"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
              Trộn
            </button>

            {/* Add word button — next to search */}
            <button
              onClick={() => setAddingWord(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              title="Thêm từ mới"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Thêm từ
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* (···) settings dropdown */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => { setSettingsOpen((v) => !v); setSettingsPanel(null); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                  title="Tùy chọn"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                  </svg>
                </button>

                {settingsOpen && (
                  <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30">

                    {/* Main menu */}
                    {settingsPanel === null && (
                      <>
                        <button onClick={() => setSettingsPanel("filter")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 9.5V20l-4-2v-4z"/></svg>
                            Lọc sổ tay
                          </span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                        <button onClick={() => setSettingsPanel("sort")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M10 17h4"/></svg>
                            Sắp xếp sổ tay
                          </span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                        <button onClick={() => setSettingsPanel("display")} className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <span className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1"/><path strokeLinecap="round" strokeLinejoin="round" d="M22 22l-5-10-5 10M14 18h6"/></svg>
                            Cài đặt hiển thị
                          </span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      </>
                    )}

                    {/* Filter sub-panel */}
                    {settingsPanel === "filter" && (
                      <>
                        <button onClick={() => setSettingsPanel(null)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition w-full">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          Quay lại
                        </button>
                        <div className="border-t border-gray-100 pt-1">
                          {[["all","Tất cả"],["mastered","Đã thuộc"],["unmastered","Chưa thuộc"]].map(([val, label]) => (
                            <button key={val} onClick={() => { setFilterMastered(val); setPage(1); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition ${ filterMastered === val ? "text-indigo-600 font-semibold bg-indigo-50" : "text-gray-700 hover:bg-gray-50" }`}
                            >
                              {label}
                              {filterMastered === val && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Sort sub-panel */}
                    {settingsPanel === "sort" && (
                      <>
                        <button onClick={() => setSettingsPanel(null)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition w-full">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          Quay lại
                        </button>
                        <div className="border-t border-gray-100 pt-1">
                          {[["newest","Mới nhất"],["oldest","Cũ nhất"],["az","A → Z"],["za","Z → A"]].map(([val, label]) => (
                            <button key={val} onClick={() => { setSortMode(val); setPage(1); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition ${ sortMode === val ? "text-indigo-600 font-semibold bg-indigo-50" : "text-gray-700 hover:bg-gray-50" }`}
                            >
                              {label}
                              {sortMode === val && <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Display settings sub-panel */}
                    {settingsPanel === "display" && (
                      <>
                        <button onClick={() => setSettingsPanel(null)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition w-full">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          Quay lại
                        </button>
                        <div className="border-t border-gray-100 pt-1">
                          {[["word","Hiển thị từ vựng"],["phonetic","Hiển thị phiên âm"],["meaning","Hiển thị nghĩa"],["sinoViet","Hiển thị Hán Việt"]].map(([key, label]) => {
                            const checkedCount = Object.values(displaySettings).filter(Boolean).length;
                            const isDisabled = displaySettings[key] && checkedCount === 1;
                            return (
                            <button key={key} onClick={() => { if (!isDisabled) setDisplaySettings((prev) => ({ ...prev, [key]: !prev[key] })); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition ${ isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700" }`}
                            >
                              {label}
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${ displaySettings[key] ? "bg-indigo-500 border-indigo-500" : "border-gray-300" } ${ isDisabled ? "opacity-40" : "" }`}>
                                {displaySettings[key] && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                  </div>
                )}
              </div>

              {/* Practice button */}
              <button
                onClick={() => navigate("/practice", { state: { notebookId: id } })}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-5.197-2.998A1 1 0 008 9.057v5.886a1 1 0 001.555.832l5.197-2.998a1 1 0 000-1.664z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Ôn tập sổ tay
              </button>
            </div>
          </div>

          {/* Mobile search + add button */}
          <div className="sm:hidden mt-3 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm kiếm trong sổ tay..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
              />
            </div>
            {/* Shuffle — mobile */}
            <button
              onClick={handleShuffle}
              title="Trộn ngẫu nhiên"
              className="w-10 h-10 flex items-center justify-center rounded-xl transition shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>
            <button
              onClick={() => setAddingWord(true)}
              className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">
        {/* Flashcard carousel */}
        {filtered.length > 0 && (
          <div className="mb-8">
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}
            >
              {filtered.map((e) => (
                <MiniCard key={e._id} entry={e} />
              ))}
            </div>
          </div>
        )}

        {/* Word list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Danh sách từ</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} từ vựng{search ? " (đang lọc)" : ""}</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              {search ? (
                <>
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="font-medium">Không tìm thấy từ nào</p>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-2">📭</p>
                  <p className="font-medium">Sổ tay trống</p>
                  <p className="text-sm mt-1">Lưu từ vựng khi tra từ điển để thêm vào đây</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paged.map((entry) => (
                  <WordListItem
                    key={entry._id}
                    entry={entry}
                    notebookId={id}
                    onRemove={handleRemoveWord}
                    onEdit={setEditEntry}
                    removing={removing === entry._id}
                    onOpenDetail={setDetailQuery}
                    onToggleMastered={handleToggleMastered}
                    displaySettings={displaySettings}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`dots-${idx}`} className="px-1 text-gray-300 text-sm select-none">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setPage(item)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
                            safePage === item
                              ? "bg-indigo-500 text-white shadow-sm"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )
                  }

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Word detail modal */}
      {detailQuery && (
        <WordDetailModal
          initialQuery={detailQuery}
          onClose={() => setDetailQuery(null)}
        />
      )}
    </div>
  );
}
