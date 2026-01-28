# 🎙️ Vaani - Real-time AI Voice Agent

A high-performance, low-latency voice agent built with **React (Vite)**, **Node.js**, **Socket.io**, **Deepgram (STT/TTS)**, and **Groq AI (Brain)**.

## 🚀 Features
- **Ultra-low latency**: Real-time streaming using WebSockets and MediaRecorder API.
- **Background Audio Processing**: Uses `AudioWorklet` and buffered streaming for smooth transcription.
- **Smart Brain**: Powered by Llama-3.1-8b via Groq for instant, conversational responses.
- **Visual Feedback**: Dynamic "Orb" that reacts when you speak or the agent answers.
- **Web Search**: Integrated Tavily API for real-time information.

---

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher

### 1. Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file based on `.env.example`:
   - `GROQ_API_KEY`: Get from [Groq Console](https://console.groq.com/)
   - `DEEPGRAM_API_KEY`: Get from [Deepgram Console](https://console.deepgram.com/)
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `TAVILY_API_KEY`: (Optional) For web search capabilities
4. Run the server: `npm start`

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create a `.env` file:
   - `VITE_BACKEND_URL=http://localhost:3000`
4. Run the development server: `npm run dev`

---

## 🏗️ Architecture Overview

### High-Level System Design
The system operates as a real-time cascade pipeline:
`Microphone` → `AudioWorklet (Browser)` → `Socket.io` → `AudioProcessor (Node.js)` → `Deepgram STT` → `Groq LLM` → `Deepgram TTS` → `Speaker`

### How it Works:
1. **Cascade Pipeline**: Unlike traditional "record-then-process" agents, Vaani streams audio chunks immediately. While you are speaking, Deepgram is already transcribing.
2. **Multi-user Session Management**: Each connection is assigned a unique UUID. Sessions are managed in-memory with a persistent fallback to MongoDB for conversation history.
3. **Real-time Context Update**: Users can push context updates via an HTTP API or Socket event, which are instantly injected into the LLM's system prompt for the next turn.

---

## 🧠 Design Decisions

- **Why Groq?**: We chose Groq for its LPU (Language Processing Unit) architecture, which provides remarkably low TTFT (Time To First Token), essential for natural voice conversation.
- **Why Deepgram?**: Deepgram's Nova-2 model for STT and Aura for TTS offer the best latency-to-accuracy ratio in the industry.
- **Real-time Communication**: We used **Socket.io** over raw WebSockets for its robust reconnection logic and built-in binary frame support, which is critical for streaming PCM audio data.
- **Custom Audio Processing**: 
  - **VAD (Voice Activity Detection)**: Implemented on the backend to filter out ambient noise and trigger turn-taking.
  - **Barge-In**: Uses an `AbortController` pattern. If the user starts speaking while the AI is responding, the AI's generation and playback are immediately killed.

---

## 📊 Performance Analysis

- **Latency Baseline**: Our target E2E latency (Silence to Speech) is **< 1.8 seconds**.
- **Measurements**:
  - **STT Latency**: ~200-400ms (Streaming)
  - **LLM TTFT**: ~100-300ms (Groq Llama 3.1 8B)
  - **TTS Latency**: ~300-500ms (Deepgram Aura)
- **Bottlenecks Identified**: The primary bottleneck is the "Network Roundtrip" for large audio buffers. We addressed this by implementing chunked streaming for both STT and TTS.

---

## 📈 Scalability Considerations

- **Current State**: Handles ~10-20 concurrent users on a single Node.js instance.
- **Scaling to 100x**: 
  - **Redis Adapter**: Transition to Redis for Socket.io state management.
  - **Horizontal Scaling**: Deploy multiple backend instances behind a Load Balancer with Sticky Sessions.
  - **Worker Threads**: Offload heavy audio math (noise suppression) to dedicated worker threads.

---

## 🤝 Tradeoffs & Future Work

### Tradeoffs
- **Optimized for Speed**: We prioritized latency over using larger, slower models (like GPT-4). Llama 3.1 8B provides the "snappiness" required for voice.
- **In-Memory Buffer**: To reduce latency, we keep current turn audio in memory rather than writing to disk.

### Future Work
- **GPU-Accelerated VAD**: Moving VAD to the edge or a GPU-accelerated microservice for even lower latency.
- **Fine-tuning**: Fine-tuning a smaller model specifically for voice filler words ("uhm", "ah") to make the agent sound more human.
- **Mobile Optimization**: implementing an Opus-encoded stream to reduce bandwidth usage on mobile devices.

---

## 🌍 Deployment

This project is optimized for deployment using **Render** (Backend) and **Render** (Frontend).
Detailed instructions are in the **[Deployment Guide](./docs/DEPLOYMENT.md)**.
