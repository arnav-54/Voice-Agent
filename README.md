# Production Voice Agent

A real-time, low-latency Voice AI built with React, Node.js, and modern AI streaming APIs.

## Architecture

**Frontend**: React + Vite + WebAudio + Socket.IO Client.
- Captures raw audio (PCM 16-bit 16kHz).
- Visualizes state (Listening/Thinking/Speaking).
- Plays streaming audio responses with queue management and barge-in support.

**Backend**: Node.js + Express + Socket.IO Server.
- **Pipeline**:
  User Audio -> **Custom DSP** (Noise Suppression + VAD) -> **Deepgram STT** (Live) -> **Groq Llama 3** (Intelligence) -> **Tavily** (Search Tools) -> **Deepgram TTS** (Stream) -> Client.
- **State Management**: Per-socket session isolation.
- **Persistence**: MongoDB for conversation history.

## Performance & Optimization
- **Latency**: Minimized by streaming STT and TTS.
- **VAD**: Custom Energy-based VAD running on the server (AudioProcessor) to detect turns.
- **Barge-In**: Interrupts playback immediately when user speaks during assistant turn.

## Prerequisites
- Node.js 18+
- MongoDB Instance (Atlas Free Tier)
- API Keys: Deepgram, Groq, Tavily.

## Setup

1. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Fill in keys
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API - Context Update
You can inspect the `sessionId` in the frontend header or logs.
```bash
curl -X POST http://localhost:3000/api/context/update \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "YOUR_SESSION_ID", "contextText": "You are now a pirate."}'
```

## Custom Audio Processing
The `AudioProcessor` class in `backend/src/audio/processor.js` implements:
- **Noise Suppression**: Simple spectral gating and smoothing.
- **VAD**: RMS energy thresholding with state machine for silence detection.

## Multi-User
Each Socket.IO connection spawns a unique `Session` object with its own audio buffer, STT stream, and conversation history.
