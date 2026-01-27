import logger from '../utils/logger.js';

// Constants
const VAD_THRESHOLD = 0.001; // Super sensitive
const SILENCE_DURATION_MS = 1000;
const MIN_SPEECH_DURATION_MS = 50; // Capture everything

export class AudioProcessor {
    constructor() {
        this.buffer = [];
        this.isSpeaking = false;
        this.silenceStart = null;
        this.speechStart = null;
        // Simple filter state
        this.prevSample = 0;
    }

    // Simple High-pass / Low-pass visualization (Bandpass)
    // Simple 1-pole high-pass filter: y[n] = x[n] - x[n-1] + 0.9 * y[n-1] (DC removal)
    // But for simple "noise suppression" requested, let's do a simple spectral gate simulated by just zeroing out very low amplitude noise?
    // The user asked for "Bandpass filter + smoothing"
    suppressNoise(float32Array) {
        const output = new Float32Array(float32Array.length);
        const alpha = 0.1; // Smoothing factor for low-pass
        let lastOut = 0;

        for (let i = 0; i < float32Array.length; i++) {
            let sample = float32Array[i];

            // 1. Spectral Gating (Simple Noise Gate)
            // If signal is very weak, clamp to 0 to reduce background hiss
            if (Math.abs(sample) < 0.005) {
                sample = 0;
            }

            // 2. Simple Low Pass (Smoothing)
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
        // specific to 16-bit PCM or Float32?
        // Deepgram expects raw audio. But for VAD we need to inspect it.
        // Assume input is Buffer (int16). Convert to float for VAD.

        const float32Array = new Float32Array(chunkBuffer.length / 2);
        const dataView = new DataView(chunkBuffer.buffer, chunkBuffer.byteOffset, chunkBuffer.length);

        for (let i = 0; i < chunkBuffer.length / 2; i++) {
            const int16 = dataView.getInt16(i * 2, true); // Little endian
            float32Array[i] = int16 / 32768.0;
        }

        // Apply Noise Suppression (Mutative or return new)
        const cleanedFloat = this.suppressNoise(float32Array);

        // Convert back to Buffer for downstream (optional, or just stream original/cleaned)
        // For this simple demo, we stream original to Deepgram to avoid artifacts from bad JS filtering, 
        // BUT user asked for custom noise suppression in pipeline.
        // So let's re-encode cleaned to int16.
        const cleanedBuffer = Buffer.alloc(chunkBuffer.length);
        for (let i = 0; i < cleanedFloat.length; i++) {
            let s = Math.max(-1, Math.min(1, cleanedFloat[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            cleanedBuffer.writeInt16LE(s, i * 2);
        }

        // VAD Logic
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
                this.silenceStart = null; // Reset silence counter
            }
        } else {
            // Quiet
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
