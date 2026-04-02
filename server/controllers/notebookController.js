const Notebook = require("../models/Notebook");
const User = require("../models/User");

// @desc    Add a word to user's default notebook (auto-create if needed)
// @route   POST /api/notebooks/add-word
const addWordToNotebook = async (req, res) => {
  try {
    const { wordId, notebookId } = req.body;
    const userId = req.user.id;

    let notebook;

    if (notebookId) {
      // Use specified notebook
      notebook = await Notebook.findOne({ _id: notebookId, user_id: userId });
      if (!notebook) {
        return res.status(404).json({ message: "Không tìm thấy sổ tay" });
      }
    } else {
      // Use or create default notebook
      notebook = await Notebook.findOne({ user_id: userId });
      if (!notebook) {
        notebook = await Notebook.create({
          name: "Sổ tay của tôi",
          user_id: userId,
          words: [],
        });
        // Link notebook to user
        await User.findByIdAndUpdate(userId, {
          $push: { notebooks: notebook._id },
        });
      }
    }

    // Check if word already in notebook
    if (notebook.words.includes(wordId)) {
      return res.status(400).json({ message: "Từ đã có trong sổ tay" });
    }

    notebook.words.push(wordId);
    await notebook.save();

    res.json({ message: "Đã thêm vào sổ tay", notebook });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    Get all notebooks of current user
// @route   GET /api/notebooks
const getNotebooks = async (req, res) => {
  try {
    const notebooks = await Notebook.find({ user_id: req.user.id }).populate("words");
    res.json(notebooks);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { addWordToNotebook, getNotebooks };
