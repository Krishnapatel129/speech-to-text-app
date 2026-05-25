const express = require("express");
const router = express.Router();

const fs = require("fs");

const { createClient } = require("@deepgram/sdk");

const deepgram = createClient(
  process.env.DEEPGRAM_API_KEY
);

router.post("/", async (req, res) => {
  try {

    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const audioBuffer = fs.readFileSync(
      req.file.path
    );

    const response =
      await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          mimetype: "audio/webm",
          model: "nova-2",
          smart_format: true,
        }
      );

    console.log(
      JSON.stringify(response, null, 2)
    );

    const transcript =
      response.result.results.channels[0]
      .alternatives[0].transcript;

    res.json({
      transcription: transcript,
    });

  } catch (error) {

    console.error("DEEPGRAM ERROR:");
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;