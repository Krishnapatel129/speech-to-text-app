const mongoose = require("mongoose");

const transcriptionSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },

  filePath: {
    type: String,
    required: true,
  },

  transcription: {
    type: String,
    default: "",
  },

  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Transcription",
  transcriptionSchema
);