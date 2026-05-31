import { io } from "socket.io-client";

const socket = io(
  "https://speech-to-text-app-1.onrender.com",
  {
    transports: ["websocket"],
  }
);

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Socket Error:", err.message);
});

export default socket;