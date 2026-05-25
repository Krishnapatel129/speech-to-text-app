const express = require("express");

const router = express.Router();

const Transcription = require("../models/Transcription");

router.post("/", async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const newFile = new Transcription({
      fileName: req.file.filename,
      filePath: req.file.path,
      transcription: "",
    });

    await newFile.save();

    res.json({
      message: "File uploaded and saved to database",
      file: newFile,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

module.exports = router;