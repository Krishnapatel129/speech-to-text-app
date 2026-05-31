const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.get("/", (req, res) => res.send("OK"));
app.get("/transcriptions", (req, res) => {
  res.json([]);
});
server.listen(process.env.PORT || 5000, () => {
  console.log("SERVER RUNNING");
});