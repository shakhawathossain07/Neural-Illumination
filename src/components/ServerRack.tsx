import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ServerRackProps {
    position: [number, number, number];
    lightCount: number;
    color1?: string;
    color2?: string;
    getFrequencyData?: () => Uint8Array | null;
}

export const ServerRack: React.FC<ServerRackProps> = ({
    position,
    lightCount,
    color1 = "#22d3ee",
    color2 = "#d946ef",
    getFrequencyData
}) => {
    // Array of refs for each light material to update them individually without re-rendering
    const lightMaterialRefs = useRef<THREE.MeshBasicMaterial[]>([]);

    useFrame(() => {
        if (!getFrequencyData) return;

        const data = getFrequencyData();
        let volume = 0;

        if (data) {
            // Calculate average volume from lower frequencies (bass/mids) for better visual impact
            let sum = 0;
            const samples = 30; // Check first 30 bins
            for (let i = 0; i < samples; i++) {
                sum += data[i];
            }
            volume = sum / samples; // 0-255
        } else {
            // Idle animation if no audio
            volume = 0;
        }

        // Normalize volume to 0-1
        const intensity = volume / 255;

        // Update lights to act like a VU meter
        // If intensity is high, more lights light up from bottom to top
        const activeIndex = Math.floor(intensity * (lightCount + 2)); // +2 to make it easier to hit max

        lightMaterialRefs.current.forEach((mat, index) => {
            if (!mat) return;

            // Invert index because we want bottom (index 0?) to be always on?
            // Actually in the original loop: y = -4 + j * ...
            // So index 0 is at bottom (-4).

            const isLit = index <= activeIndex;

            if (data) {
                // Audio Reactivity Mode
                const baseColor = new THREE.Color(index % 2 === 0 ? color1 : color2);

                if (isLit) {
                    // Lit: Bright color
                    mat.color.copy(baseColor).multiplyScalar(1.5); // Bloom boost
                    mat.opacity = 0.8;
                } else {
                    // Dim: faint color
                    mat.color.copy(baseColor).multiplyScalar(0.1);
                    mat.opacity = 0.1;
                }
            } else {
                // Default Idle Mode (Random blinking)
                if (Math.random() > 0.98) {
                    mat.opacity = mat.opacity === 0.2 ? 0.8 : 0.2;
                }
            }
        });
    });

    return (
        <group position={position}>
            {/* Main Cabinet */}
            <mesh>
                <boxGeometry args={[2, 12, 2]} />
                <meshStandardMaterial color="#0a0a12" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Data Lights */}
            {Array.from({ length: lightCount }).map((_, j) => (
                <mesh key={j} position={[0, -4 + j * (10 / lightCount), 1.01]}>
                    <planeGeometry args={[1.5, 0.1]} />
                    <meshBasicMaterial
                        ref={(el) => { if (el) lightMaterialRefs.current[j] = el; }}
                        color={j % 2 === 0 ? color1 : color2}
                        toneMapped={false}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}
        </group>
    );
};
