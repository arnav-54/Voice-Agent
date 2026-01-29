import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const messageSchema = new mongoose.Schema({
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    viewClearedAt: { type: Date, default: null }
});

const Session = mongoose.model('Session', sessionSchema);

export const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            logger.warn('MONGODB_URI not provided, running without persistence');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('MongoDB Connected');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB Connection Error');
        process.exit(1);
    }
};

export const saveMessage = async (sessionId, role, content) => {
    if (mongoose.connection.readyState !== 1) return;
    try {
        await Session.findOneAndUpdate(
            { sessionId },
            {
                $push: { messages: { role, content } },
                $set: { updatedAt: new Date() }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed to save message');
    }
};

export const getSessionHistory = async (sessionId, onlyVisible = false) => {
    if (mongoose.connection.readyState !== 1) return [];
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) return [];

        if (onlyVisible && session.viewClearedAt) {
            return session.messages.filter(m => m.timestamp > session.viewClearedAt);
        }
        return session.messages;
    } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed to get session history');
        return [];
    }
};

export const clearSessionView = async (sessionId) => {
    if (mongoose.connection.readyState !== 1) return;
    try {
        await Session.findOneAndUpdate(
            { sessionId },
            { $set: { viewClearedAt: new Date() } }
        );
    } catch (error) {
        logger.error({ err: error, sessionId }, 'Failed to clear session view');
    }
};
