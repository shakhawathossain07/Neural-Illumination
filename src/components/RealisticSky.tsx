import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePerformanceSettings } from '../hooks/usePerformanceSettings';

export const RealisticSky: React.FC = () => {
    const { settings } = usePerformanceSettings();
    const moonRef = useRef<THREE.Mesh>(null);

    // Moon texture (procedural craters)
    const moonMaterial = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        // Base moon color
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(0, 0, 256, 256);

        // Add craters
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 20 + 5;

            // Crater shadow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, 'rgba(180, 180, 180, 0.8)');
            gradient.addColorStop(0.7, 'rgba(200, 200, 200, 0.5)');
            gradient.addColorStop(1, 'rgba(220, 220, 220, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);

        return new THREE.MeshBasicMaterial({
            map: texture,
            color: '#fffde7',
        });
    }, []);

    // Subtle moon rotation
    useFrame((state) => {
        if (moonRef.current) {
            moonRef.current.rotation.y = state.clock.elapsedTime * 0.01;
        }
    });

    // Pre-compute stars with memoization
    const starsComponent = useMemo(() => {
        const starCount = settings.starCount;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 90 + Math.random() * 5;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }

        return (
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.3}
                    color="#ffffff"
                    sizeAttenuation
                    transparent
                    opacity={0.9}
                />
            </points>
        );
    }, [settings.starCount]);

    const geoDetail = settings.geometryDetail;
    const halfGeoDetail = Math.floor(geoDetail / 2);

    return (
        <group>
            {/* --- SKY DOME --- */}
            <mesh>
                <sphereGeometry args={[100, geoDetail, geoDetail]} />
                <meshBasicMaterial side={THREE.BackSide} color="#020510" />
            </mesh>

            {/* --- GRADIENT HORIZON (Hemisphere) --- */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[99, geoDetail, halfGeoDetail, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <shaderMaterial
                    side={THREE.BackSide}
                    transparent
                    uniforms={{
                        topColor: { value: new THREE.Color('#000510') },
                        bottomColor: { value: new THREE.Color('#0a1a30') },
                        offset: { value: 10 },
                        exponent: { value: 0.8 }
                    }}
                    vertexShader={`
                        varying vec3 vWorldPosition;
                        void main() {
                            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                            vWorldPosition = worldPosition.xyz;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform vec3 topColor;
                        uniform vec3 bottomColor;
                        uniform float offset;
                        uniform float exponent;
                        varying vec3 vWorldPosition;
                        void main() {
                            float h = normalize(vWorldPosition + offset).y;
                            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                        }
                    `}
                />
            </mesh>

            {/* --- THE MOON --- */}
            <mesh ref={moonRef} position={[40, 50, -80]}>
                <sphereGeometry args={[8, geoDetail, geoDetail]} />
                <primitive object={moonMaterial} attach="material" />
            </mesh>

            {/* Moon Glow */}
            <mesh position={[40, 50, -80]}>
                <sphereGeometry args={[12, halfGeoDetail, halfGeoDetail]} />
                <meshBasicMaterial
                    color="#fffde7"
                    transparent
                    opacity={0.1}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Moon Light */}
            <directionalLight
                position={[40, 50, -80]}
                intensity={0.3}
                color="#b0c4de"
            />

            {/* --- STARS --- */}
            {starsComponent}

            {/* --- NEBULA CLOUDS (Conditional for performance) --- */}
            {settings.quality !== 'low' && (
                <>
                    <mesh position={[-60, 30, -85]} rotation={[0, 0.5, 0]}>
                        <planeGeometry args={[80, 40]} />
                        <meshBasicMaterial
                            color="#4a0080"
                            transparent
                            opacity={0.03}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    <mesh position={[50, 40, -90]} rotation={[0, -0.3, 0.2]}>
                        <planeGeometry args={[60, 30]} />
                        <meshBasicMaterial
                            color="#003366"
                            transparent
                            opacity={0.02}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </>
            )}
        </group>
    );
};
