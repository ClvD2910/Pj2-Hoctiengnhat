const mongoose = require("mongoose");

const wordSchema = new mongoose.Schema(
  {
    kanji: {
      type: String,
      default: "",
    },
    hiragana: {
      type: String,
      required: [true, "Hiragana is required"],
    },
    romaji: {
      type: String,
      default: "",
    },
    meanings: {
      type: [String],
      required: [true, "At least one meaning is required"],
    },
    examples: [
      {
        japanese: { type: String, required: true },
        vietnamese: { type: String, required: true },
      },
    ],
    jlpt_level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      default: "N5",
    },
    kanji_svg: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Word", wordSchema);
