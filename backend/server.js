const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const { Server } = require("socket.io");
const { createClient } = require("@deepgram/sdk");

const Transcription = require("./models/Transcription");

dotenv.config();

const app = express();

app.use(cors());



mongoose
  .connect(
    "mongodb://127.0.0.1:27017/speech_to_text"
  )
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});



const deepgram = createClient(
  process.env.DEEPGRAM_API_KEY
);



io.on("connection", (socket) => {

  console.log("Client Connected");


  let fullTranscript = "";


  
  const deepgramLive =
    deepgram.listen.live({
      model: "nova-2",
      language: "en",
      smart_format: true,
    });


  
  deepgramLive.on("Results", (data) => {

    const transcript =
      data.channel.alternatives[0].transcript;

    if (
  transcript &&
  transcript.trim() !== ""
) {

  
  fullTranscript += " " + transcript;

  
  socket.emit(
    "transcript",
    transcript
  );
}
  });


 
  socket.on("audio", (chunk) => {

    if (
      deepgramLive.getReadyState() === 1
    ) {
      deepgramLive.send(chunk);
    }
  });


  socket.on("stop", async () => {

  try {

  
    const cleanedTranscript =
      fullTranscript.trim();

    if (!cleanedTranscript) {

      console.log(
        "No transcript received"
      );

      return;
    }

    
    await Transcription.create({
      transcription: cleanedTranscript,
    });

    console.log(
      "Transcript Saved To MongoDB"
    );

  } catch (err) {

    console.log(err);
  }
});

  
  socket.on("disconnect", () => {

    console.log("Client Disconnected");

    deepgramLive.finish();
  });

});



server.listen(5000, () => {

  console.log(
    "Server running on port 5000"
  );
});