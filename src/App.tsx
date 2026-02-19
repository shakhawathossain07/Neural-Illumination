import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { usePerformanceSettingsProvider, PerformanceContext } from './hooks/usePerformanceSettings';
import { Experience } from './components/Experience';
import './App.css';

import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const {
    characters,
    logs,
    context,
    addLog
  } = useSimulation();

  const { settings, cycleQuality } = usePerformanceSettingsProvider();

  // Environment State
  const [environment, setEnvironment] = useState<'cyber' | 'nature' | 'desert' | 'rainforest' | 'iceland'>('cyber');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleEnvironment = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    // Wait for fade out
    setTimeout(() => {
      setEnvironment(prev => {
        if (prev === 'cyber') return 'nature';
        if (prev === 'nature') return 'desert';
        if (prev === 'desert') return 'rainforest';
        if (prev === 'rainforest') return 'iceland';
        return 'cyber';
      });

      // Wait for render/fade in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }, 500);
  };

  const handleEnvironmentChange = (newEnv: 'cyber' | 'nature' | 'desert' | 'rainforest' | 'iceland') => {
    if (isTransitioning || environment === newEnv) return;
    setIsTransitioning(true);
    // Smooth transition
    setTimeout(() => {
      setEnvironment(newEnv);
      setTimeout(() => setIsTransitioning(false), 500);
    }, 500);
  };

  return (
    <PerformanceContext.Provider value={{ settings, setQuality: () => { }, cycleQuality }}>
      <div className="fixed inset-0 w-full h-full bg-[#050510] overflow-hidden">
        <ErrorBoundary>
          <Canvas
            shadows={settings.enableShadows}
            dpr={[1, settings.dpr]}
            gl={{
              antialias: settings.quality !== 'low',
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            style={{ width: '100%', height: '100%', background: '#111' }}
          >
            <Suspense fallback={null}>
              <Experience
                characters={characters}
                logs={logs}
                context={context}
                addLog={addLog}
                environment={environment}
                setEnvironment={handleEnvironmentChange}
              />
            </Suspense>
          </Canvas>


          {/* Bottom Right Controls */}
          <div className="absolute bottom-10 right-6 pointer-events-auto flex flex-col gap-2 items-end">

            {/* Environment Toggle Button */}
            <button
              onClick={toggleEnvironment}
              className={`px-4 py-2 rounded-lg font-mono text-xs border backdrop-blur-md transition-all ${environment === 'cyber'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 hover:bg-cyan-500/40'
                : environment === 'nature'
                  ? 'bg-green-500/20 border-green-500 text-green-300 hover:bg-green-500/40'
                  : environment === 'desert'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300 hover:bg-orange-500/40'
                    : environment === 'rainforest'
                      ? 'bg-emerald-800/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/40'
                      : 'bg-slate-600/20 border-slate-400 text-blue-200 hover:bg-slate-500/40'
                }`}
              title="Switch Environment"
            >
              Theme: {environment.toUpperCase()}
            </button>

            {/* Quality Toggle Button */}
            <button
              onClick={cycleQuality}
              className="px-4 py-2 rounded-lg font-mono text-xs border backdrop-blur-md transition-all bg-purple-500/20 border-purple-500 text-purple-300 hover:bg-purple-500/40"
              title="Click to cycle quality settings"
            >
              Quality: {settings.quality.toUpperCase()}
            </button>
          </div>

          {/* Header Overlay - NeuralPy Simulator */}
          <div className="absolute top-6 left-6 pointer-events-none">
            {/* Decorative Glow Background */}
            <div
              className="absolute -inset-4 rounded-2xl opacity-30 blur-xl"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
              }}
            />

            {/* Main Title */}
            <h1
              className="relative text-3xl font-black tracking-tight"
              style={{
                fontFamily: '"Orbitron", "Rajdhani", sans-serif',
                background: 'linear-gradient(90deg, #0cebeb 0%, #20e3b2 25%, #29ffc6 50%, #d946ef 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 4s linear infinite',
                textShadow: '0 0 20px rgba(41, 255, 198, 0.4), 0 0 40px rgba(217, 70, 239, 0.2)',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ fontWeight: 900 }}>NEURAL</span>
              <span style={{ marginLeft: '10px', fontStyle: 'italic', fontWeight: 200, color: '#e879f9' }}>ILLUMINATION</span>
            </h1>

            {/* Subtitle with Pulse Effect */}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-2 h-2 rounded-full bg-emerald-400"
                style={{
                  boxShadow: '0 0 8px #34d399, 0 0 16px #34d399',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <span
                className="text-[11px] tracking-[0.4em] uppercase"
                style={{
                  background: 'linear-gradient(90deg, #6ee7b7, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                System Active
              </span>
              <div className="flex gap-1 ml-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1 h-3 rounded-full bg-cyan-400/60"
                    style={{
                      animation: `equalizer 0.8s ${i * 0.2}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Transition Overlay */}
          <div
            className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-500 ease-in-out z-50 ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Add keyframe animations via style tag */}
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(0.8); }
            }
            @keyframes equalizer {
              0%, 100% { height: 6px; opacity: 0.4; }
              50% { height: 14px; opacity: 1; }
            }
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400&display=swap');
          `}</style>
        </ErrorBoundary>
      </div>
    </PerformanceContext.Provider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
