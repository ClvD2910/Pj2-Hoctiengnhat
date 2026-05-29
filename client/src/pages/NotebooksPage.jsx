import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNotebooks, createNotebook, deleteNotebook, renameNotebook } from "../services/notebookService";

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function NotebookCard({ nb, onClick, onDelete, onRename }) {
  const count = nb.wordCount ?? nb.words?.length ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      onClick={() => onClick(nb)}
      className="relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition cursor-pointer group"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 truncate">{nb.name}</p>
          <p className="text-sm text-gray-400">{count} từ vựng</p>
        </div>

        {/* 3-dot menu */}
        <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              <button
                onClick={() => { setMenuOpen(false); onRename(nb); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Chỉnh sửa tên
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(nb); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Xóa sổ tay
              </button>
            </div>
          )}
        </div>
      </div>
      <ProgressBar value={count > 0 ? 100 : 0} />
      {nb.createdAt && (
        <p className="text-xs text-gray-300 mt-2.5">
          Tạo ngày {new Date(nb.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

// Main page
export default function NotebooksPage() {
  const { user }                  = useAuth();
  const navigate                  = useNavigate();
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [saving, setSaving]       = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null); // nb to delete
  const [deleting, setDeleting]         = useState(false);

  // Rename
  const [renameTarget, setRenameTarget] = useState(null); // nb to rename
  const [renameName, setRenameName]     = useState("");
  const [renaming, setRenaming]         = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getNotebooks()
      .then((res) => setNotebooks(res.data))
      .catch(() => setError("Không thể tải sổ tay"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await createNotebook(newName.trim());
      setNotebooks((prev) => [{ ...res.data, wordCount: 0 }, ...prev]);
      setNewName("");
      setCreating(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNotebook(deleteTarget._id);
      setNotebooks((prev) => prev.filter((n) => n._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setRenaming(true);
    try {
      await renameNotebook(renameTarget._id, renameName.trim());
      setNotebooks((prev) =>
        prev.map((n) => n._id === renameTarget._id ? { ...n, name: renameName.trim() } : n)
      );
      setRenameTarget(null);
    } catch {
      // ignore
    } finally {
      setRenaming(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <p className="text-5xl mb-3">🔒</p>
        <p className="font-medium mb-3">Bạn cần đăng nhập để xem sổ tay</p>
        <button onClick={() => navigate("/login")}
          className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition">
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sổ tay của tôi</h1>
          <p className="text-sm text-gray-400 mt-0.5">{notebooks.length} sổ tay</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Tạo sổ tay
        </button>
      </div>

      {/* Inline create form */}
      {creating && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 mb-6 flex gap-3 shadow-sm">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
            placeholder="Nhập tên sổ tay..."
            className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button onClick={handleCreate} disabled={!newName.trim() || saving}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
            {saving ? "..." : "Tạo"}
          </button>
          <button onClick={() => { setCreating(false); setNewName(""); }}
            className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition">
            Hủy
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-5 text-center text-sm">{error}</div>
      )}

      {!loading && !error && notebooks.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📭</p>
          <p className="font-medium">Chưa có sổ tay nào</p>
          <p className="text-sm mt-1">Nhấn "Tạo sổ tay" để bắt đầu lưu từ vựng</p>
        </div>
      )}

      {!loading && notebooks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map((nb) => (
            <NotebookCard
              key={nb._id}
              nb={nb}
              onClick={(n) => navigate(`/notebooks/${n._id}`)}
              onDelete={(n) => setDeleteTarget(n)}
              onRename={(n) => { setRenameTarget(n); setRenameName(n.name); }}
            />
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Xóa sổ tay?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Sổ tay <span className="font-semibold text-gray-700">"{deleteTarget.name}"</span> và toàn bộ từ trong đó sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Chỉnh sửa tên</h3>
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenameTarget(null); }}
              className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !renameName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {renaming ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
