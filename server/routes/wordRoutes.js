const express = require("express");
const router = express.Router();
const { searchWords, getWordById, getWordsByJlptLevel } = require("../controllers/wordController");

// GET /api/search?q=...&page=1&limit=20
router.get("/search", searchWords);

// GET /api/words/jlpt/:level
router.get("/words/jlpt/:level", getWordsByJlptLevel);

// GET /api/words/:id
router.get("/words/:id", getWordById);

module.exports = router;
