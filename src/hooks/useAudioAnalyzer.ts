import { useState, useRef, useCallback } from 'react';

export const useAudioAnalyzer = () => {
    const [isListening, setIsListening] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // We'll expose these refs directly for high-performance usage (avoiding state re-renders for every frame)
    // frequencyData will be a getter

    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);

            analyser.fftSize = 256; // Trade-off between resolution and performance
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            source.connect(analyser);
            // Note: We don't connect to destination to avoid feedback loops if not desired (only analyzing)

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            dataArrayRef.current = dataArray;

            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            // Fallback? 
        }
    }, []);

    const stopListening = useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        sourceRef.current = null;
        analyserRef.current = null;
        audioContextRef.current = null;
        setIsListening(false);
    }, []);

    const getFrequencyData = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) return null;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        return dataArrayRef.current;
    }, []);

    const getAverageVolume = useCallback(() => {
        const data = getFrequencyData();
        if (!data) return 0;

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return sum / data.length;
    }, [getFrequencyData]);

    return {
        isListening,
        startListening,
        stopListening,
        getFrequencyData,
        getAverageVolume
    };
};
