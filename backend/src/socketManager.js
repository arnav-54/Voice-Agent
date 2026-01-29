import { Server } from 'socket.io';
import { AudioProcessor } from './audio/processor.js';
import { createSttStream, synthesizeAudio } from './services/deepgram.js';
import { getLLMResponse } from './services/groq.js';
import { saveMessage, getSessionHistory } from './db/mongo.js';
import { analyzeAudioQuality } from './services/analysis.js';
import { turnPerformance } from './utils/performance.js';
import { config } from './config.js';
import logger from './utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { LiveTranscriptionEvents } from '@deepgram/sdk';

const sessions = new Map();


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


            if (session.isAssistantSpeaking && transcript.trim().length > 2) {
                logger.info({ sessionId: session.id, transcript }, 'Barge-in detected');
                session.currentTurnId++;
                session.isAssistantSpeaking = false;

                session.abortController.abort();
                session.abortController = new AbortController();

                socket.emit('barge_in');
            }

            socket.emit(isFinal ? 'transcript:final' : 'transcript:partial', { text: transcript });

            if (isFinal) {
                handleUserTurn(socket, session, transcript);
            }
        }
    });

    stt.on(LiveTranscriptionEvents.Metadata, (data) => {

    });

    stt.on(LiveTranscriptionEvents.Error, (err) => {
        logger.error({ err, sessionId: session.id }, 'Deepgram STT Error');
        session.isSttReady = false;
    });

    stt.on(LiveTranscriptionEvents.Close, () => {
        logger.warn({ sessionId: session.id }, 'Deepgram STT connection closed');
        session.isSttReady = false;
        session.stt = null;
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

    io.on('connection', async (socket) => {
        let sessionId = socket.handshake.query?.sessionId;
        let history = [];

        if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
            logger.info({ sessionId }, 'Client attempting to resume session');
            history = await getSessionHistory(sessionId);
        } else {
            sessionId = uuidv4();
            logger.info({ socketId: socket.id, sessionId }, 'New client connected');
        }

        socket.emit('session:init', { sessionId, history });

        const session = {
            id: sessionId,
            processor: new AudioProcessor(),
            stt: null,
            context: "You are a helpful assistant.",
            isAssistantSpeaking: false,
            isSttReady: false,
            currentTurnId: 0,
            isRecording: true,
            abortController: new AbortController()
        };
        sessions.set(sessionId, session);

        initializeStt(session, socket);

        socket.on('ping', () => {
            socket.emit('pong');
        });

        socket.on('audiochunk', (data) => {

            if (!session.stt) {
                initializeStt(session, socket);
            }

            if (!session.isSttReady) return;


            const { buffer, vadStatus } = session.processor.process(Buffer.from(data));

            // Observability: Audio Quality Metrics
            const quality = analyzeAudioQuality(buffer);
            if (quality && Math.random() < 0.05) {
                socket.emit('metrics:audio', quality);
            }

            if (vadStatus.event === 'speech_start') {
                logger.info({ sessionId }, 'VAD: Speech Started');
            }


            try {
                session.stt.send(buffer);
            } catch (err) {
                logger.error({ err, sessionId }, 'Error sending audio to Deepgram');
                session.stt = null;
            }
        });

        socket.on('session:start', () => {
            logger.info({ sessionId }, 'Session start requested');
            session.isRecording = true;
        });

        socket.on('session:stop', () => {
            logger.info({ sessionId }, 'Session stop requested');
            session.isRecording = false;
            session.currentTurnId++;
            session.isAssistantSpeaking = false;


            session.abortController.abort();
            session.abortController = new AbortController();

            socket.emit('barge_in');
        });

        socket.on('context:update', ({ context }) => {
            logger.info({ sessionId, context }, 'Context updated via socket');
            session.context = context;
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
    const startTime = Date.now();


    session.isAssistantSpeaking = false;

    if (!session.isRecording && session.messagesCount > 0) return;
    session.messagesCount = (session.messagesCount || 0) + 1;

    const sessionId = session.id;
    const turnId = ++session.currentTurnId;

    await saveMessage(sessionId, 'user', userText);

    const history = await getSessionHistory(sessionId);
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    messages.unshift({ role: 'system', content: session.context });

    try {
        const llmStart = Date.now();
        const assistantText = await getLLMResponse(messages, session.abortController.signal);
        const llmLatency = Date.now() - llmStart;


        if (session.currentTurnId !== turnId) return;


        session.isAssistantSpeaking = true;

        socket.emit('assistant:text', { text: assistantText });
        await saveMessage(sessionId, 'assistant', assistantText);

        const ttsStart = Date.now();
        const audioBuffer = await synthesizeAudio(assistantText);
        const ttsLatency = Date.now() - ttsStart;


        if (session.currentTurnId !== turnId) {
            session.isAssistantSpeaking = false;
            return;
        }

        if (audioBuffer && session.isAssistantSpeaking) {
            socket.emit('assistant:audio', { audio: audioBuffer });
        } else {
            session.isAssistantSpeaking = false;
        }

        const totalLatency = Date.now() - startTime;
        socket.emit('metrics:turn', {
            llmLatency,
            ttsLatency,
            e2eLatency: totalLatency,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        if (err.name === 'AbortError') return;
        logger.error({ err, sessionId }, 'Error in handleUserTurn');
        session.isAssistantSpeaking = false;
        if (session.currentTurnId === turnId) {
            socket.emit('assistant:text', { text: "I'm having trouble thinking right now." });
        }
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
