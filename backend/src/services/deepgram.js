import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import logger from '../utils/logger.js';

let deepgram = null;

export const initDeepgram = () => {
    if (!deepgram && process.env.DEEPGRAM_API_KEY) {
        deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    }
};

export const createSttStream = () => {
    if (!deepgram) initDeepgram();

    const live = deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        // Remove fixed linear16 to let Deepgram detect Opus/WebM
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000
    });

    return live;
};

export const synthesizeAudio = async (text) => {
    if (!deepgram) initDeepgram();

    try {
        const response = await deepgram.speak.request(
            { text },
            {
                model: "aura-asteria-en",
                encoding: "linear16",
                container: "wav",
                sample_rate: 16000
            }
        );

        const stream = await response.getStream();
        if (stream) {
            const reader = stream.getReader();
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            return Buffer.concat(chunks);
        }
    } catch (e) {
        logger.error({ err: e }, "Deepgram TTS Failed");
    }
    return null;
};
