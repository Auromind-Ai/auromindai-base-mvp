'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { useAuth } from '@/context/AuthContext';
import {
    playNotificationSound,
    isMessageAlreadyProcessed,
    markMessageAsProcessed,
} from '@/lib/notificationSound';

export default function GlobalAudioNotification() {
    const { subscribe } = useRealtime();
    const { workspaceId, workspaces } = useAuth();

    const activeWorkspace = workspaces?.find(w => String(w.id) === String(workspaceId)) || null;
    const currentWorkspaceId = workspaceId || activeWorkspace?.id;

    useEffect(() => {
        return subscribe((event) => {
            if (event.event_type !== 'new_message') {
                return;
            }

            const eventWorkspaceId = event.workspace_id || event.payload?.workspace_id;
            if (
                eventWorkspaceId &&
                currentWorkspaceId &&
                String(eventWorkspaceId).toLowerCase() !== String(currentWorkspaceId).toLowerCase()
            ) {
                return;
            }

            const msgData = event.payload || {};
            const msgId = msgData.id || event.id || event.event_id;

            const senderRaw = typeof msgData.sender_type === 'string'
                ? msgData.sender_type
                : (msgData.sender_type?.value || msgData.sender || event.sender_type || '');
            const msgSender = senderRaw.toLowerCase();

            // Deduplication check for audio playback
            if (msgId && isMessageAlreadyProcessed(msgId)) {
                return;
            }
            if (msgId) {
                markMessageAsProcessed(msgId);
            }

            // Check if message is genuine inbound / from customer
            const isExplicitOutbound = msgSender.includes('agent') || msgSender.includes('ai') || msgSender.includes('system') || msgData.direction === 'outbound';
            const isExplicitInbound = msgSender.includes('user') || msgSender.includes('customer') || msgSender.includes('lead') || msgSender.includes('contact') || msgData.direction === 'inbound';
            const isIncoming = isExplicitInbound || (!isExplicitOutbound && !msgSender);

            if (isIncoming) {
                console.log("🔔 [GlobalAudio] New incoming customer message detected:", event);
                playNotificationSound();
            }
        });
    }, [subscribe, currentWorkspaceId]);

    return null;
}

