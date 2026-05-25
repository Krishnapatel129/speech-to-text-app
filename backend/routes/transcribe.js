const express = require("express");
const fs = require("fs");

const { createClient } = require("@deepgram/sdk");

const router = express.Router();

const Transcription = require("../models/Transcription");

const deepgram = createClient(
  process.env.DEEPGRAM_API_KEY
);

router.post("/", async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const audio = fs.readFileSync(req.file.path);

    const response =
      await deepgram.listen.prerecorded.transcribeFile(
        audio,
        {
          model: "nova-2",
          smart_format: true,
        }
      );

    const transcript =
      response.result.results.channels[0]
        .alternatives[0].transcript;

    const newFile = new Transcription({
      fileName: req.file.filename,
      filePath: req.file.path,
      transcription: transcript,
    });

    await newFile.save();

    res.json({
      message: "Transcription Successful",
      transcription: transcript,
      file: newFile,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
      error,
    });
  }
});

module.exports = router;