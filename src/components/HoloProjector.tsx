import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Center } from '@react-three/drei';
import * as THREE from 'three';

interface InternalShapeData {
    shape: 'box' | 'sphere' | 'cylinder' | 'torus' | 'cone' | 'icosahedron' | 'knot' | 'heart';
    color?: string;
    size?: number | [number, number, number];
    wireframe?: boolean;
    rotation?: [number, number, number];
    animate?: boolean; // If true, spins
}

interface HoloProjectorProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    shapeData?: InternalShapeData | null;
}

export const HoloProjector: React.FC<HoloProjectorProps> = ({
    position,
    rotation = [0, 0, 0],
    shapeData
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const shapeRef = useRef<THREE.Mesh>(null);

    // Holographic Material
    const materialParams = useMemo(() => ({
        transparent: true,
        opacity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
        vertexColors: false,
    }), []);

    useFrame((_state, delta) => {
        if (shapeRef.current && shapeData?.animate) {
            shapeRef.current.rotation.y += delta * 0.5;
            shapeRef.current.rotation.x += delta * 0.2;
        }
    });

    const renderShape = () => {
        if (!shapeData) return null;

        const color = shapeData.color || "#d946ef";
        const wireframe = shapeData.wireframe !== false; // Default to true for holo look

        let geometry;
        const size = shapeData.size;

        // Helper to normalize size to args array
        const getArgs = (def: any) => {
            if (Array.isArray(size)) return size;
            if (typeof size === 'number') return [size, size, size];
            return def;
        };

        // Normalize shape to lowercase for case-insensitive matching
        const normalizedShape = (shapeData.shape || 'box').toLowerCase();
        console.log("🔷 HoloProjector rendering shape:", normalizedShape, "| Original:", shapeData.shape);

        switch (normalizedShape) {
            case 'box':
                geometry = <boxGeometry args={getArgs([2, 2, 2]) as any} />;
                break;
            case 'sphere':
                // args: [radius, widthSegments, heightSegments]
                const r = typeof size === 'number' ? size : 1.5;
                geometry = <sphereGeometry args={[r, 32, 32]} />;
                break;
            case 'cylinder':
                // [radiusTop, radiusBottom, height, radialSegments]
                const cr = typeof size === 'number' ? size : 1;
                geometry = <cylinderGeometry args={[cr, cr, 2, 32]} />;
                break;
            case 'cone':
                const cor = typeof size === 'number' ? size : 1.5;
                geometry = <coneGeometry args={[cor, 3, 32]} />;
                break;
            case 'torus':
                // [radius, tube, radialSegments, tubularSegments]
                const tr = typeof size === 'number' ? size : 1.5;
                geometry = <torusGeometry args={[tr, 0.4, 16, 100]} />;
                break;
            case 'icosahedron':
                const ir = typeof size === 'number' ? size : 1.5;
                geometry = <icosahedronGeometry args={[ir, 0]} />;
                break;
            case 'knot':
                geometry = <torusKnotGeometry args={[1, 0.3, 100, 16]} />;
                break;
            case 'heart':
                const x = 0, y = 0;
                const heartShape = new THREE.Shape();
                heartShape.moveTo(x + 5, y + 5);
                heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
                heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
                heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
                heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
                heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
                heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

                // Scale it down significantly as the shape coordinates are large
                // (Scaling is handled by the mesh finalScale later)

                geometry = (
                    <extrudeGeometry
                        args={[heartShape, { depth: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 }]}
                    />
                );
                // Heart needs rotation to stand up and center adjustment
                // We'll wrap it in a group in the return to handle local transforms if needed, 
                // but geometry itself is returned here. 
                // To fix the pivot we might need to translate.
                break;
            default:
                geometry = <boxGeometry args={[2, 2, 2]} />;
        }

        const isHeart = shapeData.shape === 'heart';

        // Calculate scale safely based on shape type
        let finalScale = [1, 1, 1];
        if (isHeart) {
            const sizeVal = typeof shapeData.size === 'number' ? shapeData.size : 1.5;
            const heartS = sizeVal * 0.1;
            finalScale = [heartS, heartS, heartS];
        }

        return (
            <Center top>
                <mesh ref={shapeRef} scale={finalScale as any} rotation={isHeart ? [0, 0, Math.PI] : [0, 0, 0]}>
                    {geometry}
                    <meshPhysicalMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={2}
                        {...materialParams}
                        wireframe={wireframe}
                    />
                </mesh>
                {/* Glow/Core */}
                <mesh scale={[0.9, 0.9, 0.9]} rotation={isHeart ? [0, 0, Math.PI] : [0, 0, 0]}>
                    {geometry}
                    <meshBasicMaterial color={color} transparent opacity={0.1} />
                </mesh>
            </Center>
        );
    };

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Base Projector Unit */}
            <mesh position={[0, -2.5, 0]}>
                <cylinderGeometry args={[2, 2.5, 0.5, 32]} />
                <meshStandardMaterial color="#0a0a12" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -2.2, 0]}>
                <cylinderGeometry args={[1.5, 0.5, 0.2, 32, 1, true]} />
                <meshBasicMaterial color="#d946ef" opacity={0.5} transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Holographic Cone/Beam Effect */}
            <mesh position={[0, 0, 0]}>
                <coneGeometry args={[3, 5, 32, 1, true]} />
                <meshBasicMaterial
                    color="#d946ef"
                    transparent
                    opacity={0.03}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Content */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} position={[0, 0.5, 0]}>
                {shapeData ? (
                    renderShape()
                ) : (
                    // Default State
                    <group>
                        <Text
                            position={[0, 0.5, 0]}
                            fontSize={0.4}
                            color="#d946ef"
                            anchorX="center"
                            anchorY="middle"
                        >
                            NURAL GRAPHICS
                        </Text>
                        <Text
                            position={[0, -0.2, 0]}
                            fontSize={0.15}
                            color="#d946ef"
                            anchorX="center"
                            anchorY="middle"
                            fillOpacity={0.7}
                        >
                            AWAITING INPUT...
                        </Text>
                        {/* Idle Animation Geometry */}
                        <mesh rotation={[0, 0, Math.PI / 4]}>
                            <torusGeometry args={[1.5, 0.02, 16, 100]} />
                            <meshBasicMaterial color="#d946ef" transparent opacity={0.3} />
                        </mesh>
                    </group>
                )}
            </Float>
        </group>
    );
};
