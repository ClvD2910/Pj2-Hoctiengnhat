const mongoose = require("mongoose");

/**
 * Kanji model — mirrors the structure of kanji.json.
 */
const kanjiSchema = new mongoose.Schema(
  {
    id:           { type: Number },
    kanji:        { type: String, required: true, unique: true, trim: true },
    mean:         { type: String, default: "" },
    kun:          { type: String, default: "" },
    on:           { type: String, default: "" },
    compDetail:   { type: String, default: "" },   // JSON-stringified component array
    detail:       { type: String, default: "" },
    examples:     { type: String, default: "" },   // JSON-stringified examples array
    stroke_count: { type: Number, default: 0 },
    level:        { type: Number, default: 0 },
    freq:         { type: Number, default: 0 },
    img:          { type: String, default: "" },   // raw SVG markup
  },
  { timestamps: false }
);

module.exports = mongoose.model("Kanji", kanjiSchema);
