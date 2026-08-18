'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { useAuth } from '@/context/AuthContext';

// Global message ID cache to prevent duplicate sounds across components
export const globallyProcessedMessageIds = new Set();

export default function GlobalAudioNotification() {
    const { subscribe } = useRealtime();
    const { workspaceId, workspaces } = useAuth();
    const audioRef = useRef(null);
    const audioUnlockedRef = useRef(false);

    const activeWorkspace = workspaces?.find(w => w.id === workspaceId) || null;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('/sounds/message-notification.mp3');
            audio.volume = 1.0;
            audio.preload = 'auto';
            audioRef.current = audio;

            const unlockAudio = () => {
                if (audioRef.current && !audioUnlockedRef.current) {
                    audioRef.current.play().then(() => {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                        audioUnlockedRef.current = true;
                        console.log("🔊 Global notification audio unlocked by user interaction");
                    }).catch(() => {});
                }
            };

            window.addEventListener('pointerdown', unlockAudio, { once: true });
            window.addEventListener('keydown', unlockAudio, { once: true });
            window.addEventListener('touchstart', unlockAudio, { once: true });

            return () => {
                window.removeEventListener('pointerdown', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
            };
        }
    }, []);

    const playNotificationSound = useCallback(async () => {
        try {
            let audio = audioRef.current;
            if (!audio && typeof Audio !== 'undefined') {
                audio = new Audio('/sounds/message-notification.mp3');
                audioRef.current = audio;
            }
            if (audio) {
                audio.volume = 1.0;
                audio.currentTime = 0;
                await audio.play();
                console.log("🔔 🔊 Global notification sound played successfully");
            }
        } catch (error) {
            console.error("❌ Global audio playback failed:", error);
        }
    }, []);

    useEffect(() => {
        return subscribe((event) => {
            const eventWorkspaceId = event.workspace_id || event.payload?.workspace_id;
            if (eventWorkspaceId && activeWorkspace?.id && eventWorkspaceId !== activeWorkspace.id) {
                return;
            }

            if (event.event_type === 'new_message') {
                const msgData = event.payload || {};
                const msgId = msgData.id || event.id || event.event_id;

                const senderRaw = typeof msgData.sender_type === 'string'
                    ? msgData.sender_type
                    : (msgData.sender_type?.value || msgData.sender || event.sender_type || '');
                const msgSender = senderRaw.toLowerCase();

                // Deduplication check
                if (msgId && globallyProcessedMessageIds.has(msgId)) {
                    return;
                }
                if (msgId) {
                    globallyProcessedMessageIds.add(msgId);
                    // Keep set clean (limit to 500 IDs)
                    if (globallyProcessedMessageIds.size > 500) {
                        const [first] = globallyProcessedMessageIds;
                        globallyProcessedMessageIds.delete(first);
                    }
                }

                // Check if message is inbound / from customer
                const isExplicitOutbound = msgSender.includes('agent') || msgSender.includes('ai') || msgSender.includes('system') || msgData.direction === 'outbound';
                const isExplicitInbound = msgSender.includes('user') || msgSender.includes('customer') || msgSender.includes('lead') || msgSender.includes('contact') || msgData.direction === 'inbound';
                const isIncoming = isExplicitInbound || (!isExplicitOutbound && !msgSender);

                if (isIncoming) {
                    console.log("🔔 [GlobalAudio] New incoming customer message detected:", event);
                    playNotificationSound();
                }
            }
        });
    }, [subscribe, activeWorkspace?.id, playNotificationSound]);

    return null;
}
