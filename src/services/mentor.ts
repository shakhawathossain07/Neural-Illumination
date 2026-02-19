import { GoogleGenerativeAI } from "@google/generative-ai";
import { speakText } from "./elevenlabs";

// Reusing the key from environment logic
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-3.1-pro-preview";

export class MentorService {
    private model: ReturnType<typeof genAI.getGenerativeModel>;
    private stream: MediaStream | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvasElement: HTMLCanvasElement | null = null;
    private isMonitoring: boolean = false;
    private analysisInterval: any = null;
    private onThinking: ((thinking: boolean) => void) | null = null;
    private retryCount: number = 0;
    private maxRetries: number = 3;
    private isPaused: boolean = false;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: MODEL_NAME });
    }

    async startMonitoring(
        videoElement: HTMLVideoElement,
        onFeedback: (text: string) => void,
        onThinking: (thinking: boolean) => void
    ) {
        if (this.isMonitoring) return;

        try {
            this.videoElement = videoElement;
            this.onThinking = onThinking;
            this.retryCount = 0;
            this.isPaused = false;

            // Get Camera Access
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = this.stream;

            // Wait for video to be ready before playing
            await new Promise<void>((resolve) => {
                this.videoElement!.onloadedmetadata = () => resolve();
            });
            await this.videoElement.play().catch(() => {
                // Ignore play() interruption errors
            });

            this.isMonitoring = true;
            this.canvasElement = document.createElement('canvas');

            // Speak initial greeting
            this.speak("Mentor mode initialized. I am watching your progress. Let's focus.");

            // Start Analysis Loop (every 30 seconds to stay within free tier limits)
            this.analysisInterval = setInterval(() => this.analyzeFrame(onFeedback), 30000);

        } catch (error) {
            console.error("Mentor Mode Error:", error);
            this.speak("I could not access your visual sensors. Mentor mode failed.");
            this.stopMonitoring();
        }
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.isPaused = false;

        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        this.speak("Mentor mode deactivated.");
    }

    private async analyzeFrame(onFeedback: (text: string) => void) {
        if (!this.isMonitoring || !this.videoElement || !this.canvasElement) return;
        if (this.isPaused) {
            console.log("⏸️ Mentor is paused, skipping analysis...");
            return;
        }

        console.log("📸 Capturing frame for Mentor analysis...");

        // Capture Frame with COMPRESSION (320px max for token savings)
        const maxWidth = 320;
        const scale = maxWidth / this.videoElement.videoWidth;
        this.canvasElement.width = maxWidth;
        this.canvasElement.height = this.videoElement.videoHeight * scale;

        const ctx = this.canvasElement.getContext('2d');
        if (!ctx) return;

        // Apply low-light enhancement filter
        ctx.filter = 'brightness(1.5) contrast(1.3) saturate(1.2)';
        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        ctx.filter = 'none';

        // Compress to JPEG with lower quality (0.6 = 60%)
        const base64Image = this.canvasElement.toDataURL('image/jpeg', 0.6).split(',')[1];

        if (this.onThinking) this.onThinking(true);

        const prompt = `
        You are a strict but encouraging personal mentor. 
        Analyze the user's behavior from this webcam frame. 
        I have applied a brightness filter to help you see in low light.
        
        CRITICAL CHECKS:
        1. VISIBILITY: Is the image STILL too dark?
        2. DISTRACTIONS: Are they holding a PHONE? (High priority alert).
        3. POSTURE: Are they slouching?
        4. MOOD: Happy, Frustrated, Focused?

        Output a SHORT, spoke-able sentence (1-2 sentences max).
        
        - [DARKNESS]: "It is still too dark. Please turn on a light."
        - [PHONE]: "I see that phone. Put it away and focus!"
        - [NORMAL]: If all is good, give a random motivational quote or say nothing (return "SILENCE").
        
        DO NOT describe the image directly. Speak TO them.
        Example: "Put the phone down, let's get back to work."
        `;

        try {
            const result = await this.model.generateContent([
                prompt,
                { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
            ]);

            const feedback = result.response.text();
            console.log("🤖 Mentor Logic:", feedback);

            // Reset retry count on success
            this.retryCount = 0;

            if (feedback && !feedback.includes("SILENCE")) {
                onFeedback(feedback);
                this.speak(feedback);
            }

        } catch (error: any) {
            console.error("AI Analysis Failed:", error);

            // Handle Rate Limit (429) with exponential backoff
            if (error.message?.includes("429") || error.message?.includes("Quota exceeded")) {
                this.retryCount++;

                if (this.retryCount >= this.maxRetries) {
                    this.speak("I have hit my limit. Mentor mode will pause for 2 minutes.");
                    this.isPaused = true;

                    // Auto-resume after 2 minutes
                    setTimeout(() => {
                        this.isPaused = false;
                        this.retryCount = 0;
                        this.speak("Resuming mentor mode.");
                    }, 120000); // 2 minutes
                } else {
                    const backoffTime = Math.pow(2, this.retryCount) * 10; // 20s, 40s, 80s
                    console.log(`⏳ Rate limited. Waiting ${backoffTime} seconds...`);
                    this.speak(`Rate limited. Waiting ${backoffTime} seconds.`);
                }
            }
        } finally {
            if (this.onThinking) this.onThinking(false);
        }
    }

    private async speak(text: string) {
        // Try ElevenLabs first for natural voice
        try {
            const audioBuffer = await speakText(text);
            if (audioBuffer) {
                const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                return;
            }
        } catch (error) {
            console.warn("ElevenLabs failed, falling back to browser TTS:", error);
        }

        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const lunaVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Google US English"));
        if (lunaVoice) utterance.voice = lunaVoice;
        utterance.rate = 1.1;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}

export const mentorService = new MentorService();

