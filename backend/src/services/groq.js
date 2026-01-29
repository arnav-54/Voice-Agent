import Groq from 'groq-sdk';
import { searchWeb } from './tavily.js';
import { calculateSimilarity } from './similarity.js';
import logger from '../utils/logger.js';

let groq = null;

export const initGroq = () => {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
};


const getSystemPrompt = () => `Your name is Vaani. You are a helpful, fast, and real-time voice assistant.
Current Date: ${new Date().toLocaleDateString()}
Your answers should be concise and conversational.
If the user asks about ANY current events, news, sports results (like T20 World Cup), or specific factual data, you MUST use the 'search_web' tool.
Even if you think you know the answer, use the search tool to verify.
IMPORTANT:
1. NEVER output the raw tool call JSON or "function=search_web" text in your final response.
2. DO NOT say "I will search for that". Just do it silently.
3. If you receive tool results, summarize them naturally in 1-2 sentences.
4. Always speak in a way that is easy to listen to (avoid markdown tables or long lists).`;

const responseCache = new Map();

export const getLLMResponse = async (messages, signal) => {
    if (!groq) initGroq();
    if (!groq) throw new Error("Groq not initialized");


    const lastUserMessage = messages[messages.length - 1]?.content;

    if (lastUserMessage) {
        // Semantic Cache Check
        for (const [cachedQuery, cachedResponse] of responseCache.entries()) {
            const similarity = calculateSimilarity(lastUserMessage, cachedQuery);
            if (similarity > 0.85) { // 85% similarity threshold
                logger.info({ query: lastUserMessage, match: cachedQuery, similarity: similarity.toFixed(2) }, 'Semantic Cache Hit');
                return cachedResponse;
            }
        }
    }

    const tools = [
        {
            type: "function",
            function: {
                name: "search_web",
                description: "Search the internet for current information",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query" }
                    },
                    required: ["query"]
                }
            }
        }
    ];

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: getSystemPrompt() },
                ...messages
            ],
            model: "llama-3.1-8b-instant",
            tools,
            tool_choice: "auto",
            max_tokens: 1024,
        }, { signal });

        const msg = completion.choices[0].message;


        if (msg.tool_calls) {
            const toolCall = msg.tool_calls[0];
            if (toolCall.function.name === 'search_web') {
                const args = JSON.parse(toolCall.function.arguments);
                logger.info({ query: args.query }, 'Executing Web Search');
                const searchResult = await searchWeb(args.query);


                const newMessages = [
                    ...messages,
                    msg,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(searchResult)
                    }
                ];


                return await getLLMResponse(newMessages, signal);
            }
        }


        const textToolMatch = msg.content?.match(/<function=(\w+)>(.*?)<\/function>/s);
        if (textToolMatch) {
            const fnName = textToolMatch[1];
            const argsJson = textToolMatch[2];

            if (fnName === 'search_web') {
                logger.warn({ content: msg.content }, 'Intercepted hallucinated text tool call');
                try {
                    const args = JSON.parse(argsJson);
                    const searchResult = await searchWeb(args.query);

                    // Fabricate a proper tool call sequence to recover gracefully
                    const fakeToolCallId = "call_" + Math.random().toString(36).substr(2, 9);

                    const assistantMsg = {
                        role: 'assistant',
                        content: null, // We discard the "Let me try..." text
                        tool_calls: [{
                            id: fakeToolCallId,
                            type: 'function',
                            function: { name: 'search_web', arguments: argsJson }
                        }]
                    };

                    const newMessages = [
                        ...messages,
                        assistantMsg,
                        {
                            role: 'tool',
                            tool_call_id: fakeToolCallId,
                            content: JSON.stringify(searchResult)
                        }
                    ];

                    return await getLLMResponse(newMessages, signal);

                } catch (e) {
                    logger.error({ err: e }, 'Failed to parse text tool call');
                }
            }
        }

        if (lastUserMessage && msg.content) {
            responseCache.set(lastUserMessage, msg.content);
        }
        return msg.content;
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.info('Groq request aborted');
            return "";
        }


        logger.warn({ err: error }, 'Groq Primary model failed, attempting fallback to Llama 8b...');
        try {
            const fallback = await groq.chat.completions.create({
                messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
                model: "llama3-8b-8192",
                max_tokens: 512,
            }, { signal });
            return fallback.choices[0].message.content;
        } catch (fallbackError) {
            logger.error({ err: fallbackError }, 'Groq Fallback also failed');
            return "I'm having trouble thinking right now.";
        }
    }
};

export const streamLLMResponse = async (messages, onToken) => {
    if (!groq) initGroq();



    try {
        const stream = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: getSystemPrompt() },
                ...messages
            ],
            model: "llama3-70b-8192",
            stream: true,
        });

        let fullContent = "";

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
                fullContent += delta;
                onToken(delta);
            }
        }
        return fullContent;
    } catch (e) {
        logger.error(e);
        return "";
    }
};
