
/**
 * Improves turn detection by checking for linguistic markers of completeness.
 * @param {string} text - The transcript text to check.
 * @returns {boolean} - True if the turn seems complete, false if it looks like a pause.
 */
export const isTurnComplete = (text) => {
    if (!text || text.trim().length === 0) return false;
    const t = text.trim();

    // 1. Check for strong punctuation
    const hasPunctuation = /[.!?]$/.test(t);

    // 2. Check for "connector" words at the end (indicates continuation)
    // "I think that..." "because..." "and..."
    const continuationWords = /\b(and|or|but|because|so|if|then|when|which|that)\s*[.,]?$/i;
    const endsWithContinuation = continuationWords.test(t);

    if (endsWithContinuation) return false; // Definitely incomplete
    if (hasPunctuation) return true;        // Definitely complete

    // 3. Length heuristic: Very short utterances without punctuation are likely partials
    // "hello" -> complete
    // "the main thing" -> incomplete
    const wordCount = t.split(/\s+/).length;
    if (wordCount < 2) return true; // Single word commands "Stop", "Yes"

    // Default: Assume complete if it's substantial, but stricter than simple VAD
    return true;
};
