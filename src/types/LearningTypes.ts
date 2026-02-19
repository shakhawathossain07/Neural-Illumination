export interface Challenge {
    id: string;
    title: string;
    description: string;
    starterCode: string;
    difficulty: number; // 1-10 scale
    expectedOutputPattern?: string; // Regex or keyword match
    hints: string[];
}

export interface EvaluationResult {
    passed: boolean;
    feedback: string;
    scoreAdjustment: number;
    nextDifficulty?: number;
}

export const TutorMode = {
    OFF: 'OFF',
    LEARNING: 'LEARNING'
} as const;

export type TutorMode = typeof TutorMode[keyof typeof TutorMode];

