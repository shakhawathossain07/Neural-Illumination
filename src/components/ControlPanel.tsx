import React, { useRef, useEffect } from 'react';
import type { SimulationLog } from '../types/Character';

interface ControlPanelProps {
    logs: SimulationLog[];
    isPlaying: boolean;
    onTogglePlay: () => void;
    context: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ logs, isPlaying, onTogglePlay, context }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-[#18181b] border-l border-white/10 w-80 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#27272a]">
                <h2 className="text-sm font-bold tracking-wider text-gray-400 uppercase">Control Room</h2>
                <div className="mt-2 text-xs text-gray-500 font-mono truncate" title={context}>
                    CTX: {context}
                </div>
            </div>

            {/* Logs Area */}
            <div className="flex-1 overflow-hidden relative">
                <div
                    ref={logContainerRef}
                    className="absolute inset-0 overflow-y-auto p-4 space-y-3 font-mono text-sm"
                >
                    {logs.length === 0 && (
                        <div className="text-gray-600 text-center mt-10 italic">
                            Simulation ready. Initialize to start logging.
                        </div>
                    )}
                    {logs.map((log) => (
                        <div key={log.id} className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-gray-600">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${log.type === 'action' ? 'bg-blue-900/30 text-blue-400' :
                                    log.type === 'dialogue' ? 'bg-green-900/30 text-green-400' :
                                        'bg-gray-800 text-gray-300'
                                    }`}>
                                    {log.characterId}
                                </span>
                            </div>
                            <div className="pl-4 border-l-2 border-white/5 text-gray-300">
                                {log.message}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Area */}
            <div className="p-4 border-t border-white/10 bg-[#27272a]">
                <button
                    onClick={onTogglePlay}
                    className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg ${isPlaying
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50'
                        : 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/25'
                        }`}
                >
                    {isPlaying ? 'TERMINATE SIMULATION' : 'INITIALIZE SIMULATION'}
                </button>
            </div>
        </div>
    );
};
