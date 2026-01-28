import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupSocketIO, updateContext } from './socketManager.js';
import { connectDB } from './db/mongo.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());


connectDB();

app.get('/', (req, res) => {
    res.send('🎙️ Vaani Backend is Running!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/context/update', (req, res) => {
    const { sessionId, contextText } = req.body;
    if (!sessionId || !contextText) {
        return res.status(400).json({ error: 'Missing sessionId or contextText' });
    }

    const success = updateContext(sessionId, contextText);
    if (success) {
        logger.info({ sessionId }, 'Context updated');
        res.json({ success: true, message: 'Context updated' });
    } else {
        logger.warn({ sessionId }, 'Session not found for update');
        res.status(404).json({ error: 'Session not found' });
    }
});


setupSocketIO(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
