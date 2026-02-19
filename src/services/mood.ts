import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-3.1-pro-preview";

export interface MoodResult {
    mood: string;
    suggestedEnvironment: 'cyber' | 'nature' | 'desert' | 'rainforest' | 'iceland';
    reasoning: string;
}

export class MoodService {
    private model: ReturnType<typeof genAI.getGenerativeModel>;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
    }

    async analyzeMood(videoElement: HTMLVideoElement): Promise<MoodResult | null> {
        try {
            console.log("📸 Capturing frame for Mood analysis...");

            // Create canvas for capture
            const canvas = document.createElement('canvas');
            const maxWidth = 320;
            const scale = maxWidth / videoElement.videoWidth;
            canvas.width = maxWidth;
            canvas.height = videoElement.videoHeight * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            // Draw frame
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to Base64
            const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

            const prompt = `
            You are an empathetic AI Environment Controller.
            Analyze the user's visual mood/expression from this webcam frame.

            Map their detected mood to one of these environments:
            - CYBER: Energetic, focused, intense, tech-savvy.
            - NATURE: Happy, calm, relaxed, smiling.
            - DESERT: Neutral, serious, contemplative, warm.
            - RAINFOREST: Mysterious, pensive, deep thought.
            - ICELAND: Cool, calm, collected, professional or stressed (seeking calm).

            Output STRICT JSON:
            {
                "mood": "string (e.g. Happy, Focused)",
                "suggestedEnvironment": "cyber" | "nature" | "desert" | "rainforest" | "iceland",
                "reasoning": "Short valid sentence explaining why to the user."
            }
            `;

            const result = await this.model.generateContent([
                prompt,
                { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
            ]);

            const text = result.response.text();
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            const data = JSON.parse(cleanText) as MoodResult;

            return data;

        } catch (error) {
            console.error("Mood Analysis Failed:", error);
            return null;
        }
    }
}

export const moodService = new MoodService();
