import { io } from "socket.io-client";

const socket = io(
  "https://speech-to-text-app-1-h8o2.onrender.com",
  {
    transports: ["websocket"],
  }
);

export default socket;