import * as THREE from 'three';
import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { Html, Sky, Environment, Sparkles } from '@react-three/drei';
import { HoloProjector } from './HoloProjector';
import { PythonEditor } from './PythonEditor';

interface DesertRoomProps {
    onPythonError?: (code: string, errorMessage: string) => void;
    voiceCommandCode?: string | null;
    getFrequencyData?: () => Uint8Array | null;
    hologramData: any;
    setHologramData: (data: any) => void;
}

export const DesertRoom: React.FC<DesertRoomProps> = ({
    onPythonError,
    voiceCommandCode,
    getFrequencyData: _getFrequencyData,
    hologramData,
    setHologramData
}) => {

    // Procedural Sand Texture
    const sandTexture = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const ctx = c.getContext('2d')!;

        // Base Sand Color Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
        gradient.addColorStop(0, '#e6c288');
        gradient.addColorStop(1, '#d4a373');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);

        // Add Noise/Grain
        for (let i = 0; i < 100000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const brightness = Math.random();
            ctx.fillStyle = brightness > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            ctx.fillRect(x, y, 2, 2);
        }

        // Add Dune Ripples (Sine waves)
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let y = 0; y < 1024; y += 4) {
            const offset = Math.sin(y * 0.05) * 10;
            if (y % 8 === 0) ctx.fillRect(0, y + offset, 1024, 2);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(12, 12);
        return tex;
    }, []);

    // Effect: Heat Haze / Shimmer (Simulated with particles for now)
    // Real heat haze needs post-processing, but particles work for "Dust"

    // Scattered Rocks
    const rockCount = 50;
    const rockRef = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        if (!rockRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < rockCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 80;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            dummy.position.set(x, 0.2, z);
            const s = 0.5 + Math.random() * 2;
            dummy.scale.set(s, s * 0.6, s);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.updateMatrix();
            rockRef.current.setMatrixAt(i, dummy.matrix);
        }
        rockRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    // Dry Bushes / Dead Plants
    const bushCount = 100;
    const bushRef = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        if (!bushRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < bushCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 8 + Math.random() * 85;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            dummy.position.set(x, 0, z);
            const s = 0.8 + Math.random() * 0.5;
            dummy.scale.set(s, s, s);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();
            bushRef.current.setMatrixAt(i, dummy.matrix);
        }
        bushRef.current.instanceMatrix.needsUpdate = true;
    }, []);


    return (
        <group>
            {/* --- ATMOSPHERE --- */}
            <Sky
                distance={450000}
                sunPosition={[0, 50, -100]} // High, harsh sun
                turbidity={0.8} // Dustier
                rayleigh={0.1} // More yellow/white sky
                mieCoefficient={0.01} // Hazy
                mieDirectionalG={0.7}
            />
            <Environment preset="sunset" background={false} />

            {/* Harsh Sun Light */}
            <directionalLight
                position={[50, 100, 20]}
                intensity={3.0} // Very bright
                color="#ffffdd"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
                shadow-bias={-0.0005}
            />
            {/* Warm ground reflection */}
            <ambientLight intensity={0.6} color="#eecfa1" />

            {/* --- TERRAIN --- */}
            {/* Main Sand Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <circleGeometry args={[100, 64]} />
                <meshStandardMaterial
                    map={sandTexture}
                    normalScale={new THREE.Vector2(0.5, 0.5)}
                    roughness={0.9}
                    color="#f4a460"
                />
            </mesh>

            {/* Distant Dunes (Visual only) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <ringGeometry args={[90, 200, 64]} />
                <meshStandardMaterial color="#e6c288" fog={true} />
            </mesh>

            {/* --- PROPS --- */}
            {/* Rocks */}
            <instancedMesh ref={rockRef} args={[undefined, undefined, rockCount]} castShadow receiveShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#8b4513" roughness={0.9} />
            </instancedMesh>

            {/* Dry Bushes (Tumbleweeds styled) */}
            <instancedMesh ref={bushRef} args={[undefined, undefined, bushCount]} castShadow>
                <dodecahedronGeometry args={[0.5, 1]} /> {/* Spiky sphere */}
                <meshStandardMaterial color="#5c4033" roughness={1} wireframe={true} /> {/* Wireframe looks like twigs! */}
            </instancedMesh>

            {/* Particles - dust specks */}
            <Sparkles count={200} scale={40} size={4} speed={0.2} opacity={0.4} color="#ffd700" position={[0, 5, 0]} />


            {/* --- FUNCTIONAL ELEMENTS (Aligned) --- */}

            {/* Left Screen - Python Editor (Weathered Wood / Sandstone) */}
            <group position={[-14, 4, -4]} rotation={[0, 0.6, 0]}>
                <mesh position={[0, 0, -0.1]} receiveShadow castShadow>
                    {/* Worn/Bleached Wood Board */}
                    <boxGeometry args={[7.2, 5.2, 0.15]} />
                    <meshStandardMaterial color="#d2b48c" roughness={1} />
                </mesh>
                {/* Legs - Driftwood style */}
                <mesh position={[-3, -4.5, 0.5]} rotation={[0.1, 0, 0.05]} castShadow>
                    <cylinderGeometry args={[0.12, 0.08, 10, 6]} />
                    <meshStandardMaterial color="#8b7355" />
                </mesh>
                <mesh position={[3, -4.5, 0.5]} rotation={[0.1, 0, -0.05]} castShadow>
                    <cylinderGeometry args={[0.12, 0.08, 10, 6]} />
                    <meshStandardMaterial color="#8b7355" />
                </mesh>

                <Suspense fallback={null}>
                    <Html transform position={[0, 0, 0.05]} scale={0.5} style={{ width: '600px', height: '400px' }}>
                        <PythonEditor
                            onError={onPythonError}
                            onShapeGenerated={setHologramData}
                            externalCode={voiceCommandCode || undefined}
                        />
                    </Html>
                </Suspense>
            </group>

            {/* Right Screen - Holo Projector (Ancient Sandstone Pillar) */}
            <group position={[14, 4, -4]} rotation={[0, -0.6, 0]}>
                {/* Sandstone Pillar - Eroded */}
                <mesh position={[0, -2.5, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[1.4, 1.8, 5, 6]} /> {/* 6 segments for hewn stone look */}
                    <meshStandardMaterial color="#c2b280" roughness={1} />
                </mesh>
                {/* Top cap */}
                <mesh position={[0, 0.1, 0]} receiveShadow>
                    <cylinderGeometry args={[1.5, 1.4, 0.2, 6]} />
                    <meshStandardMaterial color="#c2b280" roughness={1} />
                </mesh>

                <HoloProjector
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    shapeData={hologramData}
                />
            </group>

        </group>
    );
};
