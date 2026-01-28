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
    const [showMetrics, setShowMetrics] = useState(false);

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
            <header className="p-4 md:p-6 flex justify-between items-center z-50 relative">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Zap size={14} className="text-white md:hidden" fill="currentColor" />
                        <Zap size={16} className="text-white hidden md:block" fill="currentColor" />
                    </div>
                    <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Vaani
                    </h1>
                </div>
                <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-mono">
                    <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                        <div className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-500 animate-pulse'}`} />
                        <span className="text-slate-400">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    <button
                        onClick={() => setShowMetrics(!showMetrics)}
                        className={`p-1.5 md:p-2 rounded-full transition-colors ${showMetrics ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                    >
                        <Activity size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-4 md:p-6">

                {/* Orb Container */}
                <div className="mb-8 md:mb-12 scale-100 md:scale-125 transition-transform duration-500">
                    <Orb state={visualState} />
                </div>

                {/* Transcripts (Subtitle Style) */}
                <div className="w-full max-w-2xl h-[35vh] md:h-[30vh] overflow-y-auto mb-6 md:mb-8 mask-fade-top scrollbar-hide space-y-4 px-2 md:px-4">
                    <AnimatePresence initial={false}>
                        {messages.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-10"
                            >
                                <p className="text-slate-500 font-light text-sm italic">"Try asking: What's the latest tech news?"</p>
                            </motion.div>
                        ) : (
                            messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`
                                max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-xl md:rounded-2xl backdrop-blur-sm 
                                ${m.role === 'user'
                                            ? 'bg-white/5 border border-white/10 text-right'
                                            : 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/5'}
                             `}>
                                        <p className={`text-base md:text-lg font-light leading-relaxed ${m.isPartial ? 'opacity-60' : 'opacity-90'}`}>
                                            {m.content}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                </div>

                {/* Hint Text */}
                <div className="h-6 mb-6 md:mb-8 text-center px-4">
                    <AnimatePresence mode="wait">
                        {visualState === 'listening' ? (
                            <motion.p
                                key="listening"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-emerald-400/80 text-xs md:text-sm font-light tracking-widest uppercase"
                            >
                                Listening...
                            </motion.p>
                        ) : visualState === 'speaking' ? (
                            <motion.p
                                key="speaking"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-purple-400/80 text-xs md:text-sm font-light tracking-widest uppercase"
                            >
                                Answering...
                            </motion.p>
                        ) : (
                            <motion.p
                                key="idle"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-slate-500 text-xs md:text-sm font-light"
                            >
                                Tap the button to start talking
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Main Control */}
                <div className="w-full max-w-xs md:max-w-none flex justify-center pb-8 md:pb-0">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`
                    group relative w-full md:w-auto px-6 md:px-10 py-4 md:py-4 rounded-2xl md:rounded-full flex items-center justify-center gap-4 transition-all duration-300
                    ${isRecording
                                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                                : 'bg-white text-black hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]'}
                 `}
                    >
                        {isRecording ? (
                            <>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span className="font-bold tracking-wide text-sm md:text-base">STOP SESSION</span>
                            </>
                        ) : (
                            <>
                                <Mic size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="font-bold tracking-wide text-sm md:text-base">START CONVERSATION</span>
                            </>
                        )}
                    </button>
                </div>

            </main>

            {/* Metrics Overlay (Floating Panel) */}
            <AnimatePresence>
                {showMetrics && (
                    <>
                        {/* Mobile Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMetrics(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full xs:w-80 md:w-80 bg-black/80 md:bg-black/40 backdrop-blur-2xl border-l border-white/5 p-6 z-50 overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8 md:mb-6">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-wider uppercase">
                                    <Activity size={14} /> System Metrics
                                </div>
                                <button
                                    onClick={() => setShowMetrics(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <span className="text-slate-400 text-lg">&times;</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {metrics.slice().reverse().map((m, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-mono text-slate-500 font-bold">TURN #{metrics.length - i}</span>
                                            <span className="text-[10px] text-slate-600 font-mono">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2.5 rounded-lg bg-black/40">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-[9px] mb-1 font-bold uppercase tracking-tighter">
                                                    <Cpu size={10} /> LLM
                                                </div>
                                                <div className="text-emerald-400 font-mono text-sm">{m.llmLatency}ms</div>
                                            </div>
                                            <div className="p-2.5 rounded-lg bg-black/40">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-[9px] mb-1 font-bold uppercase tracking-tighter">
                                                    <MessageSquare size={10} /> TTS
                                                </div>
                                                <div className="text-blue-400 font-mono text-sm">{m.ttsLatency}ms</div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 pt-2.5 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                                                <Clock size={10} /> E2E LATENCY
                                            </span>
                                            <span className="text-purple-400 font-bold font-mono text-sm">{m.e2eLatency}ms</span>
                                        </div>
                                    </div>
                                ))}
                                {metrics.length === 0 && (
                                    <div className="text-center py-20 text-slate-700 text-sm">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                            <Activity size={24} />
                                        </div>
                                        Waiting for performance data...
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
