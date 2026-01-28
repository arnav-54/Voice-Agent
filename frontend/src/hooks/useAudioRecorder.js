import { useRef, useState, useCallback } from 'react';

export const useAudioRecorder = (socket) => {
    const [isRecording, setIsRecording] = useState(false);
    const audioContextRef = useRef(null);
    const sourceRef = useRef(null);
    const workletNodeRef = useRef(null);

    const startRecording = useCallback(async () => {
        if (!socket) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

            await audioContextRef.current.audioWorklet.addModule('/processor.js');

            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');

            workletNodeRef.current.port.onmessage = (event) => {
                const float32Data = event.data;

                const int16Buffer = new Int16Array(float32Data.length);
                for (let i = 0; i < float32Data.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32Data[i]));
                    int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                socket.emit('audiochunk', int16Buffer.buffer);
            };

            sourceRef.current.connect(workletNodeRef.current);
            workletNodeRef.current.connect(audioContextRef.current.destination);

            setIsRecording(true);
            socket.emit('session:start');
        } catch (err) {
            console.error("Microphone access failed:", err);
        }
    }, [socket]);

    const stopRecording = useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        }
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (socket) {
            socket.emit('session:stop');
        }
        setIsRecording(false);
    }, [socket]);

    return { isRecording, startRecording, stopRecording };
};
