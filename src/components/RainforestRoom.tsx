import * as THREE from 'three';
import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import { HoloProjector } from './HoloProjector';
import { PythonEditor } from './PythonEditor';

interface RainforestRoomProps {
    onPythonError?: (code: string, errorMessage: string) => void;
    voiceCommandCode?: string | null;
    getFrequencyData?: () => Uint8Array | null;
    hologramData: any;
    setHologramData: (data: any) => void;
}

const RainShaderMaterial = {
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#aaccff') },
        heightRange: { value: 40.0 }
    },
    vertexShader: `
        uniform float time;
        uniform float heightRange;
        attribute float speed;
        attribute float opacityAttr;
        varying float vOpacity;
        
        void main() {
            vOpacity = opacityAttr;
            vec3 pos = position;
            
            // Get instance position from matrix
            vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            
            // Animate Y
            float fallSpeed = 15.0 + speed * 10.0;
            float newY = mod(instancePos.y - time * fallSpeed, heightRange);
            if(newY < 0.0) newY += heightRange;
            
            // Re-apply to world position (keep X/Z, update Y)
            vec3 worldPos = vec3(instancePos.x, newY, instancePos.z);
            
            // Wind effect (slight drift)
            worldPos.x += sin(time * 0.5 + worldPos.z * 0.1) * 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos + pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;
        void main() {
            gl_FragColor = vec4(color, vOpacity);
        }
    `,
    transparent: true,
    depthWrite: false
};

const Rain: React.FC = () => {
    const count = 8000;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (!meshRef.current) return;

        const dummy = new THREE.Object3D();
        const speeds = new Float32Array(count);
        const opacities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            dummy.position.set(
                (Math.random() - 0.5) * 100, // X
                Math.random() * 40,          // Y
                (Math.random() - 0.5) * 100  // Z
            );
            // Slight rotation to match "wind" mostly vertical
            dummy.rotation.x = 0.1;
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            speeds[i] = Math.random();
            opacities[i] = 0.3 + Math.random() * 0.4;
        }
        meshRef.current.instanceMatrix.needsUpdate = true;

        // Add attributes
        meshRef.current.geometry.setAttribute('speed', new THREE.InstancedBufferAttribute(speeds, 1));
        meshRef.current.geometry.setAttribute('opacityAttr', new THREE.InstancedBufferAttribute(opacities, 1));

    }, []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <boxGeometry args={[0.02, 0.4, 0.02]} />
            <shaderMaterial ref={materialRef} {...RainShaderMaterial} />
        </instancedMesh>
    );
};

