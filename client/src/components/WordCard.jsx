import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { toRomaji } from "wanakana";
import {
  getNotebooks,
  createNotebook,
  addWordToNotebook,
} from "../services/notebookService";
import { getTagLabel } from "../data/tagMap";

// POS badge colours (keyed by tag-code prefix)
const POS_COLOR = {
  n:    "bg-sky-50 text-sky-600",
  v:    "bg-emerald-50 text-emerald-600",   // v1, v5*, vs, vk, vt, vi …
  adj:  "bg-amber-50 text-amber-600",       // adj-i, adj-na …
  adv:  "bg-violet-50 text-violet-600",
  exp:  "bg-pink-50 text-pink-600",
  id:   "bg-pink-50 text-pink-600",
  conj: "bg-rose-50 text-rose-600",
  prt:  "bg-cyan-50 text-cyan-600",
  num:  "bg-orange-50 text-orange-600",
  pref: "bg-teal-50 text-teal-600",
  suf:  "bg-teal-50 text-teal-600",
  aux:  "bg-purple-50 text-purple-600",
  int:  "bg-lime-50 text-lime-600",
};

function posColor(code) {
  if (!code) return "bg-gray-100 text-gray-500";
  if (POS_COLOR[code]) return POS_COLOR[code];
  // match by prefix (e.g. "v5r" → "v", "adj-na" → "adj", "aux-v" → "aux")
  const prefix = code.split(/[-_]/)[0];
  return POS_COLOR[prefix] || "bg-gray-100 text-gray-500";
}

// Icon buttons
function SoundBtn({ onClick, speaking }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition ${
        speaking
          ? "text-indigo-500 bg-indigo-50"
          : "text-gray-300 hover:text-indigo-400 hover:bg-indigo-50"
      }`}
      title="Phát âm"
    >
      {/* Ripple ring while speaking */}
      {speaking && (
        <span className="absolute inset-0 rounded-xl ring-2 ring-indigo-300 animate-ping opacity-60" />
      )}
      <svg className="w-4 h-4 relative" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    </button>
  );
}

function BookmarkBtn({ filled, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
        filled ? "text-indigo-500 bg-indigo-50" : "text-gray-300 hover:text-indigo-400 hover:bg-indigo-50"
      }`}
      title="Lưu vào sổ tay"
    >
      {filled ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      )}
    </button>
  );
}

