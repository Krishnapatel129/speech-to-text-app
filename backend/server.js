const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

// Force reliable DNS resolvers
dns.setServers([
  "1.1.1.1",
  "1.0.0.1",
  "8.8.8.8",
  "8.8.4.4",
]);
dns.setDefaultResultOrder("ipv4first");
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

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://YOUR-VERCEL-FRONTEND.vercel.app"
    ],
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   HTTP + Socket.IO Server
========================= */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://speech-to-text-app.vercel.app"
    ],
    credentials: true,
  },
});

/* =========================
   MongoDB
========================= */
/* =========================
   MongoDB
========================= */
const mongoUri = process.env.MONGO_URI;

function safeLogMongoUri(uri) {
  if (!uri) return "<missing MONGO_URI>";

  return uri.replace(
    /^(mongodb(\+srv)?:\/\/)([^@/]*?)@/,
    "$1***@"
  );
}

function uriType(uri) {
  if (!uri) return "missing";
  if (uri.startsWith("mongodb+srv://")) return "mongodb+srv";
  if (uri.startsWith("mongodb://")) return "mongodb";
  return "unknown";
}

if (!mongoUri) {
  console.error("MongoDB Error: MONGO_URI is not set");
} else {
  console.log(
    "MongoDB: attempting connection. URI type:",
    uriType(mongoUri),
    "URI:",
    safeLogMongoUri(mongoUri)
  );

  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 5,
    })
    .then(() => {
      console.log("MongoDB Connected");
    })
    .catch((err) => {
      console.error("MongoDB Error:", err);
    });
}
/* =========================
   Deepgram
========================= */
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = deepgramApiKey
  ? createClient(deepgramApiKey)
  : null;


/* =========================
   Socket Events
========================= */
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
          data.channel?.alternatives?.[0]?.transcript || "";

        if (!text) return;

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

  /* START */
  socket.on("start", (data = {}) => {
    console.log("Recording Started");

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

      socket.emit("error", {
        message: "Audio stream error",
      });
    }
  });

  /* STOP */
  socket.on("stop", async () => {
    // If deepgram session is missing (no API key), fail gracefully
    if (!deepgram) {
      socket.emit("error", { message: "Speech recognition is not configured (missing DEEPGRAM_API_KEY)" });
      return;
    }

    console.log("Recording Stopped");

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

        // If DB connected but query fails, surface clean message
        // (handled by outer catch)

        socket.emit("saved", saved);

        const history = await Transcription.find().sort({
          createdAt: -1,
        });

        socket.emit("history", history);

        console.log("Transcription Saved");
      } catch (err) {
        console.error("Mongo Save Error:", err);

        socket.emit("error", {
          message: "Failed to save transcription",
        });
      }
    }, 1500);
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    console.log("Client Disconnected");

    if (dg) {
      dg.finish();
      dg = null;
    }
  });
});

/* =========================
   Routes
========================= */

app.get("/", (req, res) => {
  res.send("Speech To Text Backend Running");
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

/* =========================
   Start Server
========================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});