import { io } from "socket.io-client";

const socket = io("https://speech-to-text-backend.onrender.com");
export default socket;