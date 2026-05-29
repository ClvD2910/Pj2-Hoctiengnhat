const express = require("express");
const router = express.Router();
const { analyzeKanji, getKanjiByChar, getDailyKanji } = require("../controllers/kanjiController");

// GET /api/kanji/daily?n=6          — daily random picks from top 600 (must be before /:char)
router.get("/daily", getDailyKanji);

// GET /api/kanji/analyze?chars=勉強中   — batch analyze (no SVG)
router.get("/analyze", analyzeKanji);

// GET /api/kanji/:char                 — full detail for one character (with SVG)
router.get("/:char", getKanjiByChar);

module.exports = router;
