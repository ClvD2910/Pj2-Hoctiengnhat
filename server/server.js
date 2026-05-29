const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files (avatars, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Mazii Clone API is running" });
});

// Routes
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/user",      require("./routes/userRoutes"));
app.use("/api",           require("./routes/wordRoutes"));
app.use("/api/notebooks", require("./routes/notebookRoutes"));
app.use("/api/kanji",     require("./routes/kanjiRoutes"));
app.use("/api/comments",  require("./routes/commentRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
