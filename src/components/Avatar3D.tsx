import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { Character } from '../types/Character';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { usePerformanceSettings } from '../hooks/usePerformanceSettings';
import { VoiceControls } from './VoiceControls';

interface Avatar3DProps {
    character: Character;
    worldSize?: number;
    isPlayerControlled?: boolean;
    voiceState?: 'idle' | 'listening' | 'thinking' | 'speaking';
    voiceTranscript?: string;
    onVoiceStart?: () => void;
    // Assistance mode props
    isAssistanceActive?: boolean;
    onAssistanceToggle?: () => void;
    assistanceFeedback?: string;
    aiResponse?: string;
    // Tracking props
    trackPositionRef?: React.MutableRefObject<THREE.Vector3>;
    followTargetRef?: React.MutableRefObject<THREE.Vector3>;
    setEnvironment?: (env: any) => void;
}

export const Avatar3D: React.FC<Avatar3DProps> = ({
    character,
    worldSize = 10,
    isPlayerControlled = false,
    voiceState,
    voiceTranscript,
    onVoiceStart,
    isAssistanceActive,
    onAssistanceToggle,
    assistanceFeedback,
    aiResponse,
    trackPositionRef,
    followTargetRef,
    setEnvironment
}) => {
    const { settings } = usePerformanceSettings();
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftLowerLegRef = useRef<THREE.Group>(null);
    const rightLowerLegRef = useRef<THREE.Group>(null);

    // Keyboard controls
    const controls = useKeyboardControls();

    // Physics state
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const speed = 4.0;
    const acceleration = 15.0;
    const friction = 10.0;

    // AI Target Calculation
    const targetX = (character.position.x / 100) * worldSize - (worldSize / 2);
    const targetZ = (character.position.y / 100) * worldSize - (worldSize / 2);

    // AI State
    const aiState = useRef({
        mode: 'idle' as 'idle' | 'moving',
        target: new THREE.Vector3(targetX, 0, targetZ),
        nextDecisionTime: 0
    });

    // FIX: Initial position state to prevent prop-driven teleportation
    const [initialPos] = useState(() => new THREE.Vector3(targetX, 0, targetZ));

    const glowColor = useMemo(() => new THREE.Color(character.color).multiplyScalar(2), [character.color]);

    // Animation State
    const blinkState = useRef(1);
    const nextBlinkTime = useRef(0);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        // Clamp delta to prevent physics explosions during lag spikes (max 0.1s frame)
        const safeDelta = Math.min(delta, 0.1);

        // Procedural Blinking
        if (t > nextBlinkTime.current) {
            blinkState.current = 0;
            setTimeout(() => { blinkState.current = 1; }, 150);
            nextBlinkTime.current = t + Math.random() * 4 + 2;
        }

        if (groupRef.current) {
            let isMoving = false;
            let currentVelocityLength = 0;
            const moveDir = new THREE.Vector3(0, 0, 0);

            // --- INPUT SOURCE ---
            if (isPlayerControlled) {
                if (controls.forward) moveDir.z -= 1;
                if (controls.backward) moveDir.z += 1;
                if (controls.left) moveDir.x -= 1;
                if (controls.right) moveDir.x += 1;
                if (moveDir.length() > 0) moveDir.normalize();

            } else {
                // AI Input (Autonomous Wandering)
                const currentPos = groupRef.current.position;

                // Track positions
                if (trackPositionRef) {
                    trackPositionRef.current.copy(currentPos);
                }

                // AI Logic State Machine
                if (aiState.current.mode === 'idle') {
                    if (t > aiState.current.nextDecisionTime) {
                        // Switch to MOVING
                        aiState.current.mode = 'moving';

                        // Pick random point
                        const center = followTargetRef?.current ? followTargetRef.current : new THREE.Vector3(0, 0, 0);
                        const radius = 4; // Stay within 4 meters of target/center (Leash)
                        const angle = Math.random() * Math.PI * 2;
                        const dist = Math.random() * radius;

                        // Set new target
                        aiState.current.target.set(
                            center.x + Math.cos(angle) * dist,
                            0,
                            center.z + Math.sin(angle) * dist
                        );
                    }
                } else if (aiState.current.mode === 'moving') {
                    const distToTarget = currentPos.distanceTo(aiState.current.target);

                    if (distToTarget < 0.5) {
                        // ARRIVED -> Switch to IDLE
                        aiState.current.mode = 'idle';
                        aiState.current.nextDecisionTime = t + 2 + Math.random() * 3; // Wait 2-5 seconds
                        moveDir.set(0, 0, 0);
                    } else {
                        // Move towards target
                        const direction = new THREE.Vector3()
                            .subVectors(aiState.current.target, currentPos)
                            .normalize();
                        moveDir.copy(direction);
                    }
                }
            }

            // --- UNIFIED PHYSICS ENGINE (ROBUST VER.) ---
            // 1. Acceleration
            if (moveDir.length() > 0) {
                isMoving = true;
                velocity.current.x += moveDir.x * acceleration * safeDelta;
                velocity.current.z += moveDir.z * acceleration * safeDelta;

                // Smooth Rotation
                const angle = Math.atan2(moveDir.x, moveDir.z);
                let angleDiff = angle - groupRef.current.rotation.y;

                // Normalize angle to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Damped rotation
                groupRef.current.rotation.y += angleDiff * safeDelta * 10;
            }

            // 2. Friction (Exponential Decay - Stable at any frame rate)
            // This replaces the linear subtraction which causes instability at low FPS
            const dampingFactor = Math.exp(-friction * safeDelta);
            velocity.current.x *= dampingFactor;
            velocity.current.z *= dampingFactor;

            // 3. Cap Velocity
            const maxSpeed = isPlayerControlled ? speed : 2.5;
            if (velocity.current.length() > maxSpeed) {
                velocity.current.normalize().multiplyScalar(maxSpeed);
            }

            // 4. Stop Threshold (prevent micro-jitter)
            if (velocity.current.length() < 0.05) {
                if (moveDir.length() === 0) {
                    velocity.current.set(0, 0, 0);
                    isMoving = false;
                }
            } else {
                isMoving = true;
            }

            currentVelocityLength = velocity.current.length();

            // 5. Apply Position
            groupRef.current.position.add(velocity.current.clone().multiplyScalar(safeDelta));

            // 6. Boundary Checks
            const bound = worldSize / 2 - 0.5;
            groupRef.current.position.x = THREE.MathUtils.clamp(groupRef.current.position.x, -bound, bound);
            groupRef.current.position.z = THREE.MathUtils.clamp(groupRef.current.position.z, -bound, bound);

            // --- ADVANCED ANIMATION SYSTEM ---
            if (isMoving) {
                // Realistic Walk Cycle Math
                const walkCycleSpeed = currentVelocityLength * 4.5;

                if (leftLegRef.current && rightLegRef.current && leftLowerLegRef.current && rightLowerLegRef.current && leftArmRef.current && rightArmRef.current) {
                    // Leg Swing (Hip)
                    const hipAngleL = Math.sin(t * walkCycleSpeed) * 0.7;
                    const hipAngleR = Math.sin(t * walkCycleSpeed + Math.PI) * 0.7;
                    leftLegRef.current.rotation.x = hipAngleL;
                    rightLegRef.current.rotation.x = hipAngleR;

                    // Knee Bend (Biomechanically accurate: bend on swing)
                    const kneeFreq = t * walkCycleSpeed;
                    const kneeL = Math.max(0, Math.sin(kneeFreq + 1)) * 1.4;
                    const kneeR = Math.max(0, Math.sin(kneeFreq + Math.PI + 1)) * 1.4;

                    leftLowerLegRef.current.rotation.x = -kneeL;
                    rightLowerLegRef.current.rotation.x = -kneeR;

                    // Arms
                    leftArmRef.current.rotation.x = Math.sin(t * walkCycleSpeed + Math.PI) * 0.5;
                    leftArmRef.current.rotation.z = 0.1;
                    rightArmRef.current.rotation.x = Math.sin(t * walkCycleSpeed) * 0.5;
                    rightArmRef.current.rotation.z = -0.1;

                    // Body Physics
                    if (bodyRef.current) {
                        bodyRef.current.position.y = 1.1 + Math.sin(t * walkCycleSpeed * 2) * 0.04;
                        bodyRef.current.rotation.z = Math.cos(t * walkCycleSpeed) * 0.03;
                        bodyRef.current.rotation.y = Math.cos(t * walkCycleSpeed) * 0.08;
                    }
                }
            } else {
                // --- IDLE / INTERACTION STATE ---
                if (bodyRef.current && headRef.current && leftArmRef.current && rightArmRef.current) {

                    // 1. ENVIRONMENT AWARENESS (Work Mode)
                    const pos = groupRef.current.position;
                    const distLeftScreen = Math.sqrt(Math.pow(pos.x - (-8), 2) + Math.pow(pos.z - (-4), 2));
                    const distRightScreen = Math.sqrt(Math.pow(pos.x - 8, 2) + Math.pow(pos.z - (-4), 2));

                    if (distLeftScreen < 3 || distRightScreen < 3) {
                        // WORKING ANIMATION
                        headRef.current.rotation.x = -0.4;

                        leftArmRef.current.rotation.x = -0.8;
                        leftArmRef.current.rotation.z = 0.2;
                        leftArmRef.current.position.y = 0.25 + Math.sin(t * 15) * 0.005;

                        rightArmRef.current.rotation.x = -0.7;
                        rightArmRef.current.rotation.z = -0.2;
                        rightArmRef.current.rotation.y = Math.sin(t * 3) * 0.2;

                        bodyRef.current.rotation.z = 0;
                        bodyRef.current.rotation.y = 0;
                    } else {
                        // 2. NATURAL IDLE
                        const breath = Math.sin(t * 1.5) * 0.005 + Math.sin(t * 2.5) * 0.002;
                        bodyRef.current.position.y = 1.1 + breath;
                        bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.01 + Math.cos(t * 0.3) * 0.01;
                        bodyRef.current.rotation.x = Math.sin(t * 0.4) * 0.01;

                        // Fidgets
                        const fidgetPhase = t % 8;
                        if (fidgetPhase > 1 && fidgetPhase < 3) {
                            leftArmRef.current.rotation.x = -1.0;
                            leftArmRef.current.rotation.z = 0.5;
                            headRef.current.rotation.x = 0.3;
                            headRef.current.rotation.y = 0.2;
                        } else if (fidgetPhase > 5 && fidgetPhase < 6) {
                            headRef.current.rotation.z = Math.sin(t * 2) * 0.2;
                        } else {
                            headRef.current.rotation.y = Math.sin(t * 0.2) * 0.3 + Math.sin(t * 0.5) * 0.1;
                            headRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
                            headRef.current.rotation.z = 0;
                            leftArmRef.current.rotation.x = Math.sin(t * 1.2) * 0.02;
                            leftArmRef.current.rotation.z = 0.1 + breath * 2;
                            rightArmRef.current.rotation.x = Math.sin(t * 1.1) * 0.02;
                            rightArmRef.current.rotation.z = -0.1 - breath * 2;
                        }
                    }
                    if (leftLowerLegRef.current) leftLowerLegRef.current.rotation.x = 0;
                    if (rightLowerLegRef.current) rightLowerLegRef.current.rotation.x = 0;
                }
            }
        }
    });

    const armorMaterial = <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.9} />;
    const jointMaterial = <meshStandardMaterial color="#333" roughness={0.7} metalness={0.4} />;

    return (
        <group ref={groupRef} position={isPlayerControlled ? [0, 0, 0] : initialPos}>
            {/* Sparkles - conditional for performance */}
            {settings.enableSparkles && (
                <Sparkles count={20} scale={1.5} size={2} speed={0.4} opacity={0.5} color={character.color} position={[0, 1.5, 0]} />
            )}

            <Text
                position={[0, 2.5, 0]}
                fontSize={0.15}
                color={character.color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000000"
            >
                {character.name.toUpperCase()}
            </Text>

            <group position={[0, 0, 0]}>
                <group ref={bodyRef} position={[0, 1.1, 0]}>
                    <mesh position={[0, 0.2, 0]} castShadow>
                        <boxGeometry args={[0.35, 0.35, 0.2]} />
                        {armorMaterial}
                    </mesh>
                    <mesh position={[0, -0.1, 0]} castShadow>
                        <cylinderGeometry args={[0.12, 0.14, 0.25, 8]} />
                        {jointMaterial}
                    </mesh>
                    <mesh position={[0, 0.2, 0.11]}>
                        <planeGeometry args={[0.1, 0.1]} />
                        <meshBasicMaterial color={glowColor} toneMapped={false} />
                    </mesh>

                    <group ref={headRef} position={[0, 0.45, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.22, 0.25, 0.25]} />
                            {armorMaterial}
                        </mesh>
                        <mesh position={[0, 0.02, 0.13]}>
                            <boxGeometry args={[0.23, 0.08, 0.02]} />
                            <meshBasicMaterial color={glowColor} toneMapped={false} />
                        </mesh>
                    </group>

                    <group ref={leftArmRef} position={[-0.22, 0.25, 0]}>
                        <mesh castShadow><sphereGeometry args={[0.08]} />{jointMaterial}</mesh>
                        <mesh position={[-0.05, -0.15, 0]}><boxGeometry args={[0.1, 0.25, 0.1]} />{armorMaterial}</mesh>
                        <mesh position={[-0.05, -0.4, 0]}><boxGeometry args={[0.09, 0.25, 0.09]} />{armorMaterial}</mesh>
                    </group>
                    <group ref={rightArmRef} position={[0.22, 0.25, 0]}>
                        <mesh castShadow><sphereGeometry args={[0.08]} />{jointMaterial}</mesh>
                        <mesh position={[0.05, -0.15, 0]}><boxGeometry args={[0.1, 0.25, 0.1]} />{armorMaterial}</mesh>
                        <mesh position={[0.05, -0.4, 0]}><boxGeometry args={[0.09, 0.25, 0.09]} />{armorMaterial}</mesh>
                    </group>
                </group>

                <group ref={leftLegRef} position={[-0.1, 0.85, 0]}>
                    <mesh position={[0, 0, 0]}><sphereGeometry args={[0.07]} />{jointMaterial}</mesh>
                    <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.08, 0.06, 0.4, 8]} />{armorMaterial}</mesh>
                    <mesh position={[0, -0.5, 0]}><sphereGeometry args={[0.06]} />{jointMaterial}</mesh>
                    <group ref={leftLowerLegRef} position={[0, -0.5, 0]}>
                        <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.06, 0.05, 0.45, 8]} />{armorMaterial}</mesh>
                        <mesh position={[0, -0.5, 0.05]}><boxGeometry args={[0.1, 0.08, 0.2]} />{armorMaterial}</mesh>
                    </group>
                </group>

                <group ref={rightLegRef} position={[0.1, 0.85, 0]}>
                    <mesh position={[0, 0, 0]}><sphereGeometry args={[0.07]} />{jointMaterial}</mesh>
                    <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.08, 0.06, 0.4, 8]} />{armorMaterial}</mesh>
                    <mesh position={[0, -0.5, 0]}><sphereGeometry args={[0.06]} />{jointMaterial}</mesh>
                    <group ref={rightLowerLegRef} position={[0, -0.5, 0]}>
                        <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[0.06, 0.05, 0.45, 8]} />{armorMaterial}</mesh>
                        <mesh position={[0, -0.5, 0.05]}><boxGeometry args={[0.1, 0.08, 0.2]} />{armorMaterial}</mesh>
                    </group>
                </group>
            </group>

            {character.currentAction && (
                <group position={[0, 2.8, 0]}>
                    <mesh>
                        <planeGeometry args={[2, 0.5]} />
                        <meshBasicMaterial color="#000" transparent opacity={0.6} />
                    </mesh>
                    <Text
                        position={[0, 0, 0.01]}
                        fontSize={0.15}
                        color="#00f3ff"
                        maxWidth={1.8}
                        textAlign="center"
                    >
                        {character.currentAction}
                    </Text>
                </group>
            )}

            {/* INTEGRATED VOICE CONTROLS (Syncs with movement) */}
            {character.name === 'Luna' && onVoiceStart && (
                <VoiceControls
                    state={voiceState || 'idle'}
                    transcript={voiceTranscript || ''}
                    onStart={onVoiceStart}
                    position={[0, 3.5, 0]}
                    isAssistanceActive={isAssistanceActive}
                    onAssistanceToggle={onAssistanceToggle}
                    assistanceFeedback={assistanceFeedback}
                    aiResponse={aiResponse}
                    setEnvironment={setEnvironment}
                />
            )}

            {/* Per-avatar point light - conditional for performance */}
            {settings.enablePointLights && (
                <pointLight color={glowColor} intensity={0.5} distance={3} decay={2} position={[0, 1.5, 0]} />
            )}
        </group>
    );
};
