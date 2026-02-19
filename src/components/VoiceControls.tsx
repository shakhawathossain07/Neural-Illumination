import React, { useState, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { mentorService } from '../services/mentor';
import { moodService } from '../services/mood';

interface VoiceControlsProps {
    state: 'idle' | 'listening' | 'thinking' | 'speaking';
    transcript: string;
    onStart: () => void;
    position?: [number, number, number];
    // Assistance mode props
    isAssistanceActive?: boolean;
    onAssistanceToggle?: () => void;
    assistanceFeedback?: string;
    aiResponse?: string;
    setEnvironment?: (env: any) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
    state,
    transcript,
    onStart,
    position = [0, -2, 0],
    isAssistanceActive = false,
    onAssistanceToggle,
    assistanceFeedback,
    aiResponse,
    setEnvironment
}) => {
    const [isMentorMode, setIsMentorMode] = useState(false);
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
    const [mentorFeedback, setMentorFeedback] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const toggleMentorMode = async () => {
        if (!isMentorMode) {
            if (videoRef.current) {
                await mentorService.startMonitoring(
                    videoRef.current,
                    (feedback) => setMentorFeedback(feedback),
                    (_thinking) => { /* Optional: show thinking state for mentor */ }
                );
                setIsMentorMode(true);
            }
        } else {
            mentorService.stopMonitoring();
            setIsMentorMode(false);
            setMentorFeedback("");
        }
    };

    // Helper to start camera temporarily if not already running
    const startCamera = async () => {
        // If external service (Mentor) is already using it, or we have a local stream
        if (videoRef.current && videoRef.current.srcObject) return true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            return true;
        } catch (e) {
            console.error("Camera access failed", e);
            return false;
        }
    };

    const stopCamera = () => {
        // Only stop if mentor mode is NOT using it (MentorService manages its own stream mostly, but if we opened one, we close it)
        // If Mentor Mode is active, we assume it controls the stream.
        if (!isMentorMode && streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;
        }
    };

    const handleMoodCheck = async () => {
        if (isAnalyzingMood) return;
        setIsAnalyzingMood(true);
        setMentorFeedback("Analyzing your vibe..."); // Reuse feedback box

        const cameraReady = await startCamera();

        if (cameraReady && videoRef.current) {
            // Wait a moment for auto-exposure
            await new Promise(r => setTimeout(r, 1000));

            const result = await moodService.analyzeMood(videoRef.current);
            stopCamera();

            if (result && setEnvironment) {
                setMentorFeedback(`Mood: ${result.mood}. Switching to ${result.suggestedEnvironment.toUpperCase()}.`);
                setEnvironment(result.suggestedEnvironment);

                // Clear feedback after a few seconds
                setTimeout(() => setMentorFeedback(""), 4000);
            } else {
                setMentorFeedback("Could not detect mood.");
                setTimeout(() => setMentorFeedback(""), 2000);
            }
        }
        setIsAnalyzingMood(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isMentorMode) mentorService.stopMonitoring();
        };
    }, []);

    const getColor = () => {
        switch (state) {
            case 'listening': return '#ef4444'; // Red recording
            case 'thinking': return '#fbbf24'; // Amber processing
            case 'speaking': return '#22d3ee'; // Cyan speaking
            default: return '#ffffff';
        }
    };

    const getStatusText = () => {
        if (isAssistanceActive) return "ASSISTANCE ACTIVE";
        if (isMentorMode) return "MENTOR ACTIVE";
        switch (state) {
            case 'listening': return 'REC';
            case 'thinking': return 'PROCESSING...';
            case 'speaking': return 'VOICE ACTIVE';
            default: return 'PUSH TO TALK';
        }
    };

    return (
        <Html position={position} center> {/* Dynamic position */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'monospace',
                pointerEvents: 'auto', // Ensure clickability
            }}>
                {/* Hidden Video Element for Analysis */}
                <video
                    ref={videoRef}
                    style={{
                        display: isMentorMode ? 'block' : 'none',
                        width: '100px',
                        borderRadius: '8px',
                        marginBottom: '10px',
                        border: '1px solid cyan'
                    }}
                    playsInline
                    muted
                />

                {/* Assistance Feedback Display */}
                {assistanceFeedback && (
                    <div className="animate-in fade-in slide-in-from-bottom-2" style={{
                        background: 'rgba(0, 80, 50, 0.9)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #10b981',
                        color: '#6ee7b7',
                        fontSize: '12px',
                        maxWidth: '280px',
                        textAlign: 'left',
                        fontWeight: 'normal',
                        marginBottom: '8px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                        lineHeight: '1.4'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#34d399' }}>🤖 LUNA ASSISTANCE</div>
                        {assistanceFeedback}
                    </div>
                )}

                {/* Mentor Feedback Display */}
                {mentorFeedback && !assistanceFeedback && (
                    <div className="animate-in fade-in slide-in-from-bottom-2" style={{
                        background: 'rgba(50, 0, 100, 0.8)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d946ef',
                        color: '#e879f9',
                        fontSize: '12px',
                        maxWidth: '250px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        marginBottom: '5px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 0 15px rgba(217, 70, 239, 0.3)'
                    }}>
                        MENTOR: {mentorFeedback}
                    </div>
                )}

                {/* Transcript / AI Response Display */}
                {(transcript || (state === 'speaking' && aiResponse)) && !mentorFeedback && !assistanceFeedback && (
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        borderLeft: `2px solid ${getColor()}`,
                        color: 'white',
                        fontSize: '14px',
                        maxWidth: '300px',
                        marginBottom: '10px',
                        backdropFilter: 'blur(4px)',
                    }}>
                        {state === 'speaking' && aiResponse ? `LUNA: ${aiResponse}` :
                            state === 'listening' ? `> ${transcript}` : `LUNA: ...`}
                    </div>
                )}

                <div className="flex gap-6 items-start">
                    {/* Main Voice Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onStart}
                            disabled={state !== 'idle'}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: state === 'idle' ? 'rgba(0,0,0,0.5)' : getColor(),
                                border: `2px solid ${getColor()}`,
                                color: 'white',
                                cursor: state === 'idle' ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 0 15px ${getColor()}44`,
                                transition: 'all 0.3s ease',
                            }}
                            title="Talk to Luna"
                        >
                            {state === 'idle' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                            ) : (
                                <div className="animate-pulse" style={{ width: '16px', height: '16px', background: 'white', borderRadius: '2px' }} />
                            )}
                        </button>
                        {/* Label */}
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: getColor(),
                            letterSpacing: '1px',
                            textShadow: `0 0 5px ${getColor()}`
                        }}>
                            {state === 'idle' ? 'VOICE' : getStatusText()}
                        </span>
                    </div>

                    {/* Mentor Mode Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={toggleMentorMode}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isMentorMode ? '#d946ef' : 'rgba(0,0,0,0.5)',
                                border: `2px solid #d946ef`,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isMentorMode ? `0 0 15px #d946ef` : 'none',
                                transition: 'all 0.3s ease',
                            }}
                            title="Mentor Mode (Camera Analysis)"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 10l5-5m0 0l-5-5m5 5H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V10z"></path>
                                <circle cx="10" cy="10" r="3"></circle>
                            </svg>
                        </button>
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: isMentorMode ? '#d946ef' : 'rgba(217, 70, 239, 0.7)',
                            letterSpacing: '1px'
                        }}>
                            MENTOR
                        </span>
                    </div>

                    {/* Assistance Mode Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onAssistanceToggle}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isAssistanceActive ? '#10b981' : 'rgba(0,0,0,0.5)',
                                border: `2px solid #10b981`,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isAssistanceActive ? `0 0 15px #10b981` : 'none',
                                transition: 'all 0.3s ease',
                            }}
                            title="Assistance Mode (Python Error Help)"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </button>
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: isAssistanceActive ? '#10b981' : 'rgba(16, 185, 129, 0.7)',
                            letterSpacing: '1px'
                        }}>
                            ASSISTANCE
                        </span>
                    </div>

                    {/* Mood Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleMoodCheck}
                            disabled={isAnalyzingMood}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isAnalyzingMood ? '#60a5fa' : 'rgba(0,0,0,0.5)',
                                border: `2px solid #60a5fa`,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isAnalyzingMood ? `0 0 15px #60a5fa` : 'none',
                                transition: 'all 0.3s ease',
                            }}
                            title="Detect Mood & Switch Environment"
                        >
                            {isAnalyzingMood ? (
                                <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                            ) : (
                                <span style={{ fontSize: '16px' }}>✨</span>
                            )}
                        </button>
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            color: '#60a5fa',
                            letterSpacing: '1px'
                        }}>
                            MOOD
                        </span>
                    </div>
                </div>
            </div>
        </Html>
    );
};

