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
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});



mongoose
  .connect("mongodb://127.0.0.1:27017/speech_to_text")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));



const deepgram = createClient(process.env.DEEPGRAM_API_KEY);



io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);

  let dg = null;
  let fullTranscript = "";
  let isSaved = false;


  const createDeepgramSession = () => {
    dg = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      encoding: "linear16",
      sample_rate: 16000,
      interim_results: true,
      smart_format: true,
    });

    dg.on(LiveTranscriptionEvents.Open, () => {
      console.log("Deepgram Connected");
    });

    dg.on(LiveTranscriptionEvents.Transcript, (data) => {
      try {
        const text =
          data.channel?.alternatives?.[0]?.transcript;

        if (!text) return;

        console.log("LIVE:", text);

        socket.emit("transcript", text);

        if (data.is_final) {
          fullTranscript += " " + text;
        }
      } catch (err) {
        console.error("Transcript Error:", err);
      }
    });

    dg.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("Deepgram Error:", err);

      socket.emit("error", {
        message: "Speech recognition service unavailable",
      });
    });

    dg.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram Connection Closed");
    });
  };

  
  socket.on("start", (data = {}) => {
    const userId = data.userId;

    console.log("START from:", userId);

    fullTranscript = "";
    isSaved = false;

    if (dg) {
      dg.finish();
      dg = null;
    }

    createDeepgramSession();
  });

  
  socket.on("audio", (data) => {
    try {
      if (dg && dg.getReadyState() === 1) {
        dg.send(Buffer.from(data));
      }
    } catch (err) {
      console.error("Audio Error:", err);

      socket.emit("error", {
        message: "Audio stream error",
      });
    }
  });


  socket.on("stop", (data = {}) => {
    const userId = data.userId;

    console.log("User stopped:", userId);

    if (dg) {
      dg.finish();
      dg = null;
    }

    setTimeout(async () => {
      try {
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

        console.log("Transcription Saved");

        socket.emit("saved", saved);

        const history = await Transcription.find().sort({
          createdAt: -1,
        });

        socket.emit("history", history);
      } catch (err) {
        console.error("Mongo Save Error:", err);

        socket.emit("error", {
          message: "Failed to save transcription",
        });
      }
    }, 1500);
  });

 
  socket.on("disconnect", () => {
    console.log("Client Disconnected");

    if (dg) {
      dg.finish();
      dg = null;
    }
  });
});



app.get("/transcriptions", async (req, res) => {
  try {
    const data = await Transcription.find().sort({
      createdAt: -1,
    });

    res.status(200).json(data);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to load transcription history",
    });
  }
});



const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});