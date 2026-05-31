import { io } from "socket.io-client";

const socket = io("https://speech-to-text-app-1-h8o2.onrender.com", {
  transports: ["polling", "websocket"],
  secure: true,
  reconnection: true,
});

export default socket;