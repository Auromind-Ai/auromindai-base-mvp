// Dual-Engine Audio Notification System
// 1. HTMLAudioElement (/sounds/message-notification.mp3 & .wav)
// 2. Web Audio API Synthesizer (Crystal-clear chime fallback when audio element is suspended or blocked)

let audioContext = null;
let audioUnlocked = false;
let audioElement = null;

// Global processed message ID set with bounds to prevent memory leak
export const processedMessageIds = new Set();

export function markMessageAsProcessed(msgId) {
    if (!msgId) return;
    processedMessageIds.add(msgId);
    if (processedMessageIds.size > 1000) {
        const [first] = processedMessageIds;
        processedMessageIds.delete(first);
    }
}

export function isMessageAlreadyProcessed(msgId) {
    if (!msgId) return false;
    return processedMessageIds.has(msgId);
}

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            audioContext = new AudioCtx();
        }
    }
    return audioContext;
}

function getAudioElement() {
    if (typeof window === 'undefined') return null;
    if (!audioElement && typeof Audio !== 'undefined') {
        try {
            audioElement = new Audio('/sounds/message-notification.mp3');
            audioElement.preload = 'auto';
            audioElement.volume = 1.0;
        } catch (e) {
            console.warn('Could not create HTML Audio element:', e);
        }
    }
    return audioElement;
}

// Explicitly unlock and resume AudioContext on user interaction
export function unlockAudio() {
    if (typeof window === 'undefined') return;

    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                audioUnlocked = true;
                console.log('🔊 AudioContext resumed successfully on user interaction');
            }).catch(() => {});
        } else if (ctx && ctx.state === 'running') {
            audioUnlocked = true;
        }

        const audio = getAudioElement();
        if (audio && !audioUnlocked) {
            audio.load();
        }
    } catch (err) {
        console.warn('Audio unlock attempt warning:', err);
    }
}

// Auto-register gesture listeners once on client side
if (typeof window !== 'undefined') {
    const unlockHandler = () => {
        unlockAudio();
        if (audioContext && audioContext.state === 'running') {
            window.removeEventListener('pointerdown', unlockHandler);
            window.removeEventListener('click', unlockHandler);
            window.removeEventListener('keydown', unlockHandler);
            window.removeEventListener('touchstart', unlockHandler);
        }
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
}

// Synthesizer Fallback: Generates a 2-tone pleasant notification chime using Web Audio API
export function playSynthesizedChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return false;

        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.35, now);
        masterGain.connect(ctx.destination);

        // Tone 1: 1046.5 Hz (High C6) for 0.12s
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(masterGain);

        // Tone 2: 1568.0 Hz (High G6) starting at now + 0.09s for 0.25s
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1568.0, now + 0.09);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.5, now + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.16);

        osc2.start(now + 0.09);
        osc2.stop(now + 0.36);

        console.log('🔔 🔊 Web Audio synthesized chime played successfully');
        return true;
    } catch (err) {
        console.warn('Synthesized chime failed:', err);
        return false;
    }
}

// Master Play Function: Tries HTMLAudioElement first, falls back to Web Audio API synthesizer
export async function playNotificationSound() {
    if (typeof window === 'undefined') return;

    let played = false;

    // 1. Try HTML Audio Element (Primary)
    try {
        const audio = getAudioElement();
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 1.0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                played = true;
                console.log('🔔 🔊 Audio element notification played successfully');
            }
        }
    } catch (error) {
        console.warn('HTML Audio element play was rejected or blocked, falling back to Web Audio API:', error?.name || error);
    }

    // 2. If HTML Audio failed or was blocked, trigger Web Audio API Synthesizer
    if (!played) {
        played = playSynthesizedChime();
    }

    return played;
}

export default playNotificationSound;
