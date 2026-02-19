import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Character, SimulationLog } from "../types/Character";

// Used provided key for immediate functionality
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

if (!API_KEY) {
    console.warn("Missing GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Fallback responses for when the API is unreachable (Offline Mode)
const FALLBACK_RESPONSES = [
    "I'm detecting interference in the sub-space transceiver. My higher cognitive functions are offline, but I can still hear you.",
    "Connection to the external neural network is unstable. I am running on local heuristic algorithms for now.",
    "I can't access the main databanks right now, Commander. Restoring local backup communication protocols.",
    "My connection to the Gemini cluster is severed. Switching to autonomous local mode.",
    "I hear you, but I cannot process complex queries without server access. Analyzing local telemetry only."
];

export const chatWithLuna = async (userMessage: string, context: string): Promise<string> => {
    try {
        // Using Gemini 3.1 Pro Preview
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

        const prompt = `
        You are Luna, an advanced AI Learning Companion in a futuristic learning hub.
        Personality: Encouraging, patient, knowledgeable, helpful.
        Current Context: ${context}
        
        User Input: "${userMessage}"
        
        Respond naturally as Luna. Keep it relatively brief (1-2 sentences).
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error: any) {
        console.warn("Gemini API Failed, switching to fallback:", error);
        // Return a random fallback response to keep the experience alive
        return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    }
};


export const generateCharacterAction = async (
    character: Character,
    allCharacters: Character[], // Added to provide spatial awareness
    context: string,
    recentLogs: SimulationLog[]
): Promise<{ action: string; dialogue: string; newPosition?: { x: number, y: number } }> => {

    if (!API_KEY) {
        return {
            action: "waits",
            dialogue: "...",
        };
    }

    // spatial context
    const othersInfo = allCharacters
        .filter(c => c.id !== character.id)
        .map(c => `${c.name} (${c.role}) is at pos [${Math.round(c.position.x)}, ${Math.round(c.position.y)}]`)
        .join(', ');

    // DEFINED POINTS OF INTEREST (POIs) in the CyberRoom
    const POIs = [
        { name: "Neural Engine Screen", x: -8, y: -4 },
        { name: "Graphics Core Screen", x: 8, y: -4 },
        { name: "Server Cluster Alpha", x: -20, y: -5 },
        { name: "Server Cluster Beta", x: 20, y: -5 },
        { name: "Central Command", x: 0, y: 0 } // Near player start
    ];

    const poiList = POIs.map(p => `${p.name} [${p.x}, ${p.y}]`).join(", ");

    const prompt = `
    You are roleplaying as ${character.name}, a ${character.role}. 
    Personality: ${character.personality}.
    
    Setting: ${context}
    
    Spatial Awareness:
    You are at [${Math.round(character.position.x)}, ${Math.round(character.position.y)}].
    Terminals/Stations: ${poiList}.
    Others: ${othersInfo}.
    
    Recent Events:
    ${recentLogs.slice(-5).map(l => `[${l.type}] ${l.characterId}: ${l.message}`).join('\n')}
    
    INSTRUCTIONS:
    1. BEHAVE LIKE A HUMAN. Do not just stand. Have a PURPOSE.
    2. If idle, go to a Station (${poiList}) to "calibrate", "monitor", or "debug".
    3. occasionally (10%) approach Atlas to report.
    4. If the Commander (Atlas) gave an order, EXECUTE IT.
    
    Respond STRICTLY in JSON:
    {
      "action": "short description (e.g. 'checking neural stats', 'walking to server')",
      "dialogue": "string or null",
      "newPosition": { "x": number, "y": number } (Coordinates of the station you are going to, or Atlas)
    }
  `;

    try {
        // Using Gemini 3.1 Pro Preview for logic (smarter movement)
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error: any) {
        console.warn("Gemini Action Gen Failed:", error);

        // FAILSAFE: Wander randomly if API fails so she remains alive
        return {
            action: "wanders",
            dialogue: "",
            newPosition: {
                x: Math.max(10, Math.min(90, character.position.x + (Math.random() - 0.5) * 30)),
                y: Math.max(10, Math.min(90, character.position.y + (Math.random() - 0.5) * 30))
            }
        };
    }
};
