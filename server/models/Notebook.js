const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    original_word_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Word",
      default: null,
    },
    word:     { type: String, required: true },   // kanji / main form
    phonetic: { type: String, default: "" },      // hiragana / reading
    sinoViet: { type: String, default: "" },      // Sino-Vietnamese (Hán Việt)
    meaning:  { type: String, default: "" },      // Vietnamese meaning (editable)
    note:     { type: String, default: "" },      // personal annotation
    mastered: { type: Boolean, default: false },  // Đã thuộc / Chưa thuộc
  },
  { timestamps: true }
);

const notebookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Notebook name is required"],
      trim: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    words: [entrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notebook", notebookSchema);
