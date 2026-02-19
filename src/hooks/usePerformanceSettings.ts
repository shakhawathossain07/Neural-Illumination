import { useState, useEffect, useMemo, createContext, useContext } from 'react';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface PerformanceSettings {
    quality: QualityLevel;
    starCount: number;
    enableBloom: boolean;
    bloomIntensity: number;
    enableSparkles: boolean;
    geometryDetail: number;
    dpr: number;
    enableShadows: boolean;
    enablePointLights: boolean;
    tileTextureSize: number;
    enableTransmission: boolean;
}

const QUALITY_PRESETS: Record<QualityLevel, Omit<PerformanceSettings, 'quality'>> = {
    low: {
        starCount: 400,
        enableBloom: false,
        bloomIntensity: 0,
        enableSparkles: false,
        geometryDetail: 8,
        dpr: 1,
        enableShadows: false,
        enablePointLights: false,
        tileTextureSize: 256,
        enableTransmission: false,
    },
    medium: {
        starCount: 1000,
        enableBloom: true,
        bloomIntensity: 1.0,
        enableSparkles: true,
        geometryDetail: 16,
        dpr: 1.5,
        enableShadows: false,
        enablePointLights: true,
        tileTextureSize: 256,
        enableTransmission: false,
    },
    high: {
        starCount: 2000,
        enableBloom: true,
        bloomIntensity: 2.0,
        enableSparkles: true,
        geometryDetail: 32,
        dpr: 2,
        enableShadows: true,
        enablePointLights: true,
        tileTextureSize: 512,
        enableTransmission: true,
    },
};

const STORAGE_KEY = 'performance-quality';

/**
 * Auto-detect device capability based on hardware info
 */
function detectQualityLevel(): QualityLevel {
    // Check CPU cores
    const cores = navigator.hardwareConcurrency || 2;

    // Check device memory (if available)
    const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    // Try to detect GPU capability via WebGL
    let gpuTier: 'low' | 'medium' | 'high' = 'medium';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const rendererLower = renderer.toLowerCase();

                // Detect low-end GPUs
                if (
                    rendererLower.includes('intel') ||
                    rendererLower.includes('mesa') ||
                    rendererLower.includes('swiftshader') ||
                    rendererLower.includes('llvmpipe')
                ) {
                    gpuTier = 'low';
                }
                // Detect high-end GPUs
                else if (
                    rendererLower.includes('nvidia') ||
                    rendererLower.includes('radeon') ||
                    rendererLower.includes('geforce')
                ) {
                    gpuTier = 'high';
                }
            }
        }
    } catch {
        // Fallback to medium if detection fails
    }

    // Decision logic
    if (isMobile || cores <= 2 || memory <= 2 || gpuTier === 'low') {
        return 'low';
    }
    if (cores >= 8 && memory >= 8 && gpuTier === 'high') {
        return 'high';
    }
    return 'medium';
}

// Context for sharing settings across components
interface PerformanceContextValue {
    settings: PerformanceSettings;
    setQuality: (quality: QualityLevel) => void;
    cycleQuality: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export function usePerformanceSettings() {
    const context = useContext(PerformanceContext);
    if (!context) {
        // Fallback for components outside provider - return default medium settings
        return {
            settings: { quality: 'medium' as QualityLevel, ...QUALITY_PRESETS.medium },
            setQuality: () => { },
            cycleQuality: () => { },
        };
    }
    return context;
}

export function usePerformanceSettingsProvider() {
    const [quality, setQualityState] = useState<QualityLevel>(() => {
        // Check localStorage first
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && (stored === 'low' || stored === 'medium' || stored === 'high')) {
                return stored;
            }
        }
        // Auto-detect on first load
        return detectQualityLevel();
    });

    const setQuality = (newQuality: QualityLevel) => {
        setQualityState(newQuality);
        localStorage.setItem(STORAGE_KEY, newQuality);
    };

    const cycleQuality = () => {
        const levels: QualityLevel[] = ['low', 'medium', 'high'];
        const currentIndex = levels.indexOf(quality);
        const nextIndex = (currentIndex + 1) % levels.length;
        setQuality(levels[nextIndex]);
    };

    // Persist quality changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, quality);
    }, [quality]);

    const settings = useMemo<PerformanceSettings>(() => ({
        quality,
        ...QUALITY_PRESETS[quality],
    }), [quality]);

    return { settings, setQuality, cycleQuality, PerformanceContext };
}

export { PerformanceContext };
