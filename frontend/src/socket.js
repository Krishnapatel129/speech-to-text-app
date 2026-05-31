import { io } from "socket.io-client";

const socket = io("https://speech-to-text-app-1.onrender.com");

export default socket;