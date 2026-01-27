import { Server } from 'socket.io';
import { AudioProcessor } from './audio/processor.js';
import { createSttStream, synthesizeAudio } from './services/deepgram.js';
import { getLLMResponse } from './services/groq.js';
import { saveMessage, getSessionHistory } from './db/mongo.js';
import logger from './utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { LiveTranscriptionEvents } from '@deepgram/sdk';

const sessions = new Map();

/**
 * Creates and attaches listeners to a fresh STT stream for a session
 */
function initializeStt(session, socket) {
    if (session.stt) {
        try { session.stt.finish(); } catch (e) { }
    }

    const stt = createSttStream();
    session.stt = stt;
    session.isSttReady = false;

    stt.on(LiveTranscriptionEvents.Open, () => {
        logger.info({ sessionId: session.id }, 'Deepgram STT connection established');
        session.isSttReady = true;
    });

    stt.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
            const isFinal = data.is_final;
            logger.info({ transcript, isFinal, sessionId: session.id }, 'STT Transcript received');

            socket.emit(isFinal ? 'transcript:final' : 'transcript:partial', { text: transcript });

            if (isFinal) {
                handleUserTurn(socket, session, transcript);
            }
        }
    });

    stt.on(LiveTranscriptionEvents.Metadata, (data) => {
        // logger.info({ data }, 'Deepgram Metadata received');
    });

    stt.on(LiveTranscriptionEvents.Error, (err) => {
        logger.error({ err, sessionId: session.id }, 'Deepgram STT Error');
        session.isSttReady = false;
    });

    stt.on(LiveTranscriptionEvents.Close, () => {
        logger.warn({ sessionId: session.id }, 'Deepgram STT connection closed');
        session.isSttReady = false;
        session.stt = null; // Mark as null so it re-initializes on next audio
    });

    return stt;
}

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

        const session = {
            id: sessionId,
            processor: new AudioProcessor(),
            stt: null,
            context: "You are a helpful assistant.",
            isAssistantSpeaking: false,
            isSttReady: false
        };
        sessions.set(sessionId, session);

        // Initial STT setup
        initializeStt(session, socket);

        socket.on('ping', () => {
            socket.emit('pong');
        });

        socket.on('audiochunk', (data) => {
            // If STT stream was closed (due to inactivity), re-initialize it
            if (!session.stt) {
                logger.info({ sessionId }, 'Re-initializing STT stream after inactivity');
                initializeStt(session, socket);
            }

            if (!session.isSttReady) return;

            // Send to Deepgram
            try {
                session.stt.send(Buffer.from(data));
            } catch (err) {
                logger.error({ err, sessionId }, 'Error sending audio to Deepgram');
                session.stt = null; // Trigger re-init on next chunk
            }
        });

        socket.on('disconnect', () => {
            logger.info({ sessionId }, 'Client disconnected');
            if (session.stt) {
                try { session.stt.finish(); } catch (e) { }
            }
            sessions.delete(sessionId);
        });
    });

    return io;
};

async function handleUserTurn(socket, session, userText) {
    const sessionId = session.id;
    await saveMessage(sessionId, 'user', userText);

    const history = await getSessionHistory(sessionId);
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    messages.unshift({ role: 'system', content: session.context });

    try {
        const assistantText = await getLLMResponse(messages);
        socket.emit('assistant:text', { text: assistantText });
        await saveMessage(sessionId, 'assistant', assistantText);

        session.isAssistantSpeaking = true;
        const audioBuffer = await synthesizeAudio(assistantText);

        if (audioBuffer && session.isAssistantSpeaking) {
            socket.emit('assistant:audio', { audio: audioBuffer });
            session.isAssistantSpeaking = false;
        }

        socket.emit('metrics:turn', {
            llmLatency: 0, // Simplified for now
            ttsLatency: 0,
            e2eLatency: 0
        });
    } catch (err) {
        logger.error({ err, sessionId }, 'Error in handleUserTurn');
        socket.emit('assistant:text', { text: "I'm having trouble thinking right now." });
    }
}

export const updateContext = (sessionId, contextText) => {
    const session = sessions.get(sessionId);
    if (session) {
        session.context = contextText;
        return true;
    }
    return false;
};
