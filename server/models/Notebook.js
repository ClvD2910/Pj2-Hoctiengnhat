const mongoose = require("mongoose");

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
    words: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Word",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notebook", notebookSchema);
