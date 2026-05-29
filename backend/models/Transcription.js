const mongoose = require("mongoose");

const transcriptionSchema = new mongoose.Schema(
  {
    userId: String,
    transcription: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Transcription",
  transcriptionSchema
);