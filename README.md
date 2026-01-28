# 🎙️ Vaani - Real-time AI Voice Agent

A high-performance voice agent built with **React (Vite)**, **Node.js**, **Socket.io**, **Deepgram (STT/TTS)**, and **Groq AI (Brain)**.

## 🚀 Features
- **Ultra-low latency**: Real-time streaming using WebSockets and MediaRecorder API.
- **Background Audio Processing**: Uses `AudioWorklet` (in progress) and buffered streaming for smooth transcription.
- **Smart Brain**: Powered by Llama-3.1-8b via Groq for instant responses.
- **Visual Feedback**: Dynamic "Orb" that reacts when you speak or the agent answers.

## 🛠️ Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file based on `.env.example` and add your keys:
   - `GROQ_API_KEY`
   - `DEEPGRAM_API_KEY`
   - `MONGODB_URI`
4. Run the server: `node src/server.js`

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Run the development server: `npm run dev`

## 💡 Troubleshooting
If the agent stops hearing you:
1. **Refresh the browser** to reset the socket connection.
2. Ensure you see **"Deepgram STT connection established"** in the backend terminal.
3. Check your microphone permissions in the browser URL bar.

## 📦 Tech Stack
- **Frontend**: React, Framer Motion, TailwindCSS, Lucide React
- **Backend**: Node.js, Express, Socket.io
- **AI Services**: Deepgram (STT/TTS), Groq (LLM)
- **Database**: MongoDB
