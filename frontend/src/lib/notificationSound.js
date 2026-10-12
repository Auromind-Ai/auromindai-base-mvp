// Professional Single-Tone Audio Notification System
// 1. Studio-grade single-tone acoustic audio files (/sounds/message-notification.wav & /sounds/message-sent.wav)
// 2. Web Audio API Synthesizer (Single-tone crystal ping fallback for notifications, tactile tap for sent)

let audioContext = null;
let audioUnlocked = false;
let audioElement = null;
let sentAudioElement = null;

// Debounce trackers to strictly guarantee single sound playback (no overlapping/double sounds)
let lastNotificationPlayedAt = 0;
let lastSentSoundPlayedAt = 0;

// Global processed message ID set with bounds to prevent memory leak
export const processedMessageIds = new Set();

export function markMessageAsProcessed(msgId) {
    if (!msgId) return;
    processedMessageIds.add(String(msgId));
    if (processedMessageIds.size > 1000) {
        const [first] = processedMessageIds;
        processedMessageIds.delete(first);
    }
}

export function isMessageAlreadyProcessed(msgId) {
    if (!msgId) return false;
    return processedMessageIds.has(String(msgId));
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
            audioElement = new Audio('/sounds/message-notification.wav');
            audioElement.preload = 'auto';
            audioElement.volume = 0.85;
        } catch (e) {
            console.warn('[Audio] Could not create HTML Audio element:', e);
        }
    }
    return audioElement;
}

function getSentAudioElement() {
    if (typeof window === 'undefined') return null;
    if (!sentAudioElement && typeof Audio !== 'undefined') {
        try {
            sentAudioElement = new Audio('/sounds/message-sent.wav');
            sentAudioElement.preload = 'auto';
            sentAudioElement.volume = 0.65;
        } catch (e) {
            console.warn('[Audio] Could not create sent HTML Audio element:', e);
        }
    }
    return sentAudioElement;
}

// Explicitly unlock AudioContext and HTML5 Audio on user interaction
export async function unlockAudio() {
    if (typeof window === 'undefined') return;

    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }
            try {
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
            } catch (_) {}

            if (ctx.state === 'running') {
                audioUnlocked = true;
            }
        }

        const audio = getAudioElement();
        if (audio && !audioUnlocked) {
            try {
                audio.muted = true;
                const p = audio.play();
                if (p !== undefined) {
                    await p;
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = false;
                    audioUnlocked = true;
                }
            } catch (_) {
                if (audio) audio.muted = false;
            }
        }

        const sentAudio = getSentAudioElement();
        if (sentAudio) {
            try {
                sentAudio.muted = true;
                const p2 = sentAudio.play();
                if (p2 !== undefined) {
                    await p2;
                    sentAudio.pause();
                    sentAudio.currentTime = 0;
                    sentAudio.muted = false;
                }
            } catch (_) {
                if (sentAudio) sentAudio.muted = false;
            }
        }
    } catch (err) {
        console.warn('[Audio] Unlock attempt warning:', err);
    }
}

// Auto-register gesture listeners once on client side
if (typeof window !== 'undefined') {
    const unlockHandler = () => {
        unlockAudio().then(() => {
            if (audioUnlocked || (audioContext && audioContext.state === 'running')) {
                window.removeEventListener('pointerdown', unlockHandler);
                window.removeEventListener('click', unlockHandler);
                window.removeEventListener('keydown', unlockHandler);
                window.removeEventListener('touchstart', unlockHandler);
            }
        }).catch(() => {});
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
}

// Synthesizer Fallback: Generates a single-tone, pristine crystal glass ping (Slack / Apple style)
export async function playSynthesizedChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return false;

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn('[Audio] Could not resume suspended AudioContext:', e);
            }
        }

        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.35, now);
        masterGain.connect(ctx.destination);

        // Single Pure Note: 830.6 Hz (Ab5) with natural acoustic decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(830.6, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

        osc.connect(gain);
        gain.connect(masterGain);

        // Gentle overtone for natural glass resonance
        const oscOvertone = ctx.createOscillator();
        const gainOvertone = ctx.createGain();
        oscOvertone.type = 'sine';
        oscOvertone.frequency.setValueAtTime(830.6 * 2.01, now);
        gainOvertone.gain.setValueAtTime(0.06, now);
        gainOvertone.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        oscOvertone.connect(gainOvertone);
        gainOvertone.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.35);

        oscOvertone.start(now);
        oscOvertone.stop(now + 0.18);

        return true;
    } catch (err) {
        console.warn('[Audio] Synthesized chime failed:', err);
        return false;
    }
}

// Master Play Function for Inbound Messages: Strictly single-tone, debounced to prevent duplicate/echo sounds
export async function playNotificationSound() {
    if (typeof window === 'undefined') return false;

    const now = Date.now();
    // Strictly prevent double-play within 600ms
    if (now - lastNotificationPlayedAt < 600) {
        return false;
    }
    lastNotificationPlayedAt = now;

    let played = false;

    // 1. Try single-tone WAV Audio Element
    try {
        const audio = getAudioElement();
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.85;
            audio.muted = false;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                played = true;
            }
        }
    } catch (error) {
        // Fall back to Web Audio API
    }

    // 2. Synthesizer Fallback if HTML Audio is suspended or blocked
    if (!played) {
        played = await playSynthesizedChime();
    }

    return played;
}

// Synthesizer Fallback for Sent Sound: Subtle, discreet tactile tap (60ms)
export async function playSynthesizedSentSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return false;

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn('[Audio] Could not resume AudioContext for sent sound:', e);
            }
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.065);

        return true;
    } catch (err) {
        console.warn('[Audio] Synthesized sent sound failed:', err);
        return false;
    }
}

// Master Sent Sound Function: Subtle, discrete tactile tap confirming message delivery
export async function playSentSound() {
    if (typeof window === 'undefined') return false;

    const now = Date.now();
    // Debounce sent sound within 300ms
    if (now - lastSentSoundPlayedAt < 300) {
        return false;
    }
    lastSentSoundPlayedAt = now;

    let played = false;

    // 1. Try single-tone WAV Audio Element
    try {
        const audio = getSentAudioElement();
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.65;
            audio.muted = false;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                await playPromise;
                played = true;
            }
        }
    } catch (error) {
        // Fall back to Web Audio API
    }

    // 2. Synthesizer Fallback
    if (!played) {
        played = await playSynthesizedSentSound();
    }

    return played;
}

export default playNotificationSound;
