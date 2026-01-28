import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Activity, Terminal, Zap, Clock, Cpu, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from './hooks/useSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useAudioPlayer } from './hooks/useAudioPlayer';

const Orb = ({ state }) => {
    const isSpeaking = state === 'speaking';
    const isListening = state === 'listening';

    return (
        <div className="relative flex items-center justify-center w-64 h-64">
            {/* Outer Glow */}
            <motion.div
                animate={{
                    scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.1, 1] : 1,
                    opacity: isSpeaking ? 0.8 : 0.3
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-3xl ${isSpeaking ? 'bg-purple-600' : isListening ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
            />

            {/* Core Orb */}
            <motion.div
                animate={{
                    scale: isSpeaking ? [1, 1.05, 1] : 1,
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className={`relative z-10 w-40 h-40 rounded-full shadow-2xl backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden
          ${isSpeaking ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                        isListening ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
                            'bg-gradient-to-br from-slate-700 to-slate-900'}
        `}
            >
                {state === 'idle' && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />}

                <AnimatePresence mode="wait">
                    {state === 'listening' ? (
                        <motion.div
                            key="listening"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                        >
                            <Mic className="text-white w-12 h-12 drop-shadow-lg" />
                        </motion.div>
                    ) : state === 'speaking' ? (
                        <motion.div
                            key="speaking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-1"
                        >
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [10, 40, 10] }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                        ease: "easeInOut"
                                    }}
                                    className="w-2 bg-white rounded-full shadow-[0_0_10px_white]"
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Rings */}
            {isListening && (
                <>
                    <motion.div
                        initial={{ opacity: 0, scale: 1 }}
                        animate={{ opacity: [0, 0.5, 0], scale: 1.5 }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                        className="absolute inset-0 rounded-full border border-emerald-500/50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 1 }}
                        animate={{ opacity: [0, 0.5, 0], scale: 1.5 }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        className="absolute inset-0 rounded-full border border-emerald-500/30"
                    />
                </>
            )}
        </div>
    );
};

function App() {
    const { socket, isConnected, messages, metrics, sessionId } = useSocket();
    const { isRecording, startRecording, stopRecording } = useAudioRecorder(socket);
    const { isPlaying: isSpeaking } = useAudioPlayer(socket);
    const [showMetrics, setShowMetrics] = useState(true);

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    let visualState = 'idle';
    if (isSpeaking) visualState = 'speaking';
    else if (isRecording) visualState = 'listening';

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-slate-100 font-sans selection:bg-purple-500/30 overflow-hidden flex flex-col relative">

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className="p-6 flex justify-between items-center z-50 relative">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Zap size={16} className="text-white" fill="currentColor" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Vaani
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-500 animate-pulse'}`} />
                        <span className="text-slate-400">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <button
                        onClick={() => setShowMetrics(!showMetrics)}
                        className={`p-2 rounded-full transition-colors ${showMetrics ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                    >
                        <Activity size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">

                {/* Orb Container */}
                <div className="mb-12 scale-125">
                    <Orb state={visualState} />
                </div>

                {/* Transcripts (Subtitle Style) */}
                <div className="w-full max-w-2xl h-[30vh] overflow-y-auto mb-8 mask-fade-top scrollbar-hide space-y-4 px-4">
                    <AnimatePresence initial={false}>
                        {messages.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                            max-w-[80%] p-4 rounded-2xl backdrop-blur-sm 
                            ${m.role === 'user'
                                        ? 'bg-white/5 border border-white/10 text-right'
                                        : 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/5'}
                         `}>
                                    <p className={`text-lg font-light leading-relaxed ${m.isPartial ? 'opacity-60' : 'opacity-90'}`}>
                                        {m.content}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                </div>

                {/* Hint Text */}
                <div className="h-6 mb-8 text-center">
                    <AnimatePresence mode="wait">
                        {visualState === 'listening' ? (
                            <motion.p
                                key="listening"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-emerald-400/80 text-sm font-light tracking-widest uppercase"
                            >
                                Listening...
                            </motion.p>
                        ) : visualState === 'speaking' ? (
                            <motion.p
                                key="speaking"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-purple-400/80 text-sm font-light tracking-widest uppercase"
                            >
                                Answering...
                            </motion.p>
                        ) : (
                            <motion.p
                                key="idle"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-slate-500 text-sm font-light"
                            >
                                Tap the microphone to speak
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Main Control */}
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`
                group relative px-8 py-4 rounded-full flex items-center gap-4 transition-all duration-300
                ${isRecording
                            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 px-10'
                            : 'bg-white text-black hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]'}
             `}
                >
                    {isRecording ? (
                        <>
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="font-bold tracking-wide">STOP SESSION</span>
                        </>
                    ) : (
                        <>
                            <Mic className="group-hover:scale-110 transition-transform" />
                            <span className="font-bold tracking-wide">START CONVERSATION</span>
                        </>
                    )}
                </button>

            </main>

            {/* Metrics Overlay (Floating Panel) */}
            <AnimatePresence>
                {showMetrics && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="absolute right-0 top-20 bottom-0 w-80 bg-black/40 backdrop-blur-xl border-l border-white/5 p-6 z-40"
                    >
                        <div className="flex items-center gap-2 mb-6 text-slate-400 text-xs font-bold tracking-wider uppercase">
                            <Activity size={14} /> System Performance
                        </div>

                        <div className="space-y-4">
                            {metrics.slice().reverse().map((m, i) => (
                                <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-mono text-slate-500">TURN #{metrics.length - i}</span>
                                        <span className="text-[10px] text-slate-600 font-mono">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded bg-black/20">
                                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-1">
                                                <Cpu size={10} /> LLM
                                            </div>
                                            <div className="text-emerald-400 font-mono text-sm">{m.llmLatency}ms</div>
                                        </div>
                                        <div className="p-2 rounded bg-black/20">
                                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-1">
                                                <MessageSquare size={10} /> TTS
                                            </div>
                                            <div className="text-blue-400 font-mono text-sm">{m.ttsLatency}ms</div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Clock size={10} /> LATENCY
                                        </span>
                                        <span className="text-purple-400 font-bold font-mono text-sm">{m.e2eLatency}ms</span>
                                    </div>
                                </div>
                            ))}
                            {metrics.length === 0 && (
                                <div className="text-center py-10 text-slate-700 text-sm">
                                    Ready to measure...
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
