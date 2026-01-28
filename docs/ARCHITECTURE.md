# Voice Agent System Architecture

## 1. Data Flow Overview
The system operates as a real-time pipeline:
`Microphone` → `AudioWorklet (Browser)` → `Socket.io` → `AudioProcessor (Node.js)` → `Deepgram STT` → `Groq LLM` → `Deepgram TTS` → `Speaker`

## 2. Key Modules

### Frontend Hooks
- **useAudioRecorder.js**: Sets up the `AudioContext` and `AudioWorkletNode` to stream raw 16kHz audio.
- **useAudioPlayer.js**: Manages a buffer queue of AI voice responses to ensure smooth playback.
- **useSocket.js**: Manages the persistent WebSocket connection and handles transit of metrics and transcripts.

### Backend Services
- **socketManager.js**: The central coordinator that routes events between the UI and AI services.
- **audio/processor.js**: Implements custom Spectral Gating and VAD. It prevents silence or background noise from wasting AI tokens.
- **services/groq.js**: Orchestrates the LLM logic, including web search tool-calling, response caching, and provider fallback.
- **services/deepgram.js**: Handles the heavy lifting of speech-to-text and high-quality voice synthesis.

## 3. Advanced Features
- **Barge-In**: achieved by using an `AbortController` linked to the session state. If new audio is detected while the AI is responding, the controller is triggered, instantly killing the upstream API request.
- **Web Search**: The system uses **Tavily API** to augment the AI's knowledge with real-time internet data.
- **Performance Tracking**: Every turn is timed at 4 distinct points to provide the E2E latency dashboard.
- **Noise Suppression**: A custom mathematical filter (Spectral Gate) removes background hiss at the raw PCM level.
