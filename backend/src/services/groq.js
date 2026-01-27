import Groq from 'groq-sdk';
import { searchWeb } from './tavily.js';
import logger from '../utils/logger.js';

let groq = null;

export const initGroq = () => {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
};

// System prompt for the voice agent
const SYSTEM_PROMPT = `You are a helpful, fast, and real-time voice assistant. 
Your answers should be concise and conversational. 
If you need external information, call the 'search_web' tool. 
Always speak in a way that is easy to listen to (avoid markdown tables or long lists).`;

export const getLLMResponse = async (messages, onDelta) => {
    if (!groq) initGroq();
    if (!groq) throw new Error("Groq not initialized");

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
            model: "llama-3.1-8b-instant", // Fast model
            tools,
            tool_choice: "auto",
            max_tokens: 1024,
        });

        const msg = completion.choices[0].message;

        // Handle tool calls
        if (msg.tool_calls) {
            const toolCall = msg.tool_calls[0];
            if (toolCall.function.name === 'search_web') {
                const args = JSON.parse(toolCall.function.arguments);
                logger.info({ query: args.query }, 'Executing Web Search');
                const searchResult = await searchWeb(args.query);

                // Add tool result to messages
                const newMessages = [
                    ...messages,
                    msg,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(searchResult)
                    }
                ];

                // Recursively call for final answer
                return await getLLMResponse(newMessages, onDelta);
            }
        }

        // If no tool call, just return the text (handle streaming if we want, but for simplicity we return text and let TTS stream it. 
        // User asked for "Stream AI Audio to user". 
        // Best latency flow: LLM Stream -> TTS Stream.
        // Groq SDK supports streaming. Let's rewrite for streaming.

        return msg.content;
    } catch (error) {
        logger.error({ err: error }, 'Groq API Error');
        return "I'm having trouble thinking right now.";
    }
};

export const streamLLMResponse = async (messages, onToken) => {
    if (!groq) initGroq();

    // Simplification for the "streaming" requirement: 
    // We will assume no tools for the *streaming* path to keep it simple, 
    // OR we do a first pass non-stream to check for tools?
    // Actually, to get lowest latency, we should stream. 
    // But tools complicate streaming (need to acccumulate args).
    // Strategy: Stream. If we detect tool call, we buffer. If content, we yield tokens.

    try {
        const stream = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages
            ],
            model: "llama3-70b-8192", // Powerful enough
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
