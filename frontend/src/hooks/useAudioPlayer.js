import { useRef, useEffect, useState } from 'react';

export const useAudioPlayer = (socket) => {
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const initContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('assistant:audio', async ({ audio }) => {
            const ctx = initContext();
            try {
                const buffer = await ctx.decodeAudioData(audio);
                audioQueueRef.current.push(buffer);
                playQueue();
            } catch (e) {
                console.error("Decode error", e);
            }
        });

        socket.on('barge_in', () => {
            stopAll();
        });

        return () => {
            stopAll();
            // Do not close the context here, as it might be needed if component remounts immediately
            // or if we want to reuse the same context.
        };
    }, [socket]);

    const playQueue = async () => {
        const ctx = initContext();
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

        isPlayingRef.current = true;
        setIsPlaying(true);

        const buffer = audioQueueRef.current.shift();

        if (ctx.state === 'closed') {
            // Try to re-init or just abort
            audioContextRef.current = null;
            initContext();
            return;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        source.onended = () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
            playQueue();
        };

        ctx.activeSource = source;
        source.start(0);
    };

    const stopAll = () => {
        audioQueueRef.current = [];
        if (audioContextRef.current?.activeSource) {
            try {
                audioContextRef.current.activeSource.stop();
                audioContextRef.current.activeSource = null;
            } catch (e) { }
        }
        isPlayingRef.current = false;
        setIsPlaying(false);
    };

    return { isPlaying };
};
