const mongoose = require("mongoose");

const transcriptionSchema =
  new mongoose.Schema({
    transcription: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

module.exports = mongoose.model(
  "Transcription",
  transcriptionSchema
);