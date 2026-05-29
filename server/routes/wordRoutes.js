const express = require("express");
const router = express.Router();
const { searchWords, getWordById, getWordsByJlptLevel, getDailyWords, suggestWords } = require("../controllers/wordController");

// GET /api/suggest?q=...&limit=6  — fast autocomplete
router.get("/suggest", suggestWords);

// GET /api/search?q=...&page=1&limit=20
router.get("/search", searchWords);

// GET /api/words/daily?n=6           — daily random words from popular kanji (must be before /:id)
router.get("/words/daily", getDailyWords);

// GET /api/words/jlpt/:level
router.get("/words/jlpt/:level", getWordsByJlptLevel);

// GET /api/words/:id
router.get("/words/:id", getWordById);

module.exports = router;
