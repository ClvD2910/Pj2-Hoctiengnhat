import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getComments, addComment, deleteComment, voteComment } from "../services/commentService";
import { SERVER_BASE } from "../services/api";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function Avatar({ user, size = "w-8 h-8", textSize = "text-xs" }) {
  const src = user?.avatar
    ? user.avatar.startsWith("http") ? user.avatar : `${SERVER_BASE}${user.avatar}`
    : null;
  return (
    <div className={`${size} rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden`}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className={`${textSize} font-bold text-indigo-500`}>
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

export default function CommentSection({ targetType, targetId }) {
  const { user } = useAuth();
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [content, setContent]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deleteId, setDeleteId]     = useState(null);
  const [votingId, setVotingId]     = useState(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const textareaRef = useRef(null);

  // Reset to page 1 when the target changes
  useEffect(() => { setPage(1); }, [targetType, targetId]);

  // Fetch comments whenever target or page changes
  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    setLoading(true);
    getComments(targetType, targetId, page)
      .then((res) => {
        if (!cancelled) {
          setComments(res.data.comments);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        }
      })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [targetType, targetId, page]);

  const reloadPage1 = async () => {
    setLoading(true);
    try {
      const res = await getComments(targetType, targetId, 1);
      setComments(res.data.comments);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await addComment(targetType, targetId, content.trim());
      setContent("");
      await reloadPage1();
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể gửi bình luận. Vui lòng thử lại.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      await deleteComment(id);
      const res = await getComments(targetType, targetId, page);
      setComments(res.data.comments);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      if (res.data.comments.length === 0 && page > 1) setPage((p) => p - 1);
    } catch { /* silent */ } finally {
      setDeleteId(null);
    }
  };

  const handleVote = async (commentId, vote) => {
    if (!user || votingId === commentId) return;
    const original = comments.find((c) => c._id === commentId);
    if (!original) return;

    const uid = String(user._id);
    const up   = [...(original.upvotes || [])];
    const down = [...(original.downvotes || [])];
    const wasUp   = up.some((id) => String(id) === uid);
    const wasDown = down.some((id) => String(id) === uid);

    let newUp, newDown;
    if (vote === "up") {
      newUp   = wasUp ? up.filter((id) => String(id) !== uid) : [...up, uid];
      newDown = down.filter((id) => String(id) !== uid);
    } else {
      newDown = wasDown ? down.filter((id) => String(id) !== uid) : [...down, uid];
      newUp   = up.filter((id) => String(id) !== uid);
    }

    setComments((prev) => prev.map((c) =>
      c._id === commentId
        ? { ...c, upvotes: newUp, downvotes: newDown, score: newUp.length - newDown.length }
        : c
    ));

    setVotingId(commentId);
    try {
      const res = await voteComment(commentId, vote);
      setComments((prev) => prev.map((c) => c._id === commentId ? { ...c, ...res.data } : c));
    } catch {
      setComments((prev) => prev.map((c) => c._id === commentId ? original : c));
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
        Bình luận ({loading ? "…" : total})
      </p>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-5">
          <div className="flex gap-3 items-start">
            <Avatar user={user} />
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (content.trim() && !submitting) handleSubmit(e);
                  }
                }}
                placeholder="Viết bình luận... (Enter để gửi, Shift+Enter xuống dòng)"
                rows={2}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition"
              />
              {submitError && <p className="text-xs text-red-500 mt-1">{submitError}</p>}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-gray-400">{content.length}/1000</span>
                <button
                  type="submit"
                  disabled={!content.trim() || submitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {submitting ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-5 px-4 py-3 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-gray-500">
            <a href="/login" className="text-indigo-500 font-semibold hover:underline">
              Đăng nhập
            </a>{" "}
            để viết bình luận
          </p>
        </div>
      )}

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-4">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {comments.map((c) => {
              const uid         = String(user?._id ?? "");
              const isUpvoted   = uid && (c.upvotes   || []).some((id) => String(id) === uid);
              const isDownvoted = uid && (c.downvotes || []).some((id) => String(id) === uid);
              return (
                <div key={c._id} className="flex gap-3 items-start">
                  <Avatar user={c.user_id} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-700">
                        {c.user_id?.username ?? "An danh"}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      {user && user._id === c.user_id?._id && (
                        <button
                          onClick={() => handleDelete(c._id)}
                          disabled={deleteId === c._id}
                          className="ml-auto text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition"
                          title="Xóa bình luận"
                        >
                          {deleteId === c._id ? "Đang xóa..." : "Xóa"}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                      {c.content}
                    </p>
                    {/* Vote buttons */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={() => handleVote(c._id, "up")}
                        disabled={!user || votingId === c._id}
                        title={user ? "Thích" : "Đăng nhập để vote"}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-semibold transition
                          ${isUpvoted
                            ? "text-indigo-600 bg-indigo-50"
                            : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                        </svg>
                        {(c.upvotes || []).length}
                      </button>
                      <button
                        onClick={() => handleVote(c._id, "down")}
                        disabled={!user || votingId === c._id}
                        title={user ? "Không thích" : "Đăng nhập để vote"}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-semibold transition
                          ${isDownvoted
                            ? "text-red-500 bg-red-50"
                            : "text-gray-400 hover:text-red-400 hover:bg-red-50"}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                        </svg>
                        {(c.downvotes || []).length}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                &larr; Truoc
              </button>
              <span className="text-xs text-gray-500">Trang {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Sau &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
