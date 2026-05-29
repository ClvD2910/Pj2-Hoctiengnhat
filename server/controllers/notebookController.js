const mongoose = require("mongoose");
const Notebook = require("../models/Notebook");
const Word     = require("../models/Word");
const User     = require("../models/User");


// GET /api/notebooks
// Returns all notebooks with wordCount — words array is not included.
const getNotebooks = async (req, res) => {
  try {
    const notebooks = await Notebook.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $project: {
          name: 1,
          user_id: 1,
          createdAt: 1,
          updatedAt: 1,
          wordCount: { $size: { $ifNull: ["$words", []] } },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    res.json(notebooks);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// GET /api/notebooks/:id
// Returns a single notebook with all its embedded word entries.
const getNotebookById = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    }).lean();

    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }

    res.json(notebook);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// POST /api/notebooks/create
const createNotebook = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên sổ tay không được để trống" });
    }

    const notebook = await Notebook.create({
      name: name.trim(),
      user_id: req.user.id,
      words: [],
    });

    await User.findByIdAndUpdate(req.user.id, {
      $push: { notebooks: notebook._id },
    });

    res.status(201).json(notebook);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// DELETE /api/notebooks/:id
const deleteNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { notebooks: notebook._id },
    });
    res.json({ message: "Đã xóa sổ tay" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// POST /api/notebooks/add-word
//
// Body: { wordId, notebookId? }

const addWordToNotebook = async (req, res) => {
  try {
    const { wordId, notebookId } = req.body;
    const userId = req.user.id;

    if (!wordId) {
      return res.status(400).json({ message: "wordId là bắt buộc" });
    }

    // Fetch original word to prefill entry
    const original = await Word.findById(wordId).lean();
    if (!original) {
      return res.status(404).json({ message: "Không tìm thấy từ vựng gốc" });
    }

    // Resolve or auto-create notebook
    let notebook;
    if (notebookId) {
      notebook = await Notebook.findOne({ _id: notebookId, user_id: userId });
      if (!notebook) {
        return res.status(404).json({ message: "Không tìm thấy sổ tay" });
      }
    } else {
      notebook = await Notebook.findOne({ user_id: userId });
      if (!notebook) {
        notebook = await Notebook.create({
          name: "Sổ tay của tôi",
          user_id: userId,
          words: [],
        });
        await User.findByIdAndUpdate(userId, { $push: { notebooks: notebook._id } });
      }
    }

    // Duplicate check
    const alreadyAdded = notebook.words.some(
      (e) => e.original_word_id?.toString() === wordId
    );
    if (alreadyAdded) {
      return res.status(400).json({ message: "Từ đã có trong sổ tay" });
    }

    // Build embedded entry — copy original data as editable defaults
    const entry = {
      original_word_id: original._id,
      word:     original.kanji    || original.reading || "",
      phonetic: original.reading  || "",
      sinoViet: original.sinoViet || "",
      meaning:  (original.meanings || []).slice(0, 3).join("; "),
      note:     "",
    };

    notebook.words.push(entry);
    await notebook.save();

    const saved = notebook.words[notebook.words.length - 1];
    res.status(201).json({ message: "Đã thêm vào sổ tay", entry: saved });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// PUT /api/notebooks/:id/words/:entryId
//
// Updates personal fields of an embedded entry.
// Allowed fields: phonetic, meaning, note.
// original_word_id is immutable after creation.
const updateWordInNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }

    const entry = notebook.words.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ message: "Không tìm thấy từ trong sổ tay" });
    }

    const { phonetic, meaning, note } = req.body;
    if (phonetic !== undefined) entry.phonetic = phonetic;
    if (meaning  !== undefined) entry.meaning  = meaning;
    if (note     !== undefined) entry.note      = note;

    await notebook.save();
    res.json({ message: "Đã cập nhật", entry });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// DELETE /api/notebooks/:id/words/:wordId
// wordId here is the embedded entry's _id (NOT the original Word's _id).
const removeWordFromNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }

    const before = notebook.words.length;
    notebook.words = notebook.words.filter(
      (e) => e._id.toString() !== req.params.wordId
    );

    if (notebook.words.length === before) {
      return res.status(404).json({ message: "Không tìm thấy từ trong sổ tay" });
    }

    await notebook.save();
    res.json({ message: "Đã xóa từ khỏi sổ tay" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// POST /api/notebooks/:id/custom-word
//
// Adds a fully custom entry (no original_word_id) directly with user-provided
// word, phonetic, meaning, and note.
const addCustomWordToNotebook = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }

    const { word, phonetic, meaning, note } = req.body;
    if (!word || !word.trim()) {
      return res.status(400).json({ message: "Từ không được để trống" });
    }

    // Look up sinoViet from the Word collection (kanji-exact, then reading-exact)
    let sinoViet = "";
    try {
      const match = await Word.findOne({
        $or: [{ kanji: word.trim() }, { reading: word.trim() }],
      })
        .select("sinoViet")
        .lean();
      if (match?.sinoViet) sinoViet = match.sinoViet;
    } catch { /* non-critical – proceed without sinoViet */ }

    const entry = {
      original_word_id: null,
      word:     word.trim(),
      phonetic: phonetic?.trim() || "",
      sinoViet,
      meaning:  meaning?.trim()  || "",
      note:     note?.trim()     || "",
    };

    notebook.words.push(entry);
    await notebook.save();

    const saved = notebook.words[notebook.words.length - 1];
    res.status(201).json({ message: "Đã thêm từ mới", entry: saved });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// PATCH /api/notebooks/:id/words/:entryId/mastered
//
// Toggles or sets the `mastered` flag on an embedded entry.
// Body (optional): { mastered: true | false }  — omit to flip current value.
const toggleMastered = async (req, res) => {
  try {
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!notebook) {
      return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    }

    const entry = notebook.words.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ message: "Không tìm thấy từ trong sổ tay" });
    }

    entry.mastered = req.body.mastered !== undefined
      ? Boolean(req.body.mastered)
      : !entry.mastered;

    await notebook.save();
    res.json({ mastered: entry.mastered });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// PATCH /api/notebooks/:id/rename
const renameNotebook = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên sổ tay không được để trống" });
    }
    const notebook = await Notebook.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { name: name.trim() },
      { new: true }
    );
    if (!notebook) return res.status(404).json({ message: "Không tìm thấy sổ tay" });
    res.json({ _id: notebook._id, name: notebook.name });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = {
  getNotebooks,
  getNotebookById,
  createNotebook,
  deleteNotebook,
  renameNotebook,
  addWordToNotebook,
  addCustomWordToNotebook,
  updateWordInNotebook,
  removeWordFromNotebook,
  toggleMastered,
};
