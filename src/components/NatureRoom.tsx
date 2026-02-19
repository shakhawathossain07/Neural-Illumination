import * as THREE from 'three';
import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Html, Sky, Sparkles } from '@react-three/drei';
import { HoloProjector } from './HoloProjector';
import { PythonEditor } from './PythonEditor';

interface NatureRoomProps {
    onPythonError?: (code: string, errorMessage: string) => void;
    voiceCommandCode?: string | null;
    getFrequencyData?: () => Uint8Array | null;
    hologramData: any;
    setHologramData: (data: any) => void;
}

// Custom shader for realistic grass with wind and gradient
const GrassShaderMaterial = {
    uniforms: {
        time: { value: 0 },
        windStrength: { value: 0.5 },
        windFrequency: { value: 1.5 },
    },
    vertexShader: `
        uniform float time;
        uniform float windStrength;
        uniform float windFrequency;
        varying vec3 vColor;
        varying float vHeight;
        
        // Simplex noise for wind variation
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            vHeight = position.y;
            vec3 pos = position;
            
            // World position for noise
            vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            
            // Wind wave effect
            float wave = sin(time * windFrequency + worldPos.x * 0.5 + worldPos.z * 0.3);
            
            // Micro-turbulence
            float noise = random(worldPos.xz);
            
            float windEffect = (wave + noise * 0.5) * windStrength;
            
            // Apply wind only to top of blade, quadratic curve for stiffness
            float bendFactor = pow(position.y, 2.0);
            pos.x += windEffect * bendFactor;
            pos.z += windEffect * 0.3 * bendFactor;
            
            // Slight squash when bending
            pos.y *= 1.0 - abs(windEffect) * 0.1 * bendFactor;
            
            // Gradient color: Dark soil green to vibrant fresh green
            float colorMix = smoothstep(0.0, 1.0, position.y);
            vec3 baseColor = vec3(0.05, 0.15, 0.02); // Darker base
            vec3 tipColor = vec3(0.25, 0.6, 0.1);   // Vibrant tip
            vColor = mix(baseColor, tipColor, colorMix);
            
            // Add slight randomness to color per instance
            float randCol = random(worldPos.xz * 0.1);
            vColor += (randCol - 0.5) * 0.05;
            
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vHeight;
        
        void main() {
            // Simple subsurface scattering approximation (lighter edges)
            vec3 finalColor = vColor;
            
            // Shadows approximate (darker roughly at bottom)
            finalColor *= 0.5 + 0.5 * vHeight;
            
            gl_FragColor = vec4(finalColor, 1.0);
            
            // Basic dithering/alpha for softening edges if we had alpha
        }
    `
};

export const NatureRoom: React.FC<NatureRoomProps> = ({
    onPythonError,
    voiceCommandCode,
    getFrequencyData: _getFrequencyData,
    hologramData,
    setHologramData
}) => {
    // Increased count for lush look across larger area
    const grassCount = 100000;
    const grassMesh = useRef<THREE.InstancedMesh>(null);
    const grassMaterialRef = useRef<THREE.ShaderMaterial>(null);

    // Improved Grass Geometry: Curved blade
    const grassGeometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(0.08, 0.8, 1, 4);
        geo.translate(0, 0.4, 0); // Pivot at bottom

        // Manipulate vertices to shape it like a blade
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);

            // Taper width towards top
            const t = vertex.y / 0.8;
            const widthScale = 1.0 - t * t; // Quadratic taper
            vertex.x *= widthScale;

            // Curve the blade significantly
            const curve = Math.pow(t, 2.0) * 0.2;
            vertex.z += curve;

            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        geo.computeVertexNormals();
        return geo;
    }, []);

    // Initialize grass
    useEffect(() => {
        if (!grassMesh.current) return;

        const dummy = new THREE.Object3D();
        const centerClearance = 4; // Clear area radius

        for (let i = 0; i < grassCount; i++) {
            // Distribution: biased towards center but spread out
            const angle = Math.random() * Math.PI * 2;
            // Linear distribution heavily biased to fill near-mid range
            // Linear distribution heavily biased to fill near-mid range
            const r = Math.pow(Math.random(), 0.6) * 90;

            // Clamp min radius to avoid clipping inside user
            const radius = Math.max(centerClearance, r);

            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;

            dummy.position.set(x, 0, z);

            // Random scales for variety
            const scale = 0.7 + Math.random() * 0.6;
            dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);

            // Random rotation around Y
            dummy.rotation.y = Math.random() * Math.PI * 2;

            // Random lean
            dummy.rotation.x = (Math.random() - 0.5) * 0.3;
            dummy.rotation.z = (Math.random() - 0.5) * 0.3;

            dummy.updateMatrix();
            grassMesh.current.setMatrixAt(i, dummy.matrix);
        }
        grassMesh.current.instanceMatrix.needsUpdate = true;
    }, []);

    useFrame((state) => {
        if (grassMaterialRef.current) {
            grassMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    // --- FLOWERS ---
    // Using low-poly constructed geometries instead of spheres for realism
    const flowerTypes = useMemo(() => [
        // Tulip-ish (Red/Pink)
        { color: '#ff3366', scale: 0.3, yOffset: 0.3, count: 150, geometry: 'cone' },
        // Daisy-ish (White/Yellow)
        { color: '#ffffff', center: '#ffcc00', scale: 0.25, yOffset: 0.2, count: 200, geometry: 'flat' },
        // Bluebells (Blue)
        { color: '#4444ff', scale: 0.25, yOffset: 0.25, count: 120, geometry: 'bell' },
        // Goldens
        { color: '#ffaa00', scale: 0.22, yOffset: 0.2, count: 150, geometry: 'flat' }
    ], []);

    const flowerRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

    useEffect(() => {
        flowerTypes.forEach((type, idx) => {
            const mesh = flowerRefs.current[idx];
            if (!mesh) return;
            const dummy = new THREE.Object3D();

            for (let i = 0; i < type.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 5 + Math.random() * 85;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;

                // Position varies slightly in height
                dummy.position.set(x, type.yOffset + Math.random() * 0.05, z);

                const s = type.scale * (0.8 + Math.random() * 0.4);
                dummy.scale.set(s, s, s);

                // Random rotation
                dummy.rotation.y = Math.random() * Math.PI * 2;
                // Sway slightly
                dummy.rotation.z = (Math.random() - 0.5) * 0.2;

                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);

                // Add subtle color variation if supported by material (Standard supports color attribute)
                const col = new THREE.Color(type.color);
                col.offsetHSL(0.0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
                mesh.setColorAt(i, col);
            }
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        });
    }, [flowerTypes]);

    const groundTexture = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 1024;
        const ctx = c.getContext('2d')!;

        // Rich soil/grass background
        ctx.fillStyle = '#1e3812';
        ctx.fillRect(0, 0, 1024, 1024);

        // Noise - optimized count
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            // Mix of green and brown
            const isGreen = Math.random() > 0.3;
            ctx.fillStyle = isGreen
                ? `rgba(60, 100, 30, ${Math.random() * 0.3})`
                : `rgba(90, 60, 20, ${Math.random() * 0.2})`;
            const size = Math.random() * 2 + 1;
            ctx.fillRect(x, y, size, size);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(16, 16);
        return tex;
    }, []);

    return (
        <group>
            {/* --- ATMOSPHERE --- */}
            {/* Vibrant Day Sky */}
            <Sky
                distance={450000}
                sunPosition={[0, 40, -100]} // High noon sun behind
                turbidity={0.6} // Low turbidity for clear blue
                rayleigh={0.15} // Low rayleigh for deep blue
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
            />
            {/* Add some stars for depth/magic even in day? No, keep it clean day. */}

            {/* Removed Environment preset for performance */}

            {/* Sun Light - Bright and Warm */}
            <directionalLight
                position={[50, 80, 20]}
                intensity={2.0}
                color="#ffffee"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
            />
            <ambientLight intensity={0.6} color="#cceeff" /> {/* Blueish ambient for skylight */}

            {/* --- GROUND --- */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <circleGeometry args={[100, 64]} />
                <meshStandardMaterial
                    map={groundTexture}
                    normalScale={new THREE.Vector2(1, 1)}
                    roughness={1}
                />
            </mesh>

            {/* --- GRASS --- */}
            <instancedMesh
                ref={grassMesh}
                args={[grassGeometry, undefined, grassCount]}
                receiveShadow
                castShadow
            >
                <shaderMaterial
                    ref={grassMaterialRef}
                    {...GrassShaderMaterial}
                    uniforms-windStrength-value={0.4}
                    side={THREE.DoubleSide}
                />
            </instancedMesh>

            {/* --- FLOWERS --- */}
            {/* 1. Cone Flowers (Tulips) */}
            <instancedMesh
                ref={el => flowerRefs.current[0] = el}
                args={[undefined, undefined, 150]}
                castShadow
            >
                <cylinderGeometry args={[0.0, 0.2, 0.4, 6]} />
                <meshStandardMaterial roughness={0.5} />
            </instancedMesh>

            {/* 2. Flat Flowers (Daisies) */}
            <instancedMesh
                ref={el => flowerRefs.current[1] = el}
                args={[undefined, undefined, 200]}
                castShadow
            >
                <cylinderGeometry args={[0.3, 0.05, 0.1, 7]} />
                <meshStandardMaterial roughness={0.5} />
            </instancedMesh>

            {/* 3. Bluebells (Inverted cones) */}
            <instancedMesh
                ref={el => flowerRefs.current[2] = el}
                args={[undefined, undefined, 120]}
                castShadow
            >
                <cylinderGeometry args={[0.15, 0.25, 0.3, 5, 1, true]} /> {/* Open ended */}
                <meshStandardMaterial roughness={0.5} side={THREE.DoubleSide} />
            </instancedMesh>

            {/* 4. Golden Flowers */}
            <instancedMesh
                ref={el => flowerRefs.current[3] = el}
                args={[undefined, undefined, 150]}
                castShadow
            >
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial roughness={0.5} />
            </instancedMesh>

            {/* Magic Sparkles/Pollen - optimized */}
            <Sparkles count={100} scale={20} size={2} speed={0.3} opacity={0.3} color="#ffffcc" position={[0, 2, 0]} />


            {/* --- CLOUDS (optimized segments) --- */}
            <Cloud position={[-10, 15, -20]} speed={0.15} opacity={0.7} segments={8} bounds={[8, 2, 2]} volume={6} color="white" />
            <Cloud position={[15, 18, -10]} speed={0.15} opacity={0.6} segments={8} bounds={[8, 2, 2]} volume={6} color="white" />

            {/* --- PROPS --- */}
            {/* Left Screen - Python Editor */}
            {/* Left Screen - Python Editor (Aligned with CyberRoom) */}
            <group position={[-14, 4, -4]} rotation={[0, 0.6, 0]}>
                <mesh position={[0, 0, -0.1]} receiveShadow castShadow>
                    {/* Roughly natural wood plank board */}
                    <boxGeometry args={[7.2, 5.2, 0.15]} />
                    <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
                </mesh>
                {/* Legs for the board stand - Extended for new height */}
                <mesh position={[-3, -4.5, 0.5]} rotation={[0.1, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
                    <meshStandardMaterial color="#5c3a21" />
                </mesh>
                <mesh position={[3, -4.5, 0.5]} rotation={[0.1, 0, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
                    <meshStandardMaterial color="#5c3a21" />
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
            {/* Right Screen - Holo Projector (Aligned with CyberRoom) */}
            <group position={[14, 4, -4]} rotation={[0, -0.6, 0]}>
                {/* Natural Mossy Rock Pedestal - Extended */}
                <mesh position={[0, -2.5, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[1.5, 2, 5, 7]} />
                    <meshStandardMaterial color="#555" roughness={0.8} />
                </mesh>
                <mesh position={[0.2, -0.5, -0.2]} receiveShadow>
                    <sphereGeometry args={[0.6, 8, 8]} />
                    <meshStandardMaterial color="#3a5f0b" roughness={1} />
                </mesh>

                <HoloProjector
                    position={[0, 0, 0]} // Directly at group center (y=4 world)
                    rotation={[0, 0, 0]}
                    shapeData={hologramData}
                />
            </group>

        </group>
    );
};
