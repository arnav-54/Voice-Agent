
// Basic implementation of Cosine Similarity using Bag of Words (Term Frequency)
// This avoids heavy dependencies like TensorFlow.js but provides much better fuzzy matching than exact string match.

export const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const tokenize = (text) => {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(w => w.length > 0);
    };

    const tokens1 = tokenize(str1);
    const tokens2 = tokenize(str2);

    const uniqueTokens = new Set([...tokens1, ...tokens2]);
    const vector1 = Array.from(uniqueTokens).map(token => tokens1.filter(t => t === token).length);
    const vector2 = Array.from(uniqueTokens).map(token => tokens2.filter(t => t === token).length);

    // Cosine Similarity Formula: (A . B) / (||A|| * ||B||)
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vector1.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        mag1 += vector1[i] * vector1[i];
        mag2 += vector2[i] * vector2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;

    return dotProduct / (mag1 * mag2);
};
