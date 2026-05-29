const mongoose = require("mongoose");

// Schema khớp với dữ liệu Yomichan thực tế:
const wordSchema = new mongoose.Schema(
  {
    kanji: {
      type: String,
      default: "",
    },
    reading: {
      type: String,
      default: "",
    },
    pos: {
      type: String,
      default: "",
    },
    sinoViet: {
      type: String,
      default: "",
    },
    meanings: {
      type: [String],
      required: [true, "At least one meaning is required"],
    },
  },
  {
    timestamps: true,
  }
);

wordSchema.index({ kanji: 1 });
wordSchema.index({ reading: 1 });

module.exports = mongoose.model("Word", wordSchema);
