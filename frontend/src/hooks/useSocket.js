import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        const url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const storedSessionId = localStorage.getItem('voice_agent_session_id');

        const s = io(url, {
            query: { sessionId: storedSessionId }
        });

        s.on('connect', () => {
            setIsConnected(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                s.emit('ping');
            }, 5000);
        });

        s.on('disconnect', () => {
            setIsConnected(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        });

        s.on('session:init', ({ sessionId, history }) => {
            setSessionId(sessionId);
            localStorage.setItem('voice_agent_session_id', sessionId);
            if (history && history.length > 0) {
                setMessages(history
                    .filter(m => m.role !== 'tool')
                    .map(m => ({
                        role: m.role,
                        content: m.content,
                        isPartial: false
                    })));
            }
            console.log('Session initialized:', sessionId, 'History size:', history?.length || 0);
        });

        s.on('transcript:partial', ({ text }) => {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user' && last.isPartial) {
                    return [...prev.slice(0, -1), { role: 'user', content: text, isPartial: true }];
                }
                return [...prev, { role: 'user', content: text, isPartial: true }];
            });
        });

        s.on('transcript:final', ({ text }) => {
            const cleanText = text.replace(/<function=.*?<\/function>/gs, '').trim();
            if (!cleanText) return;

            setMessages(prev => {
                const filtered = prev.filter(m => !(m.role === 'user' && m.isPartial));
                return [...filtered, { role: 'user', content: cleanText, isPartial: false }];
            });
        });

        s.on('assistant:text', ({ text }) => {
            const cleanText = text.replace(/<function=.*?<\/function>/gs, '').trim();
            if (!cleanText) return;
            setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);
        });

        s.on('assistant:audio', (payload) => {
            // Handle binary audio format if needed, but App.jsx uses useAudioPlayer separately
        });

        s.on('metrics:turn', (data) => {
            setMetrics(prev => [...prev, { ...data, timestamp: new Date().toISOString() }]);
        });

        setSocket(s);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            s.disconnect();
        };
    }, []);

    const clearMessages = () => {
        if (socket) socket.emit('session:clear');
        setMessages([]);
    };

    return { socket, isConnected, messages, metrics, sessionId, clearMessages };
};
