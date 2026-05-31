// src/socket.js or inside your component
import { io } from "socket.io-client";

// ✅ Point to your Render backend
const socket = io("https://speech-to-text-app-1-h8o2.onrender.com", {
  transports: ["websocket"],   // force WebSocket transport
  reconnectionAttempts: 5,     // retry up to 5 times
  reconnectionDelay: 2000,     // wait 2s between retries
  withCredentials: true        // match backend CORS credentials
});

// Example usage
socket.on("connect", () => {
  console.log("🟢 Connected to backend:", socket.id);
});

socket.on("transcript", (text) => {
  console.log("Transcript:", text);
});

socket.on("saved", (data) => {
  console.log("Saved transcription:", data);
});

socket.on("history", (list) => {
  console.log("History:", list);
});

socket.on("error", (err) => {
  console.error("Backend error:", err);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from backend");
});

export default socket;
