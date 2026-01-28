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
        const s = io(url);

        s.on('connect', () => {
            setIsConnected(true);
            // Clear existing interval to prevent overlapping timers
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

        s.on('session:init', ({ sessionId }) => {
            setSessionId(sessionId);
            console.log('Session ID:', sessionId);
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
            setMessages(prev => {
                const filtered = prev.filter(m => !(m.role === 'user' && m.isPartial));
                return [...filtered, { role: 'user', content: text, isPartial: false }];
            });
        });

        s.on('assistant:text', ({ text }) => {
            setMessages(prev => [...prev, { role: 'assistant', content: text }]);
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

    return { socket, isConnected, messages, metrics, sessionId };
};
