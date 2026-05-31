
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
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));



/* =========================
   HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://speech-to-text-app-rn4b.vercel.app"
    ],
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
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
  console.log("🟢 CLIENT CONNECTED:", socket.id);

  socket.on("connect_error", (err) => {
    console.log("❌ CONNECT ERROR:", err.message);
  });
});

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
      if (dg){
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