// Notebook save modal
function SaveModal({ word, onClose, onSaved }) {
  const [notebooks, setNotebooks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName]       = useState("");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    getNotebooks()
      .then((res) => {
        setNotebooks(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0]._id);
      })
      .catch(() => setErr("Không thể tải sổ tay"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await addWordToNotebook(word._id, selectedId);
      onSaved("Đã lưu vào sổ tay!");
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || "Lưu thất bại");
      setSaving(false);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await createNotebook(newName.trim());
      await addWordToNotebook(word._id, created.data._id);
      onSaved(`Đã lưu vào "${created.data.name}"!`);
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || "Tạo sổ tay thất bại");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div ref={ref} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">Lưu vào sổ tay</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {err && (
          <div className="mb-3 text-xs px-3 py-1.5 rounded-xl font-semibold border bg-red-50 text-red-700 border-red-200">{err}</div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">Đang tải...</p>
        ) : notebooks.length > 0 ? (
          <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
            {notebooks.map((nb) => (
              <label key={nb._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selectedId === nb._id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
              }`}>
                <input type="radio" name={`nb-${word._id}`} value={nb._id}
                  checked={selectedId === nb._id} onChange={() => setSelectedId(nb._id)}
                  className="accent-indigo-500" />
                <span className="text-sm font-medium text-gray-700 flex-1 truncate">{nb.name}</span>
                <span className="text-xs text-gray-400">{nb.wordCount ?? 0} từ</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3 mb-4">Chưa có sổ tay nào.</p>
        )}

        {notebooks.length > 0 && (
          <button onClick={handleSave} disabled={saving || !selectedId}
            className="w-full mb-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-40">
            {saving ? "Đang lưu..." : "Lưu vào sổ tay đã chọn"}
          </button>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">hoặc tạo mới</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
            placeholder="Tên sổ tay mới..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={handleCreateAndSave} disabled={saving || !newName.trim()}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-40">
            {saving ? "..." : "Tạo & Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// WordCard
// variant="large"  vertical card with giant kanji (default)
// variant="small"  horizontal row for search result lists
export default function WordCard({ word, variant = "large", onClick }) {
  const { user }                    = useAuth();
  const { settings }                = useSettings();
  const navigate                    = useNavigate();
  const [showModal, setShowModal]   = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const openModal = () => {
    if (!user) { navigate("/login"); return; }
    setShowModal(true);
  };

  const handleSaved = (msg) => {
    setBookmarked(true);
    setToast({ msg, type: "success" });
  };

  // Text-to-speech
  const [speaking, setSpeaking] = useState(false);

  const speak = (e) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;

    // Prefer the hiragana reading for natural pronunciation
    const text = word.reading || word.kanji || "";
    if (!text) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = 0.9;

    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer Google Japanese, then any ja-JP / ja voice
      const voice =
        voices.find((v) => /google/i.test(v.name) && v.lang.startsWith("ja")) ||
        voices.find((v) => v.lang.startsWith("ja"));
      if (voice) utter.voice = voice;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      assignVoice();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", assignVoice, { once: true });
    }

    utter.onstart  = () => setSpeaking(true);
    utter.onend    = () => setSpeaking(false);
    utter.onerror  = () => setSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  // COMPACT variant (homepage card)
  if (variant === "compact") {
    return (
      <div
        className={`relative bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200${
          onClick ? " cursor-pointer" : ""
        }`}
        onClick={onClick ? () => onClick(word) : undefined}
      >
        {toast && (
          <div className={`absolute top-2 right-2 z-10 text-xs px-2.5 py-1 rounded-xl shadow font-semibold border ${
            toast.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>{toast.msg}</div>
        )}

        {/* Row 1: word + reading + actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Word */}
          {word.kanji ? (
            <ruby className="text-lg font-bold text-indigo-500 leading-tight shrink-0">
              {word.kanji}
              {settings.showFurigana && (
                <><rp>(</rp>
                <rt className="text-[10px] font-normal text-indigo-400 tracking-wide">{word.reading}</rt>
                <rp>)</rp></>
              )}
            </ruby>
          ) : (
            <span className="text-lg font-bold text-indigo-500 shrink-0">{word.reading}</span>
          )}

          {/* Reading (when kanji exists) */}
          {word.kanji && !settings.showFurigana && (
            <span className="text-sm text-gray-400 truncate">「{word.reading}」</span>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          <SoundBtn onClick={speak} speaking={speaking} />
          <BookmarkBtn filled={bookmarked} onClick={openModal} />
        </div>

        {/* Row 2: sino-viet + pos */}
        {word.sinoViet && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              「{word.sinoViet}」
            </span>
          </div>
        )}

        {/* Row 3: meanings */}
        <p className="text-sm text-gray-600 leading-relaxed mt-1.5 line-clamp-2">
          {(word.meanings || []).join("; ")}
        </p>

        {showModal && <SaveModal word={word} onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      </div>
    );
  }

  // SMALL variant (horizontal row)
  if (variant === "small") {
    return (
      <div
        className={`relative bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:shadow-md hover:border-indigo-100 transition-all duration-200${
          onClick ? " cursor-pointer hover:bg-gray-50" : ""
        }`}
        onClick={onClick ? () => onClick(word) : undefined}
      >
        {toast && (
          <div className={`absolute top-2 right-2 z-10 text-xs px-3 py-1 rounded-xl shadow font-semibold border ${
            toast.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>{toast.msg}</div>
        )}
        <div className="flex items-center gap-4">
          {/* Left: reading + kanji */}
          <div className="shrink-0 w-32">
            {word.kanji ? (
              <ruby className="text-lg font-bold text-blue-500 leading-tight break-all">
                {word.kanji}
                {settings.showFurigana && (
                  <><rp>(</rp>
                  <rt className="text-[10px] font-normal text-indigo-400 tracking-wide">{word.reading}</rt>
                  <rp>)</rp></>
                )}
              </ruby>
            ) : (
              <span className="text-lg font-bold text-blue-500 break-all">{word.reading}</span>
            )}
            {settings.showRomaji && word.reading && (
              <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-0.5 truncate">
                {toRomaji(word.reading)}
              </p>
            )}
            {word.sinoViet && (
              <p className="text-[10px] text-amber-500 font-bold tracking-widest mt-0.5 truncate">{word.sinoViet}</p>
            )}
          </div>
          {/* Middle: meanings */}
          <div className="flex-1 min-w-0 space-y-0.5">
            {(word.meanings || []).slice(0, 3).map((m, i) => (
              <p key={i} className="text-sm text-gray-700 leading-snug truncate">
                {word.meanings.length > 1 && (
                  <span className="text-indigo-300 font-bold mr-1 text-xs">{i + 1}.</span>
                )}
                <span className="font-medium">{m}</span>
              </p>
            ))}
          </div>
          {/* Right: POS + actions */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <SoundBtn onClick={speak} speaking={speaking} />
            <BookmarkBtn filled={bookmarked} onClick={openModal} />
          </div>
        </div>
        {showModal && <SaveModal word={word} onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      </div>
    );
  }

  // LARGE variant (vertical card)
  return (
    <div className="relative bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-200 flex flex-col gap-5">
      {toast && (
        <div className={`absolute top-5 right-5 z-10 text-xs px-3 py-1.5 rounded-xl shadow-md font-semibold border ${
          toast.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {toast.type === "success" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-1 -mb-2">
        <SoundBtn onClick={speak} speaking={speaking} />
        <BookmarkBtn filled={bookmarked} onClick={openModal} />
      </div>

      {/* Giant kanji + furigana */}
      <div className="text-center py-4">
        {word.kanji ? (
          <ruby className="text-7xl font-bold text-gray-900 leading-none">
            {word.kanji}
            {settings.showFurigana && (
              <><rp>(</rp>
              <rt className="text-sm font-normal text-indigo-400 tracking-widest pb-2">{word.reading}</rt>
              <rp>)</rp></>
            )}
          </ruby>
        ) : (
          <span className="text-7xl font-bold text-gray-900">{word.reading}</span>
        )}
      </div>

      {/* Romaji */}
      {settings.showRomaji && word.reading && (
        <p className="text-center text-sm text-gray-400 font-mono tracking-[0.2em] -mt-3">
          {toRomaji(word.reading)}
        </p>
      )}

      {/* Sino-Vietnamese */}
      {word.sinoViet && (
        <p className="text-center text-xs font-bold tracking-[0.3em] text-amber-500 uppercase">{word.sinoViet}</p>
      )}

      {/* POS badges — show descriptions from tagMap */}
      {word.pos && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {word.pos.split(/\s+/).filter(Boolean).map((p, i) => (
            <span key={i} className={`text-xs font-semibold px-3 py-1 rounded-full ${posColor(p)}`}>
              {getTagLabel(p)}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-100" />

      {/* Meanings */}
      <ol className="space-y-2.5">
        {(word.meanings || []).map((m, i) => (
          <li key={i} className="flex gap-3 text-gray-800 leading-relaxed">
            <span className="text-indigo-400 font-bold shrink-0 w-5 text-right text-sm mt-0.5">{i + 1}.</span>
            <span className="font-medium text-base">{m}</span>
          </li>
        ))}
      </ol>

      {showModal && <SaveModal word={word} onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </div>
  );
}