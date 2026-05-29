const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["word", "kanji"],
      required: true,
    },
    // word: MongoDB ObjectId (as string); kanji: the kanji character (e.g. "日")
    targetId: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Nội dung bình luận không được để trống"],
      trim: true,
      maxlength: [1000, "Bình luận không được quá 1000 ký tự"],
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for fast lookup by target (by score desc, then newest first)
commentSchema.index({ targetType: 1, targetId: 1, score: -1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
