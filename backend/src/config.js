import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    mongodb_uri: process.env.MONGODB_URI,
    groq_api_key: process.env.GROQ_API_KEY,
    deepgram_api_key: process.env.DEEPGRAM_API_KEY,
    tavily_api_key: process.env.TAVILY_API_KEY,
    frontend_origin: process.env.FRONTEND_ORIGIN || "*",
    vad: {
        threshold: 0.001,
        silence_duration: 1500,
        min_speech_duration: 50,
        endpointing: 1500,
        utterance_end_ms: 1500
    },

    audio: {
        sample_rate: 16000,
        channels: 1,
        encoding: 'linear16'
    }
};
