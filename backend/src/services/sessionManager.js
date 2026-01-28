import { v4 as uuidv4 } from 'uuid';
import { AudioProcessor } from '../audio/processor.js';
import logger from '../utils/logger.js';

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    createSession() {
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            processor: new AudioProcessor(),
            stt: null,
            context: "You are a helpful assistant.",
            isAssistantSpeaking: false,
            isSttReady: false,
            currentTurnId: 0,
            isRecording: true,
            abortController: new AbortController(),
            messagesCount: 0
        };
        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.stt) {
            try { session.stt.finish(); } catch (e) { }
        }
        return this.sessions.delete(sessionId);
    }
}

export const sessionManager = new SessionManager();
