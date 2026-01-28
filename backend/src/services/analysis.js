import logger from '../utils/logger.js';

export const analyzeAudioQuality = (buffer) => {
    try {
        // Convert buffer to float32 for analysis
        const samples = Math.floor(buffer.length / 2);
        let sum = 0;
        let peak = 0;

        for (let i = 0; i < samples; i++) {
            const int16 = buffer.readInt16LE(i * 2);
            const sample = Math.abs(int16 / 32768.0);
            sum += sample * sample;
            if (sample > peak) peak = sample;
        }

        const rms = Math.sqrt(sum / samples);

        // Estimate Signal-to-Noise Ratio (Simulated)
        // In a real system, we'd compare voice vs silence noise floor
        const snr = rms > 0 ? 20 * Math.log10(peak / (rms + 0.0001)) : 0;

        return {
            rms: parseFloat(rms.toFixed(4)),
            peak: parseFloat(peak.toFixed(4)),
            snr: parseFloat(snr.toFixed(2)),
            qualityScore: rms > 0.01 ? 'Excellent' : rms > 0.005 ? 'Good' : 'Weak'
        };
    } catch (e) {
        logger.error({ err: e }, 'Audio Analysis Failed');
        return null;
    }
};
