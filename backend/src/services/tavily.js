import logger from '../utils/logger.js';

export const searchWeb = async (query) => {
    try {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            logger.warn('No TAVILY_API_KEY found');
            return null;
        }

        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'basic',
                include_answer: true,
                max_results: 3
            })
        });

        if (!response.ok) {
            throw new Error(`Tavily error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            answer: data.answer,
            results: data.results.map(r => ({ title: r.title, url: r.url, content: r.content }))
        };
    } catch (error) {
        logger.error({ err: error }, 'Tavily Search Failed');
        return null;
    }
};
