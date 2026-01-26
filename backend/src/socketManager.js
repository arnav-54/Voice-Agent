import { Server } from 'socket.io';
import { AudioProcessor } from './audio/processor.js';
import { createSttStream, synthesizeAudio } from './services/deepgram.js';
import { getLLMResponse } from './services/groq.js';
import { saveMessage, getSessionHistory } from './db/mongo.js';
import logger from './utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const sessions = new Map();

export const setupSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_ORIGIN || "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        const sessionId = uuidv4();
        logger.info({ socketId: socket.id, sessionId }, 'Client connected');
        socket.emit('session:init', { sessionId });

        // Session State
        const session = {
            id: sessionId,
            processor: new AudioProcessor(),
            stt: null,
            context: "You are a helpful assistant.",
            isAssistantSpeaking: false,
            turnBuffer: [],
            lastActivity: Date.now()
        };
        sessions.set(sessionId, session);

        // Setup Deepgram Live
        const stt = createSttStream(socket);
        session.stt = stt;

        stt.addListener('transcriptReceived', (packet) => {
            const data = JSON.parse(packet);
            const channel = data.channel;
            const alternatives = channel?.alternatives?.[0];

            if (alternatives && alternatives.transcript) {
                const text = alternatives.transcript;
                const isFinal = data.is_final;

                if (text.trim().length > 0) {
                    socket.emit(isFinal ? 'transcript:final' : 'transcript:partial', { text });

                    if (isFinal) {
                        handleUserTurn(socket, session, text);
                    }
                }
            }
        });

        stt.addListener('error', (err) => {
            logger.error({ err, sessionId }, 'STT Error');
        });

        // Socket Events
        socket.on('audio:chunk', (chunk) => {
            if (!session.stt) return;

            // 1. Process Audio (VAD + Noise Suppression)
            const result = session.processor.process(chunk);

            // 2. Metrics
            // socket.emit('metrics:turn', { vad: result.metrics }); 

            // 3. Barge-in Logic
            if (result.vadStatus.isSpeech && session.isAssistantSpeaking) {
                logger.info({ sessionId }, 'Barge-in detected');
                session.isAssistantSpeaking = false;
                socket.emit('barge_in', { timestamp: Date.now() });
                // Need to cancel any pending LLM/TTS actions if possible? 
                // In this simple architecture, the frontend stops playing. 
                // We should also stop generating if we were streaming.
            }

            // 4. Send to Deepgram (using the cleaned buffer?) 
            // Deepgram works best with raw audio usually, 
            // but if we did noise suppression, we send cleaned.
            if (session.stt.getReadyState() === 1) { // OPEN
                session.stt.send(result.buffer);
            }
        });

        socket.on('disconnect', () => {
            logger.info({ sessionId }, 'Client disconnected');
            if (session.stt) { // Cleanup
                session.stt.finish();
            }
            sessions.delete(sessionId);
        });
    });

    return io;
};

// Handle Logic
async function handleUserTurn(socket, session, userText) {
    const sessionId = session.id;

    // Save User Msg
    await saveMessage(sessionId, 'user', userText);

    // Get History
    const history = await getSessionHistory(sessionId);
    // Format for Groq
    const messages = history.map(m => ({ role: m.role, content: m.content }));

    // Append System/Context
    messages.unshift({ role: 'system', content: session.context });

    // Add current user text if not in history yet (depending on DB timing)
    // History probably includes it if we awaited saveMessage. 

    // Generate LLM Response
    const startLLM = Date.now();
    const assistantText = await getLLMResponse(messages);
    const llmLatency = Date.now() - startLLM;

    socket.emit('assistant:text', { text: assistantText });
    await saveMessage(sessionId, 'assistant', assistantText);

    // TTS
    session.isAssistantSpeaking = true;
    const startTTS = Date.now();
    const audioBuffer = await synthesizeAudio(assistantText);
    const ttsLatency = Date.now() - startTTS;

    if (audioBuffer && session.isAssistantSpeaking) {
        socket.emit('assistant:audio', { audio: audioBuffer, sampleRate: 16000 });
        session.isAssistantSpeaking = false; // Done sending
    }

    // Metrics
    socket.emit('metrics:turn', {
        llmLatency,
        ttsLatency,
        e2eLatency: llmLatency + ttsLatency
    });
}

// Context Update API Handler
export const updateContext = (sessionId, contextText) => {
    // We need to look up the session by ID where ID was generated in socket?
    // Wait, the User request says "POST /api/context/update with { sessionId, contextText }".
    // But sessions in `socket.io` are usually ephemeral. 
    // The `sessionId` needs to be known by the client or persistent.
    // In this code, I generated a UUID on connection. The client doesn't know it unless I send it.
    // I should emit 'session:init' with ID.

    const session = sessions.get(sessionId);
    if (session) {
        session.context = contextText;
        return true;
    }
    return false;
};
