import logger from '../utils/logger.js';


const VAD_THRESHOLD = 0.001;
const SILENCE_DURATION_MS = 1000;
const MIN_SPEECH_DURATION_MS = 50;

export class AudioProcessor {
    constructor() {
        this.buffer = [];
        this.isSpeaking = false;
        this.silenceStart = null;
        this.speechStart = null;

        this.prevSample = 0;
    }


    suppressNoise(float32Array) {
        const output = new Float32Array(float32Array.length);
        const alpha = 0.1;
        let lastOut = 0;

        for (let i = 0; i < float32Array.length; i++) {
            let sample = float32Array[i];


            if (Math.abs(sample) < 0.005) {
                sample = 0;
            }


            lastOut = lastOut + alpha * (sample - lastOut);

            output[i] = lastOut;
        }
        return output;
    }

    calculateRMS(float32Array) {
        let sum = 0;
        for (let i = 0; i < float32Array.length; i++) {
            sum += float32Array[i] * float32Array[i];
        }
        return Math.sqrt(sum / float32Array.length);
    }

    process(chunkBuffer) {


        const samples = Math.floor(chunkBuffer.length / 2);
        const float32Array = new Float32Array(samples);
        const dataView = new DataView(chunkBuffer.buffer, chunkBuffer.byteOffset, chunkBuffer.length);

        for (let i = 0; i < samples; i++) {
            const int16 = dataView.getInt16(i * 2, true); // Little endian
            float32Array[i] = int16 / 32768.0;
        }


        const cleanedFloat = this.suppressNoise(float32Array);


        const cleanedBuffer = Buffer.alloc(samples * 2);
        for (let i = 0; i < cleanedFloat.length; i++) {
            let s = Math.max(-1, Math.min(1, cleanedFloat[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            cleanedBuffer.writeInt16LE(s, i * 2);
        }


        const rms = this.calculateRMS(cleanedFloat);

        if (Math.random() < 0.05) {
            logger.info({ rms: rms.toFixed(5) }, 'SERVER-SIDE VOLUME CHECK');
        }

        const now = Date.now();
        let vadStatus = { isSpeech: false, event: null };

        if (rms > VAD_THRESHOLD) {
            if (!this.isSpeaking) {
                if (!this.speechStart) {
                    this.speechStart = now;
                } else if (now - this.speechStart > MIN_SPEECH_DURATION_MS) {
                    this.isSpeaking = true;
                    vadStatus = { isSpeech: true, event: 'speech_start' };
                    this.silenceStart = null;
                }
            } else {
                this.silenceStart = null;
            }
        } else {

            if (this.isSpeaking) {
                if (!this.silenceStart) {
                    this.silenceStart = now;
                } else if (now - this.silenceStart > SILENCE_DURATION_MS) {
                    this.isSpeaking = false;
                    vadStatus = { isSpeech: false, event: 'speech_end' };
                    this.speechStart = null;
                }
            } else {
                this.speechStart = null;
            }
        }

        return {
            buffer: cleanedBuffer,
            vadStatus,
            metrics: {
                rms,
                isSpeaking: this.isSpeaking
            }
        };
    }
}
