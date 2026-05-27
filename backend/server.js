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


mongoose
  .connect("mongodb://127.0.0.1:27017/speech_to_text")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Mongo Error:", err));


const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

io.on("connection", (socket) => {
  console.log("Client Connected");

  let fullTranscript = "";
  let isSaved = false;

  const dgConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    encoding: "linear16",
    sample_rate: 16000,
    smart_format: true,
    interim_results: false,
  });

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram Connected");

    // AUDIO STREAM
    socket.on("audio", (data) => {
      try {
        dgConnection.send(data);
      } catch (err) {
        console.log("Audio Error:", err);
        socket.emit("error", { message: "Audio streaming failed" });
      }
    });

    
    socket.on("stop", async () => {
      try {
        console.log("STOP EVENT RECEIVED");

        dgConnection.finish();

        setTimeout(async () => {
          if (isSaved) return;
          isSaved = true;

          const cleaned = fullTranscript.trim();

          if (!cleaned) {
            socket.emit("error", {
              message: "No speech detected",
            });
            return;
          }

          const saved = await Transcription.create({
            transcription: cleaned,
          });

          console.log("Saved To MongoDB:", saved);
        }, 2000);
      } catch (err) {
        console.log("Stop Error:", err);
        socket.emit("error", {
          message: "Failed to save transcription",
        });
      }
    });

   
    socket.on("disconnect", () => {
      dgConnection.finish();
    });
  });

  
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

 
  dgConnection.on("error", (err) => {
    console.log("Deepgram Error:", err);

    socket.emit("error", {
      message: "Speech recognition failed",
    });
  });
});


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