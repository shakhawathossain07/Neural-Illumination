import * as THREE from 'three';
import React, { useRef, useEffect, Suspense } from 'react';
// import { useFrame } from '@react-three/fiber'; // Removed unused
import { Cloud, Html, Environment, Sparkles, Sky } from '@react-three/drei';
import { HoloProjector } from './HoloProjector';
import { PythonEditor } from './PythonEditor';

interface IcelandRoomProps {
    onPythonError?: (code: string, errorMessage: string) => void;
    voiceCommandCode?: string | null;
    hologramData: any;
    setHologramData: (data: any) => void;
}

export const IcelandRoom: React.FC<IcelandRoomProps> = ({
    onPythonError,
    voiceCommandCode,
    hologramData,
    setHologramData
}) => {

    // --- PROCEDURAL MATERIALS ---
    // Water Logic: Simple high-gloss plane for now as base
    // Ice Material: Physical material with transmission

    // --- INSTANCED ICEBERGS ---
    const iceCount = 50;
    const iceRef = useRef<THREE.InstancedMesh>(null);
    const iceRef2 = useRef<THREE.InstancedMesh>(null); // Smaller chunks

    useEffect(() => {
        if (!iceRef.current) return;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < iceCount; i++) {
            // Scatter widely
            const r = 20 + Math.random() * 80;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            // Icebergs float at various heights (mostly submerged)
            dummy.position.set(x, (Math.random() - 0.5) * 2, z);

            const scale = 3 + Math.random() * 10;
            dummy.scale.set(scale, scale * 0.6, scale);
            dummy.rotation.set(Math.random(), Math.random(), Math.random());

            dummy.updateMatrix();
            iceRef.current.setMatrixAt(i, dummy.matrix);

            // Varied color (white/cyan)
            const c = new THREE.Color().setHSL(0.55, 0.4, 0.9 + Math.random() * 0.1);
            iceRef.current.setColorAt(i, c);
        }
        iceRef.current.instanceMatrix.needsUpdate = true;
        if (iceRef.current.instanceColor) iceRef.current.instanceColor.needsUpdate = true;

    }, []);

    // Smaller chunks
    useEffect(() => {
        if (!iceRef2.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 90;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            dummy.position.set(x, 0, z);
            const s = 0.5 + Math.random();
            dummy.scale.set(s, s * 0.5, s);
            dummy.rotation.set(Math.random(), Math.random(), Math.random());
            dummy.updateMatrix();
            iceRef2.current.setMatrixAt(i, dummy.matrix);

            const c = new THREE.Color().setHSL(0.55, 0.8, 0.95);
            iceRef2.current.setColorAt(i, c);
        }
        iceRef2.current.instanceMatrix.needsUpdate = true;
        if (iceRef2.current.instanceColor) iceRef2.current.instanceColor.needsUpdate = true;
    }, []);

    // Bobbing Animation - Removed for static stability
    // useFrame block removed


    return (
        <group>
            {/* --- ATMOSPHERE --- */}

            {/* Bright Day Sky */}
            <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
            <ambientLight intensity={0.8} color="#cceeff" />
            <directionalLight
                position={[100, 50, 50]}
                intensity={1.5}
                color="#ffffff"
                castShadow
                shadow-bias={-0.0005}
            />
            {/* Fog to blend horizon into sky */}
            <fogExp2 attach="fog" args={['#e0f7fa', 0.015]} />

            <Environment preset="city" background={false} />

            {/* Clouds */}
            <Suspense fallback={null}>
                <Cloud position={[0, 30, -50]} segments={10} bounds={[50, 5, 20]} volume={20} color="white" opacity={0.8} speed={0.2} />
                <Cloud position={[-50, 30, 0]} segments={10} bounds={[20, 5, 50]} volume={20} color="white" opacity={0.8} speed={0.2} />
            </Suspense>

            {/* Snow/Sparkles */}
            <Sparkles count={500} scale={60} size={3} speed={0.4} opacity={0.6} color="#ffffff" position={[0, 10, 0]} />


            {/* --- GROUND/WATER --- */}
            {/* Reflective Water Surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.5, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial
                    color="#1e3a8a" // Deep Blue
                    roughness={0.05}
                    metalness={0.6}
                    envMapIntensity={1.2}
                />
            </mesh>

            {/* --- FEATURES --- */}

            {/* Large Icebergs */}
            <instancedMesh ref={iceRef} args={[undefined, undefined, iceCount]} castShadow receiveShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial
                    roughness={0.2}
                    metalness={0.1}
                    transmission={0.6}
                    thickness={1.5}
                    ior={1.31} // Ice IOR
                    color="#e0f2fe"
                />
            </instancedMesh>

            {/* Small Ice Chunks */}
            <instancedMesh ref={iceRef2} args={[undefined, undefined, 200]} castShadow receiveShadow>
                <icosahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial
                    roughness={0.3}
                    metalness={0.1}
                    color="#ffffff"
                />
            </instancedMesh>


            {/* --- FUNCTIONAL ELEMENTS (Placed on floating rafts) --- */}

            {/* Left Screen - Python Editor */}
            <group position={[-14, 4, -4]} rotation={[0, 0.6, 0]}>
                {/* Floating Ice Slab/Raft */}
                <mesh position={[0, -2, -1]} receiveShadow>
                    {/* Flattened shape */}
                    <cylinderGeometry args={[5, 6, 2, 7]} />
                    <meshPhysicalMaterial color="#fff" roughness={0.4} />
                </mesh>

                <mesh position={[0, 0, -0.1]} receiveShadow castShadow>
                    {/* Frame - Frosted Glass look */}
                    <boxGeometry args={[7.2, 5.2, 0.15]} />
                    <meshPhysicalMaterial
                        color="#a5f3fc"
                        roughness={0.2}
                        transmission={0.8}
                        thickness={1}
                    />
                </mesh>

                {/* Legs - Icicles */}
                <mesh position={[-3, -4.5, 0.5]} rotation={[0, 0, 0]} castShadow>
                    <coneGeometry args={[0.2, 10, 6]} />
                    <meshPhysicalMaterial color="#cff" transmission={0.5} roughness={0.1} />
                </mesh>
                <mesh position={[3, -4.5, 0.5]} rotation={[0, 0, 0]} castShadow>
                    <coneGeometry args={[0.2, 10, 6]} />
                    <meshPhysicalMaterial color="#cff" transmission={0.5} roughness={0.1} />
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

            {/* Right Screen - Holo Projector */}
            <group position={[14, 4, -4]} rotation={[0, -0.6, 0]}>
                {/* Ice Pedestal */}
                <mesh position={[0, -5, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[2, 3, 6, 5]} />
                    <meshPhysicalMaterial color="#fff" roughness={0.3} />
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
