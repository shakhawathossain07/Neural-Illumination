const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel

export const speakText = async (text: string): Promise<ArrayBuffer | null> => {
    if (!text) return null;

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVEN_LABS_API_KEY,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`ElevenLabs API Error: ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        return audioBuffer;
    } catch (error) {
        console.error("ElevenLabs TTS Error:", error);
        return null;
    }
};
