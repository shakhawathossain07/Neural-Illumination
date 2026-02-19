import React, { useState, useEffect, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme
import { pythonTutor } from '../services/pythonTutor';
import { TutorMode } from '../types/LearningTypes';
import type { Challenge, EvaluationResult } from '../types/LearningTypes';

// Type definition for window.loadPyodide
declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<any>;
    }
}

interface PythonEditorProps {
    initialCode?: string;
    externalCode?: string; // New prop for voice-generated code
    onError?: (code: string, errorMessage: string) => void;
    onShapeGenerated?: (data: any) => void;
}

export const PythonEditor: React.FC<PythonEditorProps> = (props) => {
    const {
        initialCode = 'print("Hello, Simulation World!")\n\n# Define a hologram variable to spawn 3D shapes\n# hologram = {"shape": "box", "color": "cyan", "size": 1}',
        externalCode,
        onError
    } = props;
    const [code, setCode] = useState(initialCode);

    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [isPyodideReady, setIsPyodideReady] = useState(false);
    const pyodideRef = useRef<any>(null);

    const lastAutoRunCode = useRef<string | null>(null);

    // Sync external code to editor state
    useEffect(() => {
        if (externalCode && externalCode !== code) {
            setCode(externalCode);
        }
    }, [externalCode]);



    // Learning Mode States
    const [mode, setMode] = useState<TutorMode>(TutorMode.OFF);
    const [difficulty, setDifficulty] = useState(1);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);

    const [pastChallenges, setPastChallenges] = useState<string[]>([]);

    // Gamification States
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);


    useEffect(() => {
        const loadPyodideRuntime = async () => {
            if (pyodideRef.current) return;

            try {
                // Check if script is already loaded
                if (!window.loadPyodide) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                    script.async = true;
                    script.onload = async () => {
                        await initializePyodide();
                    };
                    document.body.appendChild(script);
                } else {
                    await initializePyodide();
                }
            } catch (err) {
                console.error("Failed to load Pyodide:", err);
                setOutput(prev => prev + "\nError loading Python runtime.");
            }
        };

        const initializePyodide = async () => {
            if (pyodideRef.current) return;

            try {
                const pyodide = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                });

                // Redirect stdout to our output
                pyodide.setStdout({
                    batched: (msg: string) => setOutput(prev => prev + msg + "\n")
                });

                pyodideRef.current = pyodide;
                setIsPyodideReady(true);
            } catch (err) {
                console.error("Failed to initialize Pyodide:", err);
            }
        };

        loadPyodideRuntime();
    }, []);

    const fetchNewChallenge = async (level: number) => {
        setIsLoadingChallenge(true);
        setEvaluation(null);
        setOutput('');
        try {
            // Pass history to avoid duplicates and ensure variety
            const challenge = await pythonTutor.generateChallenge(level, pastChallenges);
            setCurrentChallenge(challenge);
            setCode(challenge.starterCode);
            setDifficulty(level);
        } catch (error) {
            console.error("Failed to fetch challenge", error);
            setOutput("Failed to load new challenge. Please check your connection.");
        } finally {
            setIsLoadingChallenge(false);
        }
    };

    const toggleLearningMode = async () => {
        if (mode === TutorMode.OFF) {
            setMode(TutorMode.LEARNING);
            if (!currentChallenge) {
                await fetchNewChallenge(difficulty);
            }
        } else {
            setMode(TutorMode.OFF);
            setCode(initialCode);
            setCurrentChallenge(null);
            setEvaluation(null);
        }
    };

    const runCode = async (codeOverride?: string) => {
        if (!pyodideRef.current || isRunning) {
            console.warn("⚠️ Cannot run: Pyodide not ready or already running.");
            return;
        }

        const sourceCode = codeOverride || code;
        setIsRunning(true);

        setOutput('');

        let capturedOutput = "";

        // Temporarily override stdout to capture for evaluation
        pyodideRef.current.setStdout({
            batched: (msg: string) => {
                const line = msg + "\n";
                capturedOutput += line;
                setOutput(prev => prev + line);
            }
        });

        try {
            await pyodideRef.current.runPythonAsync(sourceCode);

            // Check for hologram variable
            try {
                const hologramData = pyodideRef.current.globals.get('hologram');
                if (hologramData) {
                    // Pyodide's toJs() returns a Map, not a plain object
                    const rawData = hologramData.toJs ? hologramData.toJs() : hologramData;

                    // Convert Map to plain object if needed
                    let shapeData: Record<string, any>;
                    if (rawData instanceof Map) {
                        shapeData = Object.fromEntries(rawData);
                    } else {
                        shapeData = rawData;
                    }

                    console.log("🌀 Hologram Data Parsed:", shapeData);

                    // Pass to parent
                    if (props.onShapeGenerated) {
                        props.onShapeGenerated(shapeData);
                        setOutput(prev => prev + `\n✨ Hologram Signal Detected: Spawning ${shapeData.shape || 'Object'}...\n`);
                    }

                    // Clean up to avoid stale state
                    pyodideRef.current.globals.delete('hologram');
                }
            } catch (err) {
                console.log("No hologram data or error reading it:", err);
            }

            // If in Learning Mode, evaluate the result
            if (mode === TutorMode.LEARNING && currentChallenge) {
                setOutput(prev => prev + "\n--- Evaluating Submission ---\n");
                const result = await pythonTutor.evaluateSubmission(code, capturedOutput, currentChallenge);
                setEvaluation(result);

                if (result.passed) {
                    // Award XP based on difficulty
                    const earnedXp = difficulty * 10 + (streak > 0 ? 5 : 0); // Bonus for streak
                    setXp(prev => prev + earnedXp);
                    setStreak(prev => prev + 1);
                    setCompletedCount(prev => prev + 1);

                    setOutput(prev => prev + `✅ PASSED: ${result.feedback}\n🎮 +${earnedXp} XP | 🔥 Streak: ${streak + 1}\n`);

                    // Add to history if passed
                    if (!pastChallenges.includes(currentChallenge.title)) {
                        setPastChallenges(prev => [...prev, currentChallenge.title]);
                    }
                } else {
                    // Reset streak on failure
                    setStreak(0);
                    setOutput(prev => prev + `❌ FAILED: ${result.feedback}\n💡 Don't give up! Try again.\n`);
                }

                // Auto-update difficulty based on AI suggestion
                if (result.nextDifficulty && result.passed) {
                    setDifficulty(result.nextDifficulty);
                }
            }

        } catch (error: any) {
            const errorMsg = error.message;
            setOutput(prev => prev + `\nError:\n${errorMsg}`);

            // Trigger Luna Assistance if callback provided
            if (onError) {
                onError(code, errorMsg);
            }
        } finally {
            setIsRunning(false);
            // safe restore stdout behavior (though we are just setting state anyway)
            pyodideRef.current.setStdout({
                batched: (msg: string) => setOutput(prev => prev + msg + "\n")
            });
        }
    };

    const handleNextLevel = () => {
        // Double check we aren't adding duplicates, though logic in runCode handles it too
        if (currentChallenge && !pastChallenges.includes(currentChallenge.title)) {
            setPastChallenges(prev => [...prev, currentChallenge.title]);
        }
        const nextLevel = Math.min(10, difficulty + 1);
        fetchNewChallenge(nextLevel);
    };

    // Auto-run when Pyodide is ready and we have new external code
    useEffect(() => {
        console.log("🛠️ Auto-Run Check:", { isPyodideReady, externalCode, lastRun: lastAutoRunCode.current });

        // Debug: Log why it might NOT be running
        if (externalCode && externalCode === lastAutoRunCode.current) {
            console.log("⚠️ Skipping auto-run: Code already ran.");
        }
        if (externalCode && !isPyodideReady) {
            console.log("⚠️ Skipping auto-run: Pyodide not ready.");
        }

        if (isPyodideReady && externalCode && externalCode !== lastAutoRunCode.current) {
            console.log("🚀 Auto-running external code now!");
            const timeout = setTimeout(() => {
                runCode(externalCode);
                lastAutoRunCode.current = externalCode;
            }, 800);
            return () => clearTimeout(timeout);
        }
    }, [isPyodideReady, externalCode]);

    return (
        <div
            onPointerDown={(e) => e.stopPropagation()}
            onPointerOver={(e) => e.stopPropagation()}
            style={{
                width: '800px', // Wider for split view in learning mode
                height: '500px',
                backgroundColor: 'rgba(10, 10, 16, 0.95)',
                border: `2px solid ${mode === TutorMode.LEARNING ? '#a78bfa' : '#22d3ee'}`,
                borderRadius: '8px',
                boxShadow: `0 0 20px ${mode === TutorMode.LEARNING ? 'rgba(167, 139, 250, 0.3)' : 'rgba(34, 211, 238, 0.3)'}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                color: '#e0e7ff',
                transition: 'all 0.3s ease'
            }}>
            {/* Header */}
            <div style={{
                padding: '8px 16px',
                borderBottom: `1px solid ${mode === TutorMode.LEARNING ? '#a78bfa44' : '#22d3ee44'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: mode === TutorMode.LEARNING ? 'rgba(167, 139, 250, 0.1)' : 'rgba(34, 211, 238, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: mode === TutorMode.LEARNING ? '#a78bfa' : '#22d3ee', letterSpacing: '1px' }}>
                        {mode === TutorMode.LEARNING ? 'PYTHON TUTOR AI' : 'PYTHON KERNEL'}
                    </span>
                    <button
                        onClick={toggleLearningMode}
                        style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid currentColor',
                            background: 'transparent',
                            color: mode === TutorMode.LEARNING ? '#a78bfa' : '#22d3ee',
                            cursor: 'pointer'
                        }}
                    >
                        {mode === TutorMode.LEARNING ? 'EXIT LEARNING MODE' : 'ENTER LEARNING MODE'}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {mode === TutorMode.LEARNING && (
                        <>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                                🎮 {xp} XP
                            </span>
                            <span style={{ fontSize: '11px', color: streak > 0 ? '#f59e0b' : '#6b7280' }}>
                                🔥 {streak}
                            </span>
                            <span style={{ fontSize: '11px', color: '#8b5cf6' }}>
                                ✓ {completedCount}
                            </span>
                            <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                                Lv.{difficulty}
                            </span>
                        </>
                    )}
                    <span style={{ fontSize: '10px', color: isPyodideReady ? '#4ade80' : '#facc15' }}>
                        {isPyodideReady ? '● READY' : '● LOADING...'}
                    </span>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Learning Panel (Left) */}
                {mode === TutorMode.LEARNING && (
                    <div style={{
                        width: '250px',
                        borderRight: '1px solid #333',
                        padding: '16px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        {isLoadingChallenge ? (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                                Generating Challenge...
                            </div>
                        ) : currentChallenge ? (
                            <>
                                <h3 style={{ color: '#e0e7ff', margin: '0 0 10px 0', fontSize: '16px' }}>{currentChallenge.title}</h3>
                                <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: '1.4', marginBottom: '16px' }}>
                                    {currentChallenge.description}
                                </p>

                                {/* Hints Section */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Output</div>
                                    <code style={{ background: '#1f2937', padding: '4px', borderRadius: '4px', fontSize: '12px', display: 'block', wordBreak: 'break-all' }}>
                                        {currentChallenge.expectedOutputPattern || 'Any valid output'}
                                    </code>
                                </div>

                                <div style={{ marginTop: 'auto' }}>
                                    {currentChallenge.hints.map((hint, i) => (
                                        <details key={i} style={{ marginBottom: '8px', cursor: 'pointer' }}>
                                            <summary style={{ fontSize: '12px', color: '#9ca3af' }}>Need a hint?</summary>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280', paddingLeft: '12px' }}>{hint}</p>
                                        </details>
                                    ))}
                                </div>

                                {evaluation && evaluation.passed && (
                                    <button
                                        onClick={handleNextLevel}
                                        style={{
                                            width: '100%',
                                            marginTop: '20px',
                                            padding: '8px',
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Next Challenge &rarr;
                                    </button>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <button onClick={() => fetchNewChallenge(difficulty)} style={{ color: '#22d3ee', border: '1px solid #22d3ee', background: 'transparent', padding: '4px 8px', cursor: 'pointer' }}>
                                    Start Learning
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Editor Area (Center) */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
                    <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                        <Editor
                            value={code}
                            onValueChange={setCode}
                            highlight={code => Prism.highlight(code, Prism.languages.python, 'python')}
                            padding={10}
                            style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                                fontSize: 14,
                                minHeight: '100%',
                            }}
                            textareaClassName="focus:outline-none"
                        />
                    </div>
                </div>

                {/* Output Area (Right) */}
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', backgroundColor: '#050508' }}>
                    <div style={{ padding: '4px 8px', fontSize: '10px', color: '#6b7280', borderBottom: '1px solid #222' }}>STDOUT / STDERR</div>
                    <div style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '12px',
                        color: evaluation?.passed ? '#4ade80' : evaluation ? '#fb7185' : '#a78bfa',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace'
                    }}>
                        {output || <span style={{ opacity: 0.3 }}>Runtime output will appear here...</span>}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ padding: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${mode === TutorMode.LEARNING ? '#a78bfa44' : '#333'}` }}>
                <button
                    onClick={() => { setOutput(''); setEvaluation(null); }}
                    style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #4b5563',
                        color: '#9ca3af',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Clear
                </button>
                <button
                    onClick={() => runCode()}
                    disabled={!isPyodideReady || isRunning}
                    style={{
                        padding: '6px 20px',
                        background: isRunning ? '#374151' : (mode === TutorMode.LEARNING ? '#7c3aed' : '#22d3ee'),
                        color: isRunning ? '#9ca3af' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: (!isPyodideReady || isRunning) ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        boxShadow: isRunning ? 'none' : `0 0 10px ${mode === TutorMode.LEARNING ? 'rgba(124, 58, 237, 0.4)' : 'rgba(34, 211, 238, 0.4)'}`
                    }}
                >
                    {isRunning ? 'RUNNING...' : (mode === TutorMode.LEARNING ? 'SUBMIT SOLUTION' : 'RUN CODE')}
                </button>
            </div>
        </div>
    );
};

