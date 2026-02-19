export type CharacterStatus = 'idle' | 'talking' | 'moving' | 'thinking';

export interface Position {
    x: number;
    y: number;
}

export interface Character {
    id: string;
    name: string;
    personality: string;
    role: string;
    color: string;
    position: Position;
    status: CharacterStatus;
    currentAction?: string;
    history: string[]; // Recent conversation/action history
    avatarUrl?: string; // Optional URL for visual representation
}

export interface SimulationLog {
    id: string;
    timestamp: number;
    characterId: string;
    message: string;
    type: 'action' | 'dialogue' | 'system';
}
