import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface HologramResponse {
    code: string;
    description: string;
}

export const generateHologramCode = async (userPrompt: string): Promise<HologramResponse> => {
    try {
        console.log("🧬 generateHologramCode START for prompt:", userPrompt);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

        const systemPrompt = `
        You are a Code Generator for a 3D Holographic Projector.
        
        TASK:
        Generate minimal Python code to render the 3D shape requested by the user.
        The code MUST define a dictionary named 'hologram'.
        
        HOLOGRAM SCHEMA (use EXACTLY these lowercase values for shape):
        hologram = {
            "shape": "box" | "sphere" | "cylinder" | "torus" | "cone" | "icosahedron" | "knot" | "heart",
            "color": string (hex color like "#ff0000" or name like "red"),
            "size": number (default 1.5),
            "wireframe": boolean (True or False),
            "animate": boolean (True or False)
        }

        CRITICAL RULES:
        1. The "shape" value MUST be lowercase (e.g., "sphere" not "Sphere").
        2. Output ONLY valid Python code.
        3. NO conversational text (e.g., "Here is the code", "Okay I will...").
        4. NO markdown formatting.
        5. Start with a simple print() statement.

        SHAPE MAPPINGS:
        - "sphere" or "ball" or "globe" or "earth" → shape="sphere"
        - "box" or "cube" → shape="box"
        - "cylinder" or "tube" → shape="cylinder"
        - "torus" or "ring" or "donut" → shape="torus"
        - "cone" or "pyramid" → shape="cone"
        - "heart" → shape="heart"
        - "knot" → shape="knot"
        
        EXAMPLES:

        User: "Show sphere"
        Output:
        print("Spawning Sphere...")
        hologram = {"shape": "sphere", "color": "#22d3ee", "size": 1.5, "wireframe": True, "animate": True}

        User: "Show red cube"
        Output:
        print("Spawning Cube...")
        hologram = {"shape": "box", "color": "red", "size": 1.5, "wireframe": False, "animate": False}

        User: "Show blue torus"
        Output:
        print("Spawning Torus...")
        hologram = {"shape": "torus", "color": "blue", "size": 1.5, "wireframe": True, "animate": True}
        `;

        console.log("📡 Sending request to Gemini ID:", "gemini-3.1-pro-preview");

        // Timeout Promise
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out after 30s")), 30000)
        );

        // API Call Promise
        const apiCall = model.generateContent([systemPrompt, `User Command: ${userPrompt}`]);

        // Race them
        const result = await Promise.race([apiCall, timeout]) as any;

        console.log("📥 Received response from Gemini");
        const text = result.response.text();
        console.log("📄 Raw response text:", text);


        // 1. Try to extract code from markdown block
        // 1. Try to extract code from markdown block (case insensitive, whitespace lenient)
        const codeBlockMatch = text.match(/```(?:python)?\s*([\s\S]*?)```/i);
        let cleanCode = "";

        if (codeBlockMatch && codeBlockMatch[1]) {
            cleanCode = codeBlockMatch[1].trim();
        } else {
            // 2. Fallback: Take the text, but strip known conversational lines
            cleanCode = text
                .replace(/```/g, "")
                .split('\n')
                .filter((line: string) => {
                    const l = line.trim();
                    if (l.startsWith("Here is")) return false;
                    if (l.startsWith("Okay")) return false;
                    if (l.startsWith("User Command")) return false;
                    return true;
                })
                .join('\n')
                .trim();
        }

        // 3. Post-Processing: Fix common LLM mistakes (JSON vs Python syntax)
        // Replaces "true" with "True", "false" with "False", "null" with "None" 
        // ONLY if they appear as values (not inside strings). 
        // This is a simple heuristic but effective for this specific dictionary structure.
        cleanCode = cleanCode
            .replace(/: true/g, ": True")
            .replace(/: false/g, ": False")
            .replace(/: null/g, ": None")
            .replace(/:true/g, ": True")
            .replace(/:false/g, ": False")
            .replace(/:null/g, ": None");

        // Final sanity check: if code doesn't contain 'hologram =', it's probably wrong
        if (!cleanCode.includes("hologram =")) {
            console.warn("Generated code missing hologram definition, forcing default.");
            cleanCode = `print("Error: Invalid Generation. Resetting...")\nhologram = {"shape": "box", "color": "white", "size": 1}`;
        }

        return {
            code: cleanCode,
            description: `Generating ${userPrompt}...`
        };

    } catch (error: any) {
        console.error("Hologram Gen Error:", error);
        const errorMessage = error.message || String(error);
        return {
            code: `print("Error: Signal Lost. Details below:")\nprint(r"DEBUG: ${errorMessage.replace(/"/g, "'")}")\nhologram = {"shape": "box", "color": "gray", "wireframe": True}`,
            description: "Failed to generate hologram."
        };
    }
};
