import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ErrorAnalysis {
    explanation: string;      // Voice-friendly explanation
    suggestion: string;       // Code fix suggestion
    errorType: string;        // e.g., "SyntaxError", "NameError"
    fixedCode?: string;       // Optional corrected code snippet
}

/**
 * Analyzes a Python error traceback and generates a beginner-friendly explanation
 * with suggested fixes.
 */
export const analyzePythonError = async (
    code: string,
    errorMessage: string
): Promise<ErrorAnalysis> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

        const prompt = `
You are Luna, a friendly AI coding assistant. A user just ran Python code that produced an error.

**User's Code:**
\`\`\`python
${code}
\`\`\`

**Error Traceback:**
\`\`\`
${errorMessage}
\`\`\`

Your task:
1. Identify the error type (e.g., SyntaxError, NameError, TypeError, etc.)
2. Explain the error in simple, beginner-friendly language (2-3 sentences max)
3. Suggest a specific fix
4. Optionally provide the corrected code

Respond STRICTLY in JSON format:
{
  "errorType": "string",
  "explanation": "Voice-friendly explanation (keep it short, conversational, like you're speaking)",
  "suggestion": "Specific fix recommendation",
  "fixedCode": "corrected code snippet or null"
}
`;

        // Timeout Promise (30s for the Pro Preview model)
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out after 30s")), 30000)
        );

        const apiCall = model.generateContent(prompt);

        const result = await Promise.race([apiCall, timeout]) as any;
        const text = result.response.text();

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("❌ Python Assistant analysis failed (catch code block):", error);

        // Fallback analysis based on common patterns
        console.log("🔄 Generating fallback analysis...");
        return generateFallbackAnalysis(errorMessage);
    }
};

/**
 * Fallback error analysis when API is unavailable
 */
function generateFallbackAnalysis(errorMessage: string): ErrorAnalysis {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes("syntaxerror")) {
        return {
            errorType: "SyntaxError",
            explanation: "There's a syntax problem in your code. Check for missing colons, parentheses, or incorrect indentation.",
            suggestion: "Review the line mentioned in the error for typos or missing punctuation."
        };
    }

    if (lowerError.includes("nameerror")) {
        return {
            errorType: "NameError",
            explanation: "You're trying to use a variable or function that doesn't exist yet. Maybe it's misspelled?",
            suggestion: "Check if you've defined the variable before using it, or if there's a typo in the name."
        };
    }

    if (lowerError.includes("typeerror")) {
        return {
            errorType: "TypeError",
            explanation: "You're trying to do something with the wrong type of data, like adding a string to a number.",
            suggestion: "Make sure you're using compatible data types for the operation."
        };
    }

    if (lowerError.includes("zerodivisionerror")) {
        return {
            errorType: "ZeroDivisionError",
            explanation: "Oops! You tried to divide by zero, which isn't allowed in math.",
            suggestion: "Add a check to make sure the divisor isn't zero before dividing."
        };
    }

    if (lowerError.includes("indexerror")) {
        return {
            errorType: "IndexError",
            explanation: "You're trying to access an item that doesn't exist in your list. The index is out of range.",
            suggestion: "Check your list's length and make sure your index is within bounds."
        };
    }

    if (lowerError.includes("keyerror")) {
        return {
            errorType: "KeyError",
            explanation: "You're looking for a key in a dictionary that doesn't exist.",
            suggestion: "Use .get() method or check if the key exists before accessing it."
        };
    }

    if (lowerError.includes("attributeerror")) {
        return {
            errorType: "AttributeError",
            explanation: "You're trying to access an attribute or method that this object doesn't have.",
            suggestion: "Check the object type and make sure you're using the correct method name."
        };
    }

    if (lowerError.includes("valueerror")) {
        return {
            errorType: "ValueError",
            explanation: "The value you provided is the right type, but it's not a valid value for this operation.",
            suggestion: "Check the value format and make sure it's appropriate for the function."
        };
    }

    // Generic fallback
    return {
        errorType: "Error",
        explanation: "Something went wrong with your code. Let me help you figure it out.",
        suggestion: "Check the error message for clues about what line caused the problem."
    };
}

// Global state for assistance mode
let isAssistanceModeActive = false;
let errorCallback: ((analysis: ErrorAnalysis) => void) | null = null;

export const pythonAssistant = {
    /**
     * Enable assistance mode with a callback for error events
     */
    enable(onError: (analysis: ErrorAnalysis) => void) {
        isAssistanceModeActive = true;
        errorCallback = onError;
        console.log("🤖 Luna Assistance Mode: ACTIVATED");
    },

    /**
     * Disable assistance mode
     */
    disable() {
        isAssistanceModeActive = false;
        errorCallback = null;
        console.log("🤖 Luna Assistance Mode: DEACTIVATED");
    },

    /**
     * Check if assistance mode is active
     */
    isActive(): boolean {
        return isAssistanceModeActive;
    },

    /**
     * Handle a Python error - analyze and trigger callback
     */
    /**
     * Handle a Python error - analyze and trigger callback
     */
    async handleError(code: string, errorMessage: string): Promise<void> {
        if (!isAssistanceModeActive || !errorCallback) {
            console.warn("⚠️ Luna Assistance requested but inactive or no callback.");
            return;
        }

        console.log("🔍 Luna is analyzing the error...", { codeSnippet: code.slice(0, 50), errorMessage });

        try {
            const analysis = await analyzePythonError(code, errorMessage);
            console.log("✅ Analysis complete. Triggering callback with:", analysis);
            errorCallback(analysis);
        } catch (e) {
            console.error("❌ Critical error in handleError:", e);
        }
    }
};
