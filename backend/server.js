const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");

const { Server } = require("socket.io");

const {
  createClient,
  LiveTranscriptionEvents,
} = require("@deepgram/sdk");

require("dotenv").config();

const Transcription = require("./models/Transcription");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/speech_to_text")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Deepgram
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

io.on("connection", (socket) => {
  console.log("Client Connected");

  let fullTranscript = "";
  let isSaved = false;

  // IMPORTANT FIX: correct audio format
  const dgConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",

    encoding: "linear16",
    sample_rate: 16000,

    smart_format: true,
    interim_results: false,
  });

  // OPEN
  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram Connected");

    // AUDIO STREAM
    socket.on("audio", (data) => {
      dgConnection.send(data);
    });

    // STOP
    socket.on("stop", async () => {
      console.log("STOP EVENT RECEIVED");

      dgConnection.finish();

      setTimeout(async () => {
        if (isSaved) return;
        isSaved = true;

        const cleaned = fullTranscript.trim();

        console.log("FINAL TRANSCRIPT:", cleaned);

        if (!cleaned) return;

        const saved = await Transcription.create({
          transcription: cleaned,
        });

        console.log("Saved To MongoDB:", saved);
      }, 2000);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      dgConnection.finish();
    });
  });

  // TRANSCRIPT
  dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript =
      data.channel?.alternatives?.[0]?.transcript;

    if (
      data.is_final &&
      transcript &&
      transcript.trim() !== ""
    ) {
      fullTranscript += " " + transcript;

      socket.emit("transcript", transcript);
    }
  });

  // ERROR DEBUG
  dgConnection.on("error", (err) => {
    console.log("Deepgram Error:", err);
  });
});

// HISTORY API
app.get("/transcriptions", async (req, res) => {
  try {
    const data = await Transcription.find().sort({
      createdAt: -1,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});