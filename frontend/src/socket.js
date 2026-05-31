import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://speech-to-text-backend.onrender.com";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});

export default socket;

