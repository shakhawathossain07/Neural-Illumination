import React from 'react';
import type { Character } from '../types/Character';

interface GameCanvasProps {
    characters: Character[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ characters }) => {
    return (
        <div className="relative w-full h-full bg-[#111] overflow-hidden rounded-xl border border-white/10 shadow-inner">
            {/* Grid Background */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Characters */}
            {characters.map((char) => (
                <div
                    key={char.id}
                    className="absolute flex flex-col items-center transition-all duration-1000 ease-in-out"
                    style={{
                        left: `${char.position.x}%`,
                        top: `${char.position.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {/* Avatar Node */}
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-offset-2 ring-offset-black"
                        style={{
                            backgroundColor: char.color,
                            boxShadow: `0 0 15px ${char.color}`
                        }}
                    >
                        {char.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Status Label */}
                    <div className="mt-2 text-xs px-2 py-1 bg-black/60 backdrop-blur rounded text-white whitespace-nowrap">
                        {char.status}
                    </div>

                    {/* Chat Bubble if recently active */}
                    {char.currentAction && (
                        <div className="absolute bottom-14 bg-white text-black text-xs px-3 py-2 rounded-lg rounded-bl-none shadow-xl max-w-[200px] animate-in fade-in slide-in-from-bottom-2">
                            {char.currentAction}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