export const RainforestRoom: React.FC<RainforestRoomProps> = ({
    onPythonError,
    voiceCommandCode,
    getFrequencyData: _getFrequencyData,
    hologramData,
    setHologramData
}) => {

    // --- PROCEDURAL TEXTURES ---
    const groundTexture = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const ctx = c.getContext('2d')!;

        // Dark Muddy Background
        ctx.fillStyle = '#1a140e';
        ctx.fillRect(0, 0, 1024, 1024);

        // Mossy patches
        for (let i = 0; i < 20000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = Math.random() * 4 + 2;
            ctx.fillStyle = Math.random() > 0.5 ? '#1e3312' : '#0f1a0b'; // Dark greens
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x, y, size, size);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(16, 16);
        return tex;
    }, []);

    // --- INSTANCED TREES ---
    const treeCount = 80;
    const trunkRef = useRef<THREE.InstancedMesh>(null);
    const foliageRef = useRef<THREE.InstancedMesh>(null);

    useEffect(() => {
        if (!trunkRef.current || !foliageRef.current) return;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < treeCount; i++) {
            // Keep center clear-ish
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * 70; // Start further out
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            // Trunks
            dummy.position.set(x, 10, z); // Center of 20 high trunk
            const scaleY = 1 + Math.random() * 0.5;
            dummy.scale.set(1 + Math.random(), scaleY, 1 + Math.random());
            dummy.rotation.set((Math.random() - 0.5) * 0.1, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
            dummy.updateMatrix();
            trunkRef.current.setMatrixAt(i, dummy.matrix);

            // Foliage (Clusters on top)
            dummy.position.set(x, 18 * scaleY, z);
            dummy.scale.set(6, 4, 6);
            dummy.rotation.set(Math.random(), Math.random(), Math.random());
            dummy.updateMatrix();
            foliageRef.current.setMatrixAt(i, dummy.matrix);
        }
        trunkRef.current.instanceMatrix.needsUpdate = true;
        foliageRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    // --- UNDERGROWTH (Ferns) using modified grass logic ---
    const fernCount = 20000;
    const fernRef = useRef<THREE.InstancedMesh>(null);
    useEffect(() => {
        if (!fernRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < fernCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.5) * 90;
            const x = Math.sin(angle) * r;
            const z = Math.cos(angle) * r;

            if (Math.sqrt(x * x + z * z) < 5) continue; // Clear center

            dummy.position.set(x, 0, z);
            const s = 1 + Math.random();
            dummy.scale.set(s, s * 0.8, s);
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);

            // Bunching effect - random offset from grid to look organic
            dummy.updateMatrix();
            fernRef.current.setMatrixAt(i, dummy.matrix);
        }
        fernRef.current.instanceMatrix.needsUpdate = true;
    }, []);


    return (
        <group>
            {/* --- ATMOSPHERE --- */}
            <fog attach="fog" args={['#051a05', 5, 60]} /> {/* Dense green fog */}

            {/* Mood Lighting - Dappled/Dim */}
            <ambientLight intensity={0.2} color="#052205" />
            <directionalLight
                position={[50, 80, 20]}
                intensity={1.5}
                color="#aaffaa"
                castShadow
                shadow-bias={-0.0005}
            />
            {/* Rim light for spooky vibes */}
            <pointLight position={[-30, 10, -30]} intensity={1} color="#44ff44" distance={50} />

            {/* Falling Fireflies/Spores - maintained for atmosphere */}
            <Sparkles count={300} scale={60} size={4} speed={0.4} opacity={0.6} color="#88ff88" position={[0, 10, 0]} />

            {/* --- RAIN --- */}
            <Rain />

            {/* --- GROUND --- */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <circleGeometry args={[100, 64]} />
                <meshStandardMaterial
                    map={groundTexture}
                    roughness={0.6}
                    color="#aaa" // tint
                />
            </mesh>

            {/* --- VEGETATION --- */}
            {/* Trees */}
            <instancedMesh ref={trunkRef} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
                <cylinderGeometry args={[0.8, 1.2, 20, 8]} />
                <meshStandardMaterial color="#3e2723" roughness={0.9} />
            </instancedMesh>
            <instancedMesh ref={foliageRef} args={[undefined, undefined, treeCount]} castShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#1a4710" roughness={0.8} />
            </instancedMesh>

            {/* Ferns (Simple cones for now, scaled flat) */}
            <instancedMesh ref={fernRef} args={[undefined, undefined, fernCount]} receiveShadow>
                <coneGeometry args={[0.3, 0.8, 4]} />
                <meshStandardMaterial color="#2d5a27" roughness={0.7} side={THREE.DoubleSide} />
            </instancedMesh>


            {/* --- FUNCTIONAL ELEMENTS (Aligned) --- */}

            {/* Left Screen - Python Editor (Overgrown Runestone) */}
            <group position={[-14, 4, -4]} rotation={[0, 0.6, 0]}>
                <mesh position={[0, 0, -0.1]} receiveShadow castShadow>
                    {/* Mossy Stone Slab */}
                    <boxGeometry args={[7.2, 5.2, 0.15]} />
                    <meshStandardMaterial color="#4a5d43" roughness={0.8} />
                </mesh>
                {/* Vines hanging off? (Simple green tubes) */}
                <mesh position={[-3.5, 0, 0]} rotation={[0, 0, 0.1]}>
                    <cylinderGeometry args={[0.05, 0.05, 5, 5]} />
                    <meshStandardMaterial color="#2d5a27" />
                </mesh>

                {/* Legs - Stone Pillars */}
                <mesh position={[-3, -4.5, 0.5]} rotation={[0.1, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.15, 0.2, 10, 6]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <mesh position={[3, -4.5, 0.5]} rotation={[0.1, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.15, 0.2, 10, 6]} />
                    <meshStandardMaterial color="#333" />
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

            {/* Right Screen - Holo Projector (Jungle Altar) */}
            <group position={[14, 4, -4]} rotation={[0, -0.6, 0]}>
                {/* Altar Base */}
                <mesh position={[0, -3.5, 0]} receiveShadow castShadow>
                    <boxGeometry args={[2, 4, 2]} />
                    <meshStandardMaterial color="#555" roughness={0.6} />
                </mesh>
                {/* Overgrown vines on altar */}
                <mesh position={[0.6, -2, 0.6]} rotation={[0.5, 0.5, 0]}>
                    <torusGeometry args={[1, 0.1, 8, 20]} />
                    <meshStandardMaterial color="#2d5a27" />
                </mesh>
                // Floating top stone
                <mesh position={[0, -1, 0]} receiveShadow>
                    <boxGeometry args={[2.2, 0.4, 2.2]} />
                    <meshStandardMaterial color="#444" roughness={0.7} />
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
