const mongoose =
  require("mongoose");

const transcriptionSchema =
  new mongoose.Schema(
    {
      transcription: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Transcription",
    transcriptionSchema
  );