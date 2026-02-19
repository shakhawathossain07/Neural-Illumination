import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StageScreenProps {
    position: [number, number, number];
    scale?: [number, number, number];
    color: string;
    getFrequencyData: () => Uint8Array | null; // Function to get current audio data
}

export const StageScreen: React.FC<StageScreenProps> = ({
    position,
    scale = [4, 10, 0.2],
    color,
    getFrequencyData
}) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const meshRef = useRef<THREE.Mesh>(null);

    // Shader Uniforms
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uAudioData: {
            value: new THREE.DataTexture(
                new Uint8Array(128).fill(0), // Initial empty data
                128,
                1,
                THREE.RedFormat,
                THREE.UnsignedByteType,
                THREE.UVMapping,
                THREE.RepeatWrapping,
                THREE.RepeatWrapping,
                THREE.LinearFilter,
                THREE.LinearFilter
            )
        },
        uBeat: { value: 0.0 }
    }), [color]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            // Update audio data
            const data = getFrequencyData();
            if (data && materialRef.current.uniforms.uAudioData.value) {
                // We map the 256/2 = 128 bins to the texture
                // Note: useAudioAnalyzer uses fftSize=256 -> 128 bins
                const texture = materialRef.current.uniforms.uAudioData.value;
                texture.image.data.set(data);
                texture.needsUpdate = true;

                // Calculate coarse "beat" based on low frequencies
                let bassSum = 0;
                for (let i = 0; i < 20; i++) bassSum += data[i];
                const bassAvg = bassSum / 20;
                materialRef.current.uniforms.uBeat.value = THREE.MathUtils.lerp(
                    materialRef.current.uniforms.uBeat.value,
                    bassAvg / 255,
                    0.2
                );
            } else {
                // Simulated fallback if no audio is playing
                // Create a fake moving pattern
                materialRef.current.uniforms.uBeat.value = (Math.sin(state.clock.elapsedTime * 2) + 1) * 0.2;
            }
        }
    });

    // Custom Shader for "Stage Music Show" Pattern
    // Vertical equalizer bars + Plasma effect
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColor;
        uniform sampler2D uAudioData;
        uniform float uBeat;
        varying vec2 vUv;

        // Psuedo-random function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            // Visualize frequency data from texture
            // Map UV.y to frequency bins (0 to 1)
            // But usually EQ is horizontal bars going UP. 
            // So we use UV.x to select frequency, UV.y for amplitude.
            
            float freqIndex = vUv.y; // Vertical screens, so let's map freq from bottom to top? 
            // Or maybe separate bars? 
            
            // Let's do a symmetric EQ pattern from center
            // float freqCoords = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges
            
            // Design: Digital Rain / Equalizer Hybrid
            
            // 1. Audio Texture Sample
            // We sample the texture based on vertical position (low freq at bottom)
            float freqIntensity = texture2D(uAudioData, vec2(vUv.y * 0.8, 0.0)).r; 
            
            // 2. Bar Pattern
            // Quantize x to create "bars"
            float bars = step(0.1, sin(vUv.x * 40.0)); // 20 bars
            
            // 3. Dynamic Height
            // Each bar's height threshold depends on freqIntensity * randomness
            // We want the intensity to be higher at specific times
            // Mix with a scrolling plasma for "wonderful pattern"
            
            float wave = sin(vUv.y * 10.0 - uTime * 2.0) * 0.5 + 0.5;
            float pattern = smoothstep(0.4, 0.6, freqIntensity + wave * 0.2);
            
            // Better Pattern: "Sound Wave"
            float pos = (vUv.x - 0.5) * 2.0;
            float dist = abs(pos);
            
            // Sample frequency based on the 'ring' or 'height'
            // Let's do a simple classic EQ: vertical bars
            float barID = floor(vUv.x * 10.0);
            float barFreq = texture2D(uAudioData, vec2(barID / 10.0, 0.0)).r;
            
            // Make it react to simulated beat if no audio
            if (barFreq < 0.01) {
                barFreq = sin(uTime * 3.0 + barID) * 0.5 + 0.5;
                barFreq *= uBeat * 2.0 + 0.2;
            }
            
            float barMask = step(vUv.y, barFreq * 1.0); // Simple height check
            
            // Add "Stage Light" bloom
            vec3 finalColor = uColor * barMask * 2.0; // Boost brightness
            
            // Add a background subtle grid
            float grid = step(0.98, fract(vUv.x * 10.0)) + step(0.98, fract(vUv.y * 20.0));
            finalColor += uColor * grid * 0.2;
            
            // Scanline
            finalColor += uColor * sin(vUv.y * 200.0 + uTime * 10.0) * 0.05;

            // Opacity
            float alpha = 0.8 * (barMask + 0.1); 
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <boxGeometry args={scale} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    transparent
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            {/* Frame */}
            <mesh>
                <boxGeometry args={[scale[0] + 0.1, scale[1] + 0.1, scale[2] - 0.1]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
            </mesh>
        </group>
    );
};
