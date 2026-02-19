import { useState, useEffect, useRef } from 'react';
import { chatWithLuna } from '../services/gemini';
import { speakText } from '../services/elevenlabs';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const useVoiceInteraction = (context: string) => {
    const [state, setState] = useState<VoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ... (useEffect remains same, I will skip it in replacement chunk if possible but replace_file_content needs contiguous)
    // Actually I can just replace the top and bottom or use multi_replace.
    // Let's use clean replace for the state init and return.

    // I will do it in one go if possible or two.
    // Let's use multi_replace to be surgical.


    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => setState('listening');

            recognitionRef.current.onresult = async (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                handleUserMessage(text);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech Recognition Error", event.error);
                setState('idle');
            };

            recognitionRef.current.onend = () => {
                if (state === 'listening') setState('thinking'); // Transition if not already changing
            };
        }
    }, [context]);

    const handleUserMessage = async (text: string) => {
        setState('thinking');

        try {
            const lowerText = text.toLowerCase();
            const isShowCommand = lowerText.startsWith("show") || lowerText.startsWith("generate") || lowerText.startsWith("create");

            if (isShowCommand) {
                // FAST PATH: Skip Luna's chat for hologram commands
                // Just acknowledge and let Experience.tsx handle code generation
                const quickResponse = "Please wait, your request is processing...";
                setAiResponse(quickResponse);

                // Use ElevenLabs API for high-quality voice
                speakText(quickResponse).then(audioBuffer => {
                    if (audioBuffer) {
                        playAudio(audioBuffer);
                    } else {
                        // Fallback purely visual if audio fails
                        setState('speaking');
                        setTimeout(() => {
                            setState('idle');
                            setAiResponse('');
                        }, 3000);
                    }
                });
                return; // Exit early
            }

            // NORMAL PATH: Full Luna conversation
            // 1. Get AI Response
            const responseText = await chatWithLuna(text, context);
            setAiResponse(responseText);

            // 2. Convert to Audio
            const audioBuffer = await speakText(responseText);

            if (audioBuffer) {
                playAudio(audioBuffer);
            } else {
                setState('idle');
            }
        } catch (error) {
            console.error("Voice processing error:", error);
            setState('idle');
        }
    };

    const playAudio = (buffer: ArrayBuffer) => {
        setState('speaking');
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
            setState('idle');
            setAiResponse(''); // Clear text when speaking finishes
            URL.revokeObjectURL(url);
        };

        audio.play().catch(e => console.error("Audio playback error:", e));
    };

    const startListening = () => {
        if (recognitionRef.current && state === 'idle') {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Failed to start recognition:", e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setState('idle');
        }
    };

    return {
        state,
        transcript,
        aiResponse,
        startListening,
        stopListening
    };
};
