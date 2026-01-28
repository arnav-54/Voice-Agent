# Architecture & Scalability Plan

## Current Architecture
The system uses a **Stateful Vertical Architecture**:
- **WebSocket (Socket.io)**: For real-time bi-directional audio streaming.
- **In-Memory Session Store**: Tracks active conversation state, VAD status, and interruption controllers.
- **Asynchronous Service Layer**: STT (Deepgram), LLM (Groq), and TTS (Deepgram) are called in parallel where possible.

## How we handle 10 Users
The current Node.js event-loop handles this easily using asynchronous non-blocking I/O. Each session consumes ~5-10MB of RAM for buffers and state.

## Scaling to 100 Users
- **Worker Threads**: Offload the `AudioProcessor` (Noise suppression/filtering) to Node.js Worker Threads to prevent the main event loop from blocking during heavy CPU math.
- **Session DB**: Move conversation history to the indexed MongoDB (already implemented) to keep the memory footprint low.

## Scaling to 1000+ Users (Horizontal Scaling)
To handle 1000+ concurrent users, we would transition to a **Distributed State Architecture**:

1. **Redis Adapter**: Use Redis for the Socket.io adapter to allow multiple backend instances to communicate.
2. **External Session Store**: Move the `sessions` Map from local memory to a fast **Redis** store. This allows a user to "sticky" to any server node.
3. **Load Balancing**: Use Nginx or AWS ALB with "Sticky Sessions" enabled based on the `sessionId`.
4. **Serverless TTS/STT**: Ensure all 3rd party providers (Deepgram/Groq) are called via their streaming APIs to minimize "Hold Time" on backend resources.
5. **GPU Acceleration**: For the custom Noise Suppression, we could offload audio processing to a dedicated microservice running on GPU-accelerated instances using NVIDIA Maxine or similar.

## Isolation
- Each `sessionId` is a UUID.
- No global variables are used for turn state.
- Each `AbortController` is scoped strictly to one user's turn.
