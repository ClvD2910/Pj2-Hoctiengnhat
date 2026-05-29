import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNotebooks, getNotebookById, toggleWordMastered } from "../services/notebookService";

// Helpers 
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Loading Spinner
function Spinner() {
  return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );
}

// TTS helper
function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "ja-JP";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

function SpeakButton({ text, light = false }) {
  const [active, setActive] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    speak(text);
    setActive(true);
    setTimeout(() => setActive(false), 700);
  };
  return (
    <button
      onClick={handleClick}
      title="Phát âm"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        light
          ? active ? "bg-white/30 text-white" : "bg-white/15 text-indigo-100 hover:bg-white/25"
          : active ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-500"
      }`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
      Phát âm
    </button>
  );
}

// Flashcard
// Entry fields: word (kanji/form), phonetic (hiragana), sinoViet (Hán Việt), meaning (Vietnamese), note
const CARD_FIELDS = [
  { key: "word",     label: "Hiển thị từ vựng" },
  { key: "phonetic", label: "Hiển thị phiên âm" },
  { key: "meaning",  label: "Hiển thị nghĩa" },
  { key: "sinoViet", label: "Hiển thị Hán Việt" },
];

function FlashcardTab({ words, onToggleMastered }) {
  const [deck, setDeck]         = useState(() => shuffle(words));
  const [idx, setIdx]           = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [stats, setStats]       = useState({ mastered: 0, notMastered: 0 });

  // Display settings per face
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [frontDisplay, setFrontDisplay] = useState({ word: true, phonetic: true, meaning: false, sinoViet: true });
  const [backDisplay,  setBackDisplay]  = useState({ word: true, phonetic: true, meaning: true,  sinoViet: true });

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e) => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const toggleFront = (key) => {
    const checkedCount = Object.values(frontDisplay).filter(Boolean).length;
    if (frontDisplay[key] && checkedCount === 1) return;
    setFrontDisplay((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleBack = (key) => {
    const checkedCount = Object.values(backDisplay).filter(Boolean).length;
    if (backDisplay[key] && checkedCount === 1) return;
    setBackDisplay((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const card     = deck[idx];
  const progress = Math.round((idx / deck.length) * 100);

  // Shuffle only the cards that haven't been shown yet (from idx onward)
  const reshuffleDeck = () => {
    setDeck((prev) => [
      ...prev.slice(0, idx),
      ...shuffle(prev.slice(idx)),
    ]);
    setFlipped(false);
  };

  const next = (mastered) => {
    setStats((s) => ({
      mastered:    s.mastered    + (mastered ? 1 : 0),
      notMastered: s.notMastered + (mastered ? 0 : 1),
    }));
    onToggleMastered?.(card._id, card.notebookId, mastered);
    setFlipped(false);
    setTimeout(() => setIdx((i) => i + 1), 180);
  };

  if (idx >= deck.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-5">
        <p className="text-6xl">🎉</p>
        <h2 className="text-2xl font-bold text-gray-800">Hoàn thành!</h2>
        <div className="flex gap-3 flex-wrap justify-center">
          <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold">✓ Đã thuộc: {stats.mastered}</span>
          <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">✗ Chưa thuộc: {stats.notMastered}</span>
        </div>
        <button
          onClick={() => { setIdx(0); setFlipped(false); setStats({ mastered: 0, notMastered: 0 }); }}
          className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition"
        >
          Học lại từ đầu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-7">
      {/* Progress bar */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
          <span>Thẻ {idx + 1} / {deck.length}</span>
          <div className="flex items-center gap-1.5">
            <span>{progress}%</span>
            {/* Shuffle */}
            <button
              onClick={reshuffleDeck}
              title="Trộn thẻ"
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>
            {/* Settings gear */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                title="Cài đặt hiển thị"
                className={`w-6 h-6 flex items-center justify-center rounded-md transition ${
                  settingsOpen ? "text-indigo-500 bg-indigo-50" : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-8 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-30">
                  <p className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Cài đặt hiển thị</p>
                  <div className="border-t border-gray-100">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 gap-4">
                      <span />
                      <span className="text-xs font-semibold text-gray-500 text-center w-16">Mặt trước</span>
                      <span className="text-xs font-semibold text-gray-500 text-center w-16">Mặt sau</span>
                    </div>
                    {CARD_FIELDS.map(({ key, label }) => {
                      const frontDisabled = frontDisplay[key] && Object.values(frontDisplay).filter(Boolean).length === 1;
                      const backDisabled  = backDisplay[key]  && Object.values(backDisplay).filter(Boolean).length  === 1;
                      return (
                        <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 gap-4 hover:bg-gray-50 transition">
                          <span className="text-sm text-gray-700">{label}</span>
                          {/* Front checkbox */}
                          <div className="flex justify-center w-16">
                            <button
                              onClick={() => toggleFront(key)}
                              disabled={frontDisabled}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                                frontDisplay[key] ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                              } ${frontDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {frontDisplay[key] && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </button>
                          </div>
                          {/* Back checkbox */}
                          <div className="flex justify-center w-16">
                            <button
                              onClick={() => toggleBack(key)}
                              disabled={backDisabled}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                                backDisplay[key] ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                              } ${backDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {backDisplay[key] && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 3-D flip card */}
      <div
        style={{ perspective: "1200px" }}
        className="w-full cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            position: "relative",
            height: "320px",
          }}
        >
          {/* Front */}
          <div
            style={{ backfaceVisibility: "hidden" }}
            className="absolute inset-0 bg-white rounded-3xl shadow-md border border-gray-100 flex flex-col items-center justify-center gap-4 p-6"
          >
            <div className="text-center">
              {frontDisplay.word && (
                <p className="text-6xl font-bold text-gray-900 leading-none">{card.word}</p>
              )}
              {frontDisplay.phonetic && card.phonetic && card.phonetic !== card.word && (
                <p className="text-xl text-indigo-400 mt-3 tracking-widest">{card.phonetic}</p>
              )}
              {frontDisplay.sinoViet && card.sinoViet && (
                <p className="text-base text-amber-500 font-bold tracking-widest mt-2">{card.sinoViet}</p>
              )}
              {frontDisplay.meaning && card.meaning && (
                <p className="text-lg text-gray-700 font-semibold mt-2">{card.meaning}</p>
              )}
            </div>
            <SpeakButton text={card.word || card.phonetic} />
            <span className="text-xs text-gray-300">Nhấn vào thẻ để xem nghĩa ↓</span>
          </div>

          {/* Back */}
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            className="absolute inset-0 bg-indigo-600 rounded-3xl shadow-md flex flex-col items-center justify-center gap-3 p-7"
          >
            {/* Word + phonetic recap */}
            <div className="text-center">
              {backDisplay.word && (
                <p className="text-3xl font-bold text-white leading-none">{card.word}</p>
              )}
              {backDisplay.phonetic && card.phonetic && card.phonetic !== card.word && (
                <p className="text-base text-indigo-300 mt-1.5 tracking-widest">{card.phonetic}</p>
              )}
            </div>

            {/* Sino-Vietnamese */}
            {backDisplay.sinoViet && card.sinoViet && (
              <span className="text-amber-300 text-sm font-bold tracking-widest uppercase">
                {card.sinoViet}
              </span>
            )}

            {/* Meaning */}
            {backDisplay.meaning && (
              <p className="text-white text-xl font-semibold text-center leading-relaxed">
                {card.meaning || <span className="italic opacity-50">Chưa có nghĩa</span>}
              </p>
            )}

            {/* Personal note */}
            {card.note && (
              <div className="border-l-4 border-indigo-400 pl-3 text-left w-full">
                <p className="text-indigo-200 text-sm leading-snug">{card.note}</p>
              </div>
            )}

            <SpeakButton text={card.word || card.phonetic} light />
          </div>
        </div>
      </div>

      {/* Rating buttons — shown only after flip */}
      {flipped ? (
        <div className="flex gap-3 w-full">
          <button
            onClick={() => next(false)}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition border bg-gray-50 text-gray-400 border-gray-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100"
          >
            ✗ Chưa thuộc
          </button>
          <button
            onClick={() => next(true)}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition border bg-gray-50 text-gray-400 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
          >
            ✓ Đã thuộc
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Nhấn vào thẻ để lật</p>
      )}
    </div>
  );
}

// Quiz
const QUIZ_TYPES = [
  { key: "word-to-meaning",      label: "Từ → Nghĩa" },
  { key: "meaning-to-word",      label: "Nghĩa → Từ" },
  { key: "meaning-to-phonetic",  label: "Nghĩa → Phiên âm" },
  { key: "phonetic-to-word",     label: "Phiên âm → Từ" },
  { key: "audio-to-word",        label: "Phát âm → Đoán từ" },
  { key: "audio-to-meaning",     label: "Phát âm → Đoán nghĩa" },
];

function QuizTab({ words }) {
  const makeChoices = (correct, pool, key) => {
    const wrongs = shuffle(
      pool.filter((w) => w[key]?.trim() && w[key] !== correct).map((w) => w[key])
    ).slice(0, 3);
    return shuffle([correct, ...wrongs]);
  };

  // Type filter settings
  const [enabledTypes, setEnabledTypes] = useState({
    "word-to-meaning":     true,
    "meaning-to-word":     true,
    "meaning-to-phonetic": true,
    "phonetic-to-word":    true,
    "audio-to-word":       true,
    "audio-to-meaning":    true,
  });
  const [typeSettingsOpen, setTypeSettingsOpen] = useState(false);
  const typeSettingsRef = useRef(null);

  useEffect(() => {
    if (!typeSettingsOpen) return;
    const handler = (e) => {
      if (typeSettingsRef.current && !typeSettingsRef.current.contains(e.target))
        setTypeSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [typeSettingsOpen]);

  const toggleType = (key) => {
    const checkedCount = Object.values(enabledTypes).filter(Boolean).length;
    if (enabledTypes[key] && checkedCount === 1) return; // keep at least 1
    setEnabledTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [qi, setQi]             = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState(0);
  const [done, setDone]         = useState(false);

  // Reset quiz when enabled types change
  useEffect(() => {
    setQi(0); setSelected(null); setScore(0); setDone(false);
  }, [enabledTypes]);

  const questions = useMemo(() => {
    return shuffle(words)
      .map((w) => {
        const types = [];
        if (enabledTypes["word-to-meaning"]      && w.meaning?.trim() && w.word?.trim())                            types.push("word-to-meaning");
        if (enabledTypes["meaning-to-word"]      && w.meaning?.trim() && w.word?.trim())                            types.push("meaning-to-word");
        if (enabledTypes["meaning-to-phonetic"]  && w.meaning?.trim() && w.phonetic?.trim())                        types.push("meaning-to-phonetic");
        if (enabledTypes["phonetic-to-word"]     && w.phonetic?.trim() && w.word?.trim() && w.phonetic !== w.word)  types.push("phonetic-to-word");
        if (enabledTypes["audio-to-word"]        && (w.word?.trim() || w.phonetic?.trim()))                         types.push("audio-to-word");
        if (enabledTypes["audio-to-meaning"]     && w.meaning?.trim() && (w.word?.trim() || w.phonetic?.trim()))    types.push("audio-to-meaning");
        if (types.length === 0) return null;

        // eslint-disable-next-line react-hooks/purity
        const type = types[Math.floor(Math.random() * types.length)];

        let correct, ansKey;
        if      (type === "word-to-meaning")     { correct = w.meaning;  ansKey = "meaning";  }
        else if (type === "meaning-to-word")     { correct = w.word;     ansKey = "word";     }
        else if (type === "meaning-to-phonetic") { correct = w.phonetic; ansKey = "phonetic"; }
        else if (type === "phonetic-to-word")    { correct = w.word;     ansKey = "word";     }
        else if (type === "audio-to-word")       { correct = w.word;     ansKey = "word";     }
        else                                     { correct = w.meaning;  ansKey = "meaning";  } // audio-to-meaning

        const choices = makeChoices(correct, words, ansKey);
        if (choices.length < 2) return null;
        return { type, w, correct, choices };
      })
      .filter(Boolean);
  }, [words, enabledTypes]);

  // Auto-play audio for audio question types
  useEffect(() => {
    if (!questions.length || done) return;
    const cur = questions[qi];
    if (cur && (cur.type === "audio-to-word" || cur.type === "audio-to-meaning")) {
      speak(cur.w.word || cur.w.phonetic);
    }
  }, [qi, questions, done]);

  const cur = questions[qi];

  const pick = (choice) => {
    if (selected) return;
    setSelected(choice);
    if (choice === cur.correct) setScore((s) => s + 1);
  };

  const goNext = () => {
    if (qi + 1 >= questions.length) setDone(true);
    else { setQi((i) => i + 1); setSelected(null); }
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const tier = pct >= 80 ? "green" : pct >= 40 ? "amber" : "red";
    const tierCfg = {
      green: {
        icon: "🏆",
        bar: "bg-emerald-500",
        text: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        msg: "Xuất sắc! Bạn đã nắm vững bộ từ này!",
      },
      amber: {
        icon: "💪",
        bar: "bg-amber-400",
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        msg: "Khá tốt! Luyện thêm một chút nữa là thành thạo thôi!",
      },
      red: {
        icon: "📚",
        bar: "bg-red-400",
        text: "text-red-500",
        bg: "bg-red-50",
        border: "border-red-200",
        msg: "Còn nhiều từ cần ôn lại. Cố lên, bạn làm được!",
      },
    }[tier];

    return (
      <div className="flex flex-col items-center py-16 gap-5 w-full max-w-sm mx-auto">
        {/* <p className="text-6xl">{tierCfg.icon}</p> */}
        <h2 className="text-2xl font-bold text-gray-800">Kết quả</h2>

        {/* Score percentage */}
        <p className={`text-5xl font-bold ${tierCfg.text}`}>{pct}%</p>
        <p className="text-gray-500 text-sm">{score} / {questions.length} câu đúng</p>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`${tierCfg.bar} h-3 rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Motivational message */}
        <div className={`w-full text-center text-sm font-medium px-4 py-3 rounded-xl border ${tierCfg.bg} ${tierCfg.border} ${tierCfg.text}`}>
          {tierCfg.msg}
        </div>

        <button
          onClick={() => { setQi(0); setSelected(null); setScore(0); setDone(false); }}
          className="mt-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition"
        >
          Làm lại
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-5xl mb-3">📭</p>
        <p className="font-medium">Không đủ dữ liệu để tạo câu hỏi</p>
        <p className="text-sm mt-1">Hãy bổ sung nghĩa và cách đọc cho từ trong sổ tay</p>
      </div>
    );
  }

  // Prompt rendering per question type 
  const renderPrompt = () => {
    const { type, w } = cur;
    if (type === "audio-to-word" || type === "audio-to-meaning") {
      return (
        <>
          <button
            onClick={() => speak(w.word || w.phonetic)}
            title="Phát lại"
            className="w-20 h-20 flex items-center justify-center rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-500 transition"
          >
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          <p className="text-sm text-gray-400 mt-4">
            {type === "audio-to-word" ? "Từ vừa phát âm là gì?" : "Nghĩa của từ vừa phát âm là gì?"}
          </p>
        </>
      );
    }
    if (type === "word-to-meaning") {
      return (
        <>
          {w.phonetic ? (
            <ruby className="text-5xl font-bold text-gray-900">
              {w.word}
              <rt className="text-sm font-normal text-indigo-400">{w.phonetic}</rt>
            </ruby>
          ) : (
            <span className="text-5xl font-bold text-gray-900">{w.word}</span>
          )}
          <p className="text-sm text-gray-400 mt-4">Nghĩa của từ trên là gì?</p>
        </>
      );
    }
    if (type === "meaning-to-word") {
      return (
        <>
          <p className="text-2xl font-semibold text-gray-800 leading-snug">{w.meaning}</p>
          <p className="text-sm text-gray-400 mt-4">Từ có nghĩa trên là gì?</p>
        </>
      );
    }
    if (type === "meaning-to-phonetic") {
      return (
        <>
          <p className="text-2xl font-semibold text-gray-800 leading-snug">{w.meaning}</p>
          <p className="text-sm text-gray-400 mt-4">Cách đọc của từ có nghĩa trên là gì?</p>
        </>
      );
    }
    // phonetic-to-word
    return (
      <>
        <p className="text-4xl font-bold text-indigo-500 tracking-widest">{w.phonetic}</p>
        <p className="text-sm text-gray-400 mt-4">Từ có cách đọc trên là gì?</p>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Progress bar + type settings button */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
          <span>Câu {qi + 1} / {questions.length}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-500 font-semibold">✓ {score}</span>
            {/* Type filter settings */}
            <div className="relative" ref={typeSettingsRef}>
              <button
                onClick={() => setTypeSettingsOpen((v) => !v)}
                title="Chọn loại câu hỏi"
                className={`w-6 h-6 flex items-center justify-center rounded-md transition ${
                  typeSettingsOpen ? "text-indigo-500 bg-indigo-50" : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              {typeSettingsOpen && (
                <div className="absolute right-0 top-8 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-30">
                  <p className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Chọn loại câu hỏi</p>
                  <div className="border-t border-gray-100 pt-1">
                    {QUIZ_TYPES.map(({ key, label }) => {
                      const isDisabled = enabledTypes[key] && Object.values(enabledTypes).filter(Boolean).length === 1;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleType(key)}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition ${
                            isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700"
                          }`}
                        >
                          {label}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition shrink-0 ${
                            enabledTypes[key] ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                          } ${isDisabled ? "opacity-40" : ""}`}>
                            {enabledTypes[key] && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(qi / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center min-h-[140px] flex flex-col items-center justify-center">
        {renderPrompt()}
      </div>

      {/* Answer choices */}
      <div className="grid grid-cols-2 gap-3">
        {cur.choices.map((c, i) => {
          let cls = "w-full py-4 px-5 rounded-2xl border-2 text-left text-sm font-medium transition";
          if (!selected)              cls += " border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-gray-700";
          else if (c === cur.correct) cls += " border-green-400 bg-green-50 text-green-700";
          else if (c === selected)    cls += " border-red-400 bg-red-50 text-red-600";
          else                        cls += " border-gray-100 bg-gray-50 text-gray-400";
          return (
            <button key={i} className={cls} onClick={() => pick(c)}>
              <span className="font-bold text-gray-300 mr-2">{["A", "B", "C", "D"][i]}.</span>
              {c}
            </button>
          );
        })}
      </div>

      {/* Answer card — shown after selecting */}
      {selected && (
        <div className="relative bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          {/* TTS button — top-right corner */}
          <button
            onClick={() => { speak(cur.w.word || cur.w.phonetic); }}
            title="Phát âm"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>
          <div className="flex flex-col items-center text-center pr-8">
            <p className="text-3xl font-bold text-gray-900 leading-none">{cur.w.word}</p>
            {cur.w.phonetic && (
              <p className="text-base text-indigo-500 mt-1.5 tracking-widest">{cur.w.phonetic}</p>
            )}
            {cur.w.sinoViet && (
              <p className="text-xs font-bold text-amber-600 mt-1 uppercase tracking-wider">{cur.w.sinoViet}</p>
            )}
            {cur.w.meaning && (
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{cur.w.meaning}</p>
            )}
          </div>
        </div>
      )}

      {/* Next button */}
      {selected && (
        <button
          onClick={goNext}
          className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition"
        >
          {qi + 1 >= questions.length ? "Xem kết quả →" : "Câu tiếp →"}
        </button>
      )}
    </div>
  );
}

// Page 
export default function PracticePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab]             = useState("flashcard");
  const [notebooks, setNotebooks] = useState([]);     // list summary (no words)
  const [sourceId, setSourceId]   = useState(location.state?.notebookId || "all");  // "all" | notebook._id
  const [words, setWords]         = useState([]);     // active word entries
  const [loadingData, setLoading] = useState(false);
  const [error, setError]         = useState(null);

  // Cache fetched notebook words to avoid redundant API calls
  const cacheRef = useRef({});

  // 1. Redirect guests to login 
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // 2. Load notebook list when user is available
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getNotebooks()
      .then((res) => setNotebooks(res.data))
      .catch(() => setError("Không thể tải danh sách sổ tay"))
      .finally(() => setLoading(false));
  }, [user]);

  // 3. Load words whenever the selected source changes
  useEffect(() => {
    if (!user || notebooks.length === 0) return;

    const fetchWords = async () => {
      setLoading(true);
      setError(null);
      try {
        if (sourceId === "all") {
          // Fetch each notebook (use cache to avoid re-fetching)
          const results = await Promise.all(
            notebooks.map((nb) => {
              if (cacheRef.current[nb._id]) {
                return Promise.resolve(cacheRef.current[nb._id]);
              }
              return getNotebookById(nb._id).then((res) => {
                cacheRef.current[nb._id] = res.data.words || [];
                return cacheRef.current[nb._id];
              });
            })
          );
          // Merge and deduplicate by entry _id
          const seen = new Set();
          const merged = results.flat().filter((w) => {
            if (seen.has(w._id)) return false;
            seen.add(w._id);
            return true;
          });
          setWords(merged);
        } else {
          // Single notebook
          if (cacheRef.current[sourceId]) {
            setWords(cacheRef.current[sourceId]);
          } else {
            const res = await getNotebookById(sourceId);
            const entries = res.data.words || [];
            cacheRef.current[sourceId] = entries;
            setWords(entries);
          }
        }
      } catch {
        setError("Không thể tải từ vựng");
        setWords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, [user, notebooks, sourceId]);

  // Mastered toggle handler 
  const handleToggleMastered = useCallback(async (entryId, notebookId, mastered) => {
    if (!notebookId) return;
    try {
      await toggleWordMastered(notebookId, entryId, mastered);
      // Update cache so subsequent re-renders reflect new state
      if (cacheRef.current[notebookId]) {
        cacheRef.current[notebookId] = cacheRef.current[notebookId].map((e) =>
          e._id === entryId ? { ...e, mastered } : e
        );
      }
    } catch {
      // Silently ignore – FlashcardTab already shows optimistic state
    }
  }, []);

  // Render guards 
  if (authLoading) return <Spinner />;
  if (!user)       return null; // redirect in progress

  if (loadingData) return <Spinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <p className="text-5xl mb-3">⚠️</p>
        <p className="font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (words.length < 4) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Luyện tập</h1>
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📭</p>
          <p className="font-medium">Cần ít nhất 4 từ để bắt đầu luyện tập</p>
          <p className="text-sm mt-1">Hãy lưu thêm từ vào sổ tay</p>
          <button
            onClick={() => navigate("/")}
            className="mt-5 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
          >
            Tra từ điển →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Luyện tập</h1>
        <p className="text-sm text-gray-400 mt-0.5">{words.length} từ trong bộ luyện</p>
      </div>

      {/* Notebook selector */}
      {notebooks.length > 0 && (
        <div className="mb-5">
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
          >
            <option value="all">Tất cả sổ tay</option>
            {notebooks.map((nb) => (
              <option key={nb._id} value={nb._id}>
                {nb.name} ({nb.wordCount ?? 0} từ)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-8">
        {[["flashcard", "Flashcard"], ["quiz", "Trắc nghiệm"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === k ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "flashcard"
        ? <FlashcardTab key={`fc-${sourceId}`} words={words} onToggleMastered={handleToggleMastered} />
        : <QuizTab      key={`qz-${sourceId}`} words={words} />
      }
    </div>
  );
}
