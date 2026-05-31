const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
  "8.8.8.8",
  "8.8.4.4",
]);

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
require("dotenv").config();

const Transcription = require("./models/Transcription");

const app = express();

/* =========================
   ALLOWED ORIGINS
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://speech-to-text-app-rn4b.vercel.app",
];

/* =========================
   CORS MIDDLEWARE
========================= */
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: "https://speech-to-text-app-rn4b.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"], // IMPORTANT (REMOVE polling)
  allowEIO3: true,
});
/* =========================
   MONGODB
========================= */
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_URI missing");
} else {
  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
      console.error("❌ MongoDB Error:", err);
      console.log("⚠️ Server running without DB");
    });
}

/* =========================
   DEEPGRAM
========================= */
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = deepgramApiKey ? createClient(deepgramApiKey) : null;

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("Speech-to-Text Backend Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ✅ FIXED: THIS WAS YOUR 404 ISSUE */
app.get("/transcriptions", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const data = await Transcription.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch transcriptions" });
  }
});

/* =========================
   SOCKET LOGIC
========================= */
io.on("connection", (socket) => {
  console.log("🟢 Client Connected:", socket.id);

  let dg = null;
  let fullTranscript = "";
  let isSaved = false;

  const createDeepgramSession = () => {
    if (!deepgram) {
      socket.emit("error", { message: "Deepgram API key missing" });
      return;
    }

    dg = deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      encoding: "linear16",
      sample_rate: 16000,
      interim_results: true,
      smart_format: true,
    });

    dg.on(LiveTranscriptionEvents.Open, () => {
      console.log("🟢 Deepgram Connected");
    });

    dg.on(LiveTranscriptionEvents.Transcript, (data) => {
      const text = data.channel?.alternatives?.[0]?.transcript || "";
      if (!text) return;

      socket.emit("transcript", text);

      if (data.is_final) {
        fullTranscript += " " + text;
      }
    });

    dg.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("❌ Deepgram Error:", err);
      socket.emit("error", { message: "Speech service error" });
    });

    dg.on(LiveTranscriptionEvents.Close, () => {
      console.log("🔴 Deepgram Closed");
    });
  };

  /* START */
  socket.on("start", () => {
    fullTranscript = "";
    isSaved = false;

    if (dg) {
      dg.finish();
      dg = null;
    }

    createDeepgramSession();
  });

  /* AUDIO */
  socket.on("audio", (data) => {
    try {
      if (dg && dg.getReadyState() === 1) {
        dg.send(Buffer.from(data));
      }
    } catch (err) {
      console.error("Audio Error:", err);
    }
  });

  /* STOP */
  socket.on("stop", async () => {
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
          socket.emit("error", { message: "No speech detected" });
          return;
        }

        let saved = null;

        if (mongoose.connection.readyState === 1) {
          saved = await Transcription.create({
            transcription: cleaned,
          });
        }

        socket.emit("saved", saved);

        let history = [];

        if (mongoose.connection.readyState === 1) {
          history = await Transcription.find().sort({
            createdAt: -1,
          });
        }

        socket.emit("history", history);
      } catch (err) {
        console.error("Save Error:", err);
        socket.emit("error", { message: "Failed to save transcription" });
      }
    }, 1000);
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    if (dg) {
      dg.finish();
      dg = null;
    }
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});