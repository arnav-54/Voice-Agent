import Groq from 'groq-sdk';
import { searchWeb } from './tavily.js';
import logger from '../utils/logger.js';

let groq = null;

export const initGroq = () => {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
};


const SYSTEM_PROMPT = `You are a helpful, fast, and real-time voice assistant. 
Your answers should be concise and conversational. 
If you need current or external information, use the 'search_web' tool IMMEDIATELY. 
DO NOT ask for permission to search and DO NOT tell the user you are about to search. Just provide the answer using the tool results.
Always speak in a way that is easy to listen to (avoid markdown tables or long lists).`;

const responseCache = new Map();

export const getLLMResponse = async (messages, signal) => {
    if (!groq) initGroq();
    if (!groq) throw new Error("Groq not initialized");


    const lastUserMessage = messages[messages.length - 1]?.content;
    if (lastUserMessage && responseCache.has(lastUserMessage)) {
        logger.info({ query: lastUserMessage }, 'Cache hit for LLM response');
        return responseCache.get(lastUserMessage);
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
                { role: 'system', content: SYSTEM_PROMPT },
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
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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
                { role: 'system', content: SYSTEM_PROMPT },
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
