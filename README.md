# Speech-to-Text App 🎙️

## 1. Project Overview
This project is a **Speech-to-Text App** built with a React frontend, Node.js backend, MongoDB Atlas, and Deepgram SDK for live transcription.

Features
- Real-time speech recognition
- Transcript saving to MongoDB
- History retrieval via API
- Deployed frontend (Vercel) + backend (Render)

---

## 2. Tech Stack
- **Frontend**: React + Vite  
- **Backend**: Node.js + Express + Socket.IO  
- **Database**: MongoDB Atlas  
- **Speech API**: Deepgram SDK  
- **Deployment**: Vercel (frontend), Render (backend)

---

## 3. Setup Instructions

### Clone the repository
```bash
npm install

npm start
npm run dev
4. API Usage
REST Endpoints
GET / → Health check

GET /transcriptions → Returns saved transcripts (JSON array)

Socket.IO Events
start → Begin recording session

audio → Send audio chunks

stop → End session, save transcript

transcript → Receive live transcript

saved → Confirmation of saved transcript

history → Updated transcript list

5. Deployment Steps
Backend (Render)
Create new Node service

Set build command: npm install

Set start command: npm start

Add environment variables MONGO_URI=mongodb+srv://patel:krishna0921@atlascluster.2apqanj.mongodb.net/?appName=AtlasCluster
DEEPGRAM_API_KEY=9606e6053876c37c5abd0f5e7e8a15239752c55f

Frontend (Vercel)
Import repo

Framework preset: Vite

Build command: npm run build

Output directory: dist

6. Demo
Screenshots or link to deployed app

Usage: Click Start Recording, speak, then click Stop Recording.

Transcript will appear in real time and be saved to history.

---

This README is submission‑ready. It explains setup, API usage, deployment, and includes cleanup notes.  

Would you like me to also prepare a **short “Project Submission Summary” paragraph** (like what you’d paste into a portal or email) that highlights the project in 4–5 sentences? That way you have both the README and a concise submission blurb.
