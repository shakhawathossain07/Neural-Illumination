import { useState, useCallback, useRef, useEffect } from 'react';
import type { Character, SimulationLog } from '../types/Character';
import { generateCharacterAction } from '../services/gemini';
// Removed uuid import

export const useSimulation = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [logs, setLogs] = useState<SimulationLog[]>([]);
    const [characters, setCharacters] = useState<Character[]>([
        {
            id: 'char1',
            name: 'Atlas',
            role: 'Station Commander',
            personality: 'Stoic, decisive, protective. Speaks in short, authoritative sentences.',
            color: '#3b82f6', // Blue
            position: { x: 50, y: 50 },
            status: 'idle',
            history: []
        },
        {
            id: 'char2',
            name: 'Luna',
            role: 'AI Learning Companion',
            personality: 'Encouraging, patient, knowledgeable. Dedicated to revolutionizing education through interactive guidance.',
            color: '#8b5cf6', // Violet
            position: { x: 30, y: 40 },
            status: 'idle',
            history: []
        }
    ]);
    const [context] = useState("Futuristic Learning Hub. A simulation designed to change how we learn.");

    const isProcessingRef = useRef(false);
    const charactersRef = useRef(characters);
    const logsRef = useRef(logs);
    const contextRef = useRef(context);

    // Keep refs updated
    useEffect(() => {
        charactersRef.current = characters;
        logsRef.current = logs;
        contextRef.current = context;
    }, [characters, logs, context]);

    const addLog = (type: SimulationLog['type'], characterId: string, message: string) => {
        const newLog: SimulationLog = {
            id: Date.now().toString() + Math.random(),
            timestamp: Date.now(),
            characterId,
            type,
            message
        };
        setLogs(prev => [...prev, newLog]);
    };

    const stepSimulation = useCallback(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // Filter for AI characters only (Luna) - Atlas is player controlled
        const aiCharacters = charactersRef.current.filter(c => c.name !== 'Atlas');
        if (aiCharacters.length === 0) {
            isProcessingRef.current = false;
            return;
        }

        const activeChar = aiCharacters[Math.floor(Math.random() * aiCharacters.length)];

        try {
            const decision = await generateCharacterAction(
                activeChar,
                charactersRef.current, // Pass all characters for context
                contextRef.current,
                logsRef.current
            );

            // Update Logs
            if (decision.dialogue) {
                addLog('dialogue', activeChar.id, decision.dialogue);
            }
            if (decision.action) {
                addLog('action', activeChar.id, decision.action);
            }

            // Update Character State
            setCharacters(prev => prev.map(c => {
                if (c.id === activeChar.id) {
                    return {
                        ...c,
                        position: decision.newPosition || c.position,
                        currentAction: decision.action
                    };
                }
                return c;
            }));

        } catch (e) {
            console.error("Simulation step failed", e);
        } finally {
            isProcessingRef.current = false;
        }

    }, []); // No dependencies - use refs instead!

    // Game Loop
    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                stepSimulation();
            }, 2000); // Run every 2 seconds for faster response
        }
        return () => clearInterval(interval);
    }, [isPlaying, stepSimulation]);

    return {
        isPlaying,
        setIsPlaying,
        logs,
        characters,
        stepSimulation,
        setCharacters,
        context,
        addLog // Exported so Voice Interface can inject commands
    };
};
