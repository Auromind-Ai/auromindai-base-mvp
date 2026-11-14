import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Circle,
  CheckCircle2,
  Info,
  Paperclip,
  Mic,
  Send,
  Check,
  CheckCheck,
  FileText,
  X,
  Video,
  Play,
  Pause,
  Sparkles,
} from 'lucide-react-native';
import { Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';
import {
  apiClient,
  fetchMessages,
  sendReply,
  markConversationRead,
  closeConversation,
  fetchCustomerProfile,
  BackendMessage,
  CustomerProfileData,
} from '@/api';
import { useAuth } from '@/store/auth';
import { useWorkspaceRealtime } from '@/hooks/use-workspace-realtime';
import {
  formatMessageTime,
  formatDateSeparator,
  getDateKey,
  getInitials,
} from '@/utils/formatters';

const CHAT_BG_DARK = require('../../../assets/images/chat-bg-dark.jpg');
const CHAT_BG_LIGHT = require('../../../assets/images/chat-bg-light.jpg');

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'agent';
  text: string;
  time: string;
  rawTimestamp?: string | null;
  status?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
}

function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${apiClient.baseURL}${normalizedPath}`;
}

function mapBackendMessage(m: BackendMessage): Message {
  const senderType = (m.sender_type || '').toLowerCase();
  const isCust = senderType === 'user' || senderType === 'customer';
  const isBot = senderType === 'bot' || senderType === 'ai';
  const mediaUrl =
    m.media_url ||
    m.metadata?.media_url ||
    m.metadata?.voice_url ||
    m.metadata?.audio_url ||
    m.metadata?.video_url ||
    null;
  const mediaType = m.media_type || m.metadata?.message_type || m.metadata?.media_type || null;
  const rawTimestamp = m.timestamp || (m as any).created_at || null;

  return {
    id: String(m.id || `${rawTimestamp}-${Math.random()}`),
    sender: isCust ? 'customer' : isBot ? 'ai' : 'agent',
    text: m.content || '',
    time: formatMessageTime(rawTimestamp, ''),
    rawTimestamp,
    status: m.status,
    mediaUrl,
    mediaType,
    fileName: m.metadata?.filename || null,
  };
}

function formatAudioTime(sec: number): string {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:15';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function isMediaPlaceholder(text?: string | null): boolean {
  if (!text) return true;
  const cleaned = text.trim();
  return (
    /^\[?(VOICE|AUDIO|VIDEO|IMAGE|DOCUMENT)\]?$/i.test(cleaned) ||
    /^(Sent a (video|photo|image|document|voice note|audio))$/i.test(cleaned)
  );
}

function isAudioMessage(msg: Message, resolvedMedia: string | null): boolean {
  const lowerType = (msg.mediaType || '').toLowerCase();
  const lowerText = (msg.text || '').trim().toLowerCase();
  const lowerFile = (msg.fileName || '').toLowerCase();
  const lowerUrl = (resolvedMedia || '').toLowerCase();

  return (
    lowerType.includes('audio') ||
    lowerType.includes('voice') ||
    lowerText === '[voice]' ||
    lowerText === '[audio]' ||
    lowerText === 'voice' ||
    lowerText === 'audio' ||
    /\.(ogg|oga|mp3|wav|m4a|aac|opus|webm|flac)(\?|$)/i.test(lowerUrl) ||
    /\.(ogg|oga|mp3|wav|m4a|aac|opus|webm|flac)(\?|$)/i.test(lowerFile)
  );
}

function isVideoMessage(msg: Message, resolvedMedia: string | null): boolean {
  const lowerType = (msg.mediaType || '').toLowerCase();
  const lowerText = (msg.text || '').trim().toLowerCase();
  const lowerFile = (msg.fileName || '').toLowerCase();
  const lowerUrl = (resolvedMedia || '').toLowerCase();

  return (
    lowerType.includes('video') ||
    lowerText === '[video]' ||
    lowerText === 'video' ||
    /\.(mp4|mov|webm|mkv|3gp|m4v)(\?|$)/i.test(lowerUrl) ||
    /\.(mp4|mov|webm|mkv|3gp|m4v)(\?|$)/i.test(lowerFile)
  );
}

function isDocumentMessage(msg: Message, resolvedMedia: string | null): boolean {
  const lowerType = (msg.mediaType || '').toLowerCase();
  const lowerFile = (msg.fileName || '').toLowerCase();
  const lowerUrl = (resolvedMedia || '').toLowerCase();

  return (
    lowerType.includes('document') ||
    lowerType.includes('pdf') ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?|$)/i.test(lowerUrl) ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)(\?|$)/i.test(lowerFile)
  );
}

const WAVEFORM_HEIGHTS = [
  5, 8, 14, 20, 24, 16, 10, 6, 12, 18, 22, 17, 11, 7, 13, 20, 24, 19, 12, 8, 11, 16, 22, 15, 9, 6, 8, 13,
];

function WhatsAppAudioBubble({
  messageId,
  url,
  isCustomer,
  isDark,
  customerName,
  time,
  status,
  isInstagram,
  activeAudioId,
  onPlayAudio,
  onPauseAudio,
}: {
  messageId: string;
  url?: string | null;
  isCustomer: boolean;
  isDark: boolean;
  customerName?: string;
  time: string;
  status?: string;
  isInstagram?: boolean;
  activeAudioId?: string | null;
  onPlayAudio: (id: string) => void;
  onPauseAudio: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<any>(null);

  // If another voice note starts playing, pause this one immediately
  useEffect(() => {
    if (activeAudioId !== messageId && isPlaying) {
      if (Platform.OS === 'web' && audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
      }
      setIsPlaying(false);
    }
  }, [activeAudioId, messageId, isPlaying]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio && url) {
      const audio = new (window as any).Audio(url);
      audioRef.current = audio;

      const onLoaded = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onPauseAudio();
      };
      const onError = () => {
        setIsPlaying(false);
        onPauseAudio();
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      return () => {
        try {
          audio.pause();
        } catch {}
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audioRef.current = null;
      };
    }
  }, [url]);

  const togglePlay = () => {
    if (!url) return;
    if (Platform.OS === 'web' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        onPauseAudio();
      } else {
        // Stop any other playing audio in window
        if (typeof window !== 'undefined') {
          const globalAudio = (window as any).__activeAudioElement;
          if (globalAudio && globalAudio !== audioRef.current) {
            try {
              globalAudio.pause();
            } catch {}
          }
          (window as any).__activeAudioElement = audioRef.current;
        }

        onPlayAudio(messageId);

        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err: any) => {
            console.warn('Audio play failed:', err);
            setIsPlaying(false);
            onPauseAudio();
            if (typeof window !== 'undefined') {
              window.open(url, '_blank');
            }
          });
      }
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleSeek = (progressRatio: number) => {
    if (!url) return;
    const targetDuration = duration > 0 ? duration : 20;
    const targetTime = Math.max(0, Math.min(progressRatio * targetDuration, targetDuration));
    if (Platform.OS === 'web' && audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeDotIndex = Math.min(
    Math.floor(progress * WAVEFORM_HEIGHTS.length),
    WAVEFORM_HEIGHTS.length - 1
  );

  return (
    <View style={styles.voiceBubbleContainer}>
      <View style={styles.voiceHeaderRow}>
        {/* Left: Avatar with small mic badge */}
        <View style={styles.voiceAvatarWrapper}>
          <View
            style={[
              styles.voiceAvatarCircle,
              {
                backgroundColor: isCustomer
                  ? isInstagram
                    ? '#E1306C'
                    : '#8576D0'
                  : '#5B4EB5',
              },
            ]}
          >
            <Text style={styles.voiceAvatarInitials}>
              {getInitials(isCustomer ? customerName : 'Me')}
            </Text>
          </View>
          <View
            style={[
              styles.voiceMicBadge,
              {
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderColor: isDark ? '#374151' : '#E2E8F0',
              },
            ]}
          >
            <Mic size={10} color={isCustomer ? '#10B981' : '#8576D0'} />
          </View>
        </View>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[
            styles.voicePlayBtn,
            isCustomer
              ? {
                  backgroundColor: isDark ? '#2D3748' : '#F1F5F9',
                }
              : {
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                },
          ]}
          onPress={togglePlay}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <Pause
              size={18}
              color={isCustomer ? (isDark ? '#F1F5F9' : '#1E293B') : '#FFFFFF'}
              fill={isCustomer ? (isDark ? '#F1F5F9' : '#1E293B') : '#FFFFFF'}
            />
          ) : (
            <Play
              size={18}
              color={isCustomer ? (isDark ? '#F1F5F9' : '#1E293B') : '#FFFFFF'}
              fill={isCustomer ? (isDark ? '#F1F5F9' : '#1E293B') : '#FFFFFF'}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>

        {/* Waveform Scrubber Bars */}
        <View style={styles.voiceWaveformArea}>
          <Pressable
            style={styles.voiceWaveformRow}
            onPress={(e) => {
              const { locationX } = e.nativeEvent as any;
              if (typeof locationX === 'number' && locationX > 0) {
                const ratio = Math.max(0, Math.min(1, locationX / 140));
                handleSeek(ratio);
              }
            }}
          >
            {WAVEFORM_HEIGHTS.map((height, i) => {
              const isPlayed = i <= activeDotIndex;
              return (
                <View
                  key={i}
                  style={[
                    styles.voiceWaveformBar,
                    {
                      height,
                      backgroundColor: isPlayed
                        ? isCustomer
                          ? '#8576D0'
                          : '#FFFFFF'
                        : isCustomer
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.22)'
                            : '#CBD5E1'
                          : 'rgba(255, 255, 255, 0.35)',
                    },
                  ]}
                />
              );
            })}
          </Pressable>
        </View>
      </View>

      {/* Meta Row: Voice Duration on left, Time + Blue Ticks on right */}
      <View style={styles.voiceMetaRow}>
        <Text
          style={[
            styles.voiceDurationText,
            {
              color: isCustomer
                ? isDark
                  ? '#94A3B8'
                  : '#64748B'
                : 'rgba(255, 255, 255, 0.78)',
            },
          ]}
        >
          {formatAudioTime(isPlaying || currentTime > 0 ? currentTime : (duration || 20))}
        </Text>

        <View style={styles.voiceTimeTicks}>
          <Text
            style={[
              styles.bubbleTimeText,
              {
                color: isCustomer
                  ? isDark
                    ? '#8E9BB5'
                    : '#7883A0'
                  : 'rgba(255, 255, 255, 0.72)',
              },
            ]}
          >
            {time}
          </Text>
          {!isCustomer && (
            status === 'sending' ? (
              <Check size={13} color="rgba(255, 255, 255, 0.65)" style={styles.bubbleTickIcon} />
            ) : (
              <CheckCheck
                size={13}
                color={status === 'read' ? '#53BDEB' : 'rgba(255, 255, 255, 0.65)'}
                style={styles.bubbleTickIcon}
              />
            )
          )}
        </View>
      </View>
    </View>
  );
}

function WhatsAppVideoBubble({
  url,
  isCustomer,
  isDark,
  time,
  status,
  caption,
  onOpenVideo,
}: {
  url?: string | null;
  isCustomer: boolean;
  isDark: boolean;
  time: string;
  status?: string;
  caption?: string | null;
  onOpenVideo: (videoUrl: string) => void;
}) {
  return (
    <View style={styles.videoBubbleContainer}>
      <TouchableOpacity
        style={styles.videoCard}
        activeOpacity={0.9}
        onPress={() => {
          if (url) onOpenVideo(url);
        }}
      >
        {Platform.OS === 'web' && url ? (
          <video
            src={url}
            preload="metadata"
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#0F172A',
            }}
          />
        ) : (
          <View style={styles.videoNativeFallback}>
            <LinearGradient
              colors={['#1E1B4B', '#0F172A']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* Dark overlay with WhatsApp Play Circle */}
        <View style={styles.videoOverlay}>
          <View style={styles.videoPlayCircle}>
            <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>

          {/* Bottom-left Video Badge */}
          <View style={styles.videoBadgePill}>
            <Video size={13} color="#FFFFFF" />
            <Text style={styles.videoBadgeText}>Video</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Caption if provided and not placeholder */}
      {caption && !isMediaPlaceholder(caption) ? (
        <Text
          style={[
            styles.messageText,
            styles.mediaCaptionText,
            isCustomer ? { color: isDark ? '#FFFFFF' : '#1E293B' } : { color: '#FFFFFF' },
          ]}
        >
          {caption}
        </Text>
      ) : null}

      {/* Meta Row: Time & Ticks */}
      <View style={styles.bubbleMetaRow}>
        <Text
          style={[
            styles.bubbleTimeText,
            {
              color: isCustomer
                ? isDark
                  ? '#8E9BB5'
                  : '#7883A0'
                : 'rgba(255, 255, 255, 0.72)',
            },
          ]}
        >
          {time}
        </Text>
        {!isCustomer && (
          status === 'sending' ? (
            <Check size={13} color="rgba(255, 255, 255, 0.65)" style={styles.bubbleTickIcon} />
          ) : (
            <CheckCheck
              size={13}
              color={status === 'read' ? '#53BDEB' : 'rgba(255, 255, 255, 0.65)'}
              style={styles.bubbleTickIcon}
            />
          )
        )}
      </View>
    </View>
  );
}

function formatChannelLabel(channel: string): string {
  const normalized = channel.toLowerCase();
  if (normalized === 'instagram') return 'Instagram';
  if (normalized === 'twilio') return 'Twilio SMS';
  if (normalized === 'whatsapp') return 'WhatsApp';
  if (normalized === 'email') return 'Email';
  if (!normalized) return 'WhatsApp';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const authState = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    channel?: string;
    name?: string;
    phone?: string;
  }>();

  const conversationId = typeof params.id === 'string' ? params.id : '';
  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(Boolean(conversationId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    uri: string;
    name?: string;
    type?: string;
    mimeType?: string;
  } | null>(null);
  const [internalNoteAlert, setInternalNoteAlert] = useState<string | null>(null);
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const channelLower = (profile?.channel || (typeof params.channel === 'string' ? params.channel : 'whatsapp')).toLowerCase();
  const isInstagram = channelLower === 'instagram';
  const isTwilio = channelLower === 'twilio';

  const paramName = typeof params.name === 'string' ? params.name : '';
  const paramPhone = typeof params.phone === 'string' ? params.phone : '';
  const customerName =
    (profile?.name && profile.name !== 'Unknown Customer' ? profile.name : '') ||
    paramName ||
    profile?.phone ||
    paramPhone ||
    'Customer';

  const normalizedStatus = (profile?.status || '').toUpperCase();
  const isClosed = normalizedStatus === 'CLOSED';
  const isConverted = Boolean(profile?.is_converted) || normalizedStatus === 'CONVERTED';
  const statusText = `${formatChannelLabel(channelLower)} • ${isClosed ? 'Closed' : isConverted ? 'Converted' : 'Active'}`;

  const showToastAlert = useCallback((message: string) => {
    setInternalNoteAlert(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setInternalNoteAlert(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadThread = useCallback(
    async (silent = false) => {
      if (!conversationId) return;
      if (!silent) {
        setIsLoadingMessages(true);
      }
      try {
        const [serverMsgs, profileData] = await Promise.all([
          fetchMessages(conversationId),
          fetchCustomerProfile(conversationId).catch(() => null),
        ]);
        if (Array.isArray(serverMsgs)) {
          setMessages(serverMsgs.map(mapBackendMessage));
        }
        if (profileData) {
          setProfile(profileData);
        }
        setLoadError(null);
      } catch (err: any) {
        setLoadError(err?.message || 'Unable to load conversation messages.');
      } finally {
        setIsLoadingMessages(false);
        setIsRefreshing(false);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    const initialFetch = async () => {
      try {
        const [serverMsgs, profileData] = await Promise.all([
          fetchMessages(conversationId),
          fetchCustomerProfile(conversationId).catch(() => null),
        ]);
        if (cancelled) return;
        if (Array.isArray(serverMsgs)) {
          setMessages(serverMsgs.map(mapBackendMessage));
        }
        if (profileData) {
          setProfile(profileData);
        }
        setLoadError(null);
        markConversationRead(conversationId).catch(() => {});
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'Unable to load conversation messages.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    initialFetch();

    // Fallback polling in case WebSocket briefly disconnects
    const pollInterval = setInterval(() => {
      if (!cancelled) {
        loadThread(true);
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [conversationId, loadThread]);

  const handleRealtimeEvent = useCallback(
    (event: { event_type?: string; event?: string; type?: string; payload?: Record<string, any>; data?: Record<string, any> }) => {
      const evName = event.event_type || event.event || event.type || '';
      if (
        evName === 'new_message' ||
        evName === 'message_status_updated' ||
        evName === 'conversation_updated'
      ) {
        const eventConvId =
          event.payload?.conversation_id ||
          event.data?.conversation_id ||
          (event as any).conversation_id;
        if (!eventConvId || String(eventConvId) === conversationId) {
          loadThread(true);
          markConversationRead(conversationId).catch(() => {});
        }
      }
    },
    [conversationId, loadThread]
  );

  useWorkspaceRealtime(handleRealtimeEvent, { conversationId: conversationId || undefined });

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadThread(true);
  }, [loadThread]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/inbox');
    }
  };

  const handleAttachFile = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToastAlert('Please grant photo library permission to attach media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAttachment({
          uri: asset.uri,
          name: asset.fileName || (asset.type === 'video' ? 'video.mp4' : 'image.jpg'),
          type: asset.type || 'image',
          mimeType: asset.mimeType || undefined,
        });
      }
    } catch (err: any) {
      showToastAlert(err?.message || 'Unable to open media picker.');
    }
  };

  const handleSendMessage = async () => {
    const textToSend = inputMessage.trim();
    const attachmentToSend = selectedAttachment;
    if ((!textToSend && !attachmentToSend) || !conversationId || isSending) return;

    const optimisticId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: Message = {
      id: optimisticId,
      sender: 'agent',
      text: textToSend || (attachmentToSend?.type === 'video' ? 'Sent a video' : 'Sent an image'),
      time: formatMessageTime(nowIso, 'Just now'),
      rawTimestamp: nowIso,
      status: 'sending',
      mediaUrl: attachmentToSend?.uri || null,
      mediaType: attachmentToSend?.type || null,
      fileName: attachmentToSend?.name || null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMessage('');
    setSelectedAttachment(null);

    try {
      setIsSending(true);
      let metadata: Record<string, any> | undefined;

      if (attachmentToSend) {
        const rawWorkspaceId =
          authState.selectedWorkspace?.id || authState.workspaces[0]?.id;
        const workspaceId =
          rawWorkspaceId && !rawWorkspaceId.startsWith('ws-') ? rawWorkspaceId : undefined;

        const uploaded = await apiClient.uploadFile(
          {
            uri: attachmentToSend.uri,
            name: attachmentToSend.name,
            mimeType: attachmentToSend.mimeType,
          },
          workspaceId
        );

        const messageType =
          uploaded.file_type === 'video' || attachmentToSend.type === 'video'
            ? 'video'
            : uploaded.mime_type === 'application/pdf' || uploaded.file_type === 'document'
              ? 'document'
              : 'image';

        metadata = {
          media_url: uploaded.url,
          message_type: messageType,
          media_id: uploaded.id,
          mime_type: uploaded.mime_type,
          filename: uploaded.filename,
        };
      }

      const fallbackBody =
        metadata?.message_type === 'video'
          ? 'Sent a video'
          : metadata?.message_type === 'document'
            ? 'Sent a document'
            : 'Sent an image';

      await sendReply({
        conversation_id: conversationId,
        message: textToSend || fallbackBody,
        ...(metadata ? { metadata } : {}),
      });

      await loadThread(true);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputMessage(textToSend);
      if (attachmentToSend) {
        setSelectedAttachment(attachmentToSend);
      }
      showToastAlert(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!conversationId || isClosing) return;
    try {
      setIsClosing(true);
      await closeConversation(conversationId);
      setProfile((prev) => (prev ? { ...prev, status: 'CLOSED' } : prev));
      setShowCloseModal(false);
      showToastAlert('Conversation marked as closed.');
    } catch (err: any) {
      setShowCloseModal(false);
      showToastAlert(err?.message || 'Unable to close conversation.');
    } finally {
      setIsClosing(false);
    }
  };

  const navigateToProfile = () => {
    router.push({
      pathname: '/customer/[id]',
      params: {
        id: conversationId,
        name: customerName,
        phone: profile?.phone || paramPhone || '',
      },
    } as any);
  };

  // Theme colors
  const customerBubbleBg = isDark ? '#202941' : '#FAFAFA';
  const customerBubbleBorder = isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(235, 238, 245, 0.9)';
  const customerTextColor = isDark ? '#F5F4FF' : '#1F1A3C';
  const inputCapsuleBg = isDark ? '#161D36' : '#FFFFFF';
  const inputCapsuleBorder = isDark ? 'rgba(164, 170, 255, 0.14)' : 'rgba(226, 232, 240, 0.9)';
  const placeholderColor = isDark ? '#7E8BA0' : '#9CA3AF';
  const inputTextColor = isDark ? '#F5F4FF' : '#1F1A3C';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A1023' : '#EEEEF5' }]}>
      <StatusBar style="light" />

      {/* TOP HEADER SECTION */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 36 : 14),
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['#111A3A', '#292D66', '#514BC0', '#342D75', '#171D40']
              : ['#30385F', '#6669B6', '#9388D7', '#68658F']
          }
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id={isDark ? 'hdrDarkGlow' : 'hdrLightGlow'}
                cx="52%"
                cy="46%"
                rx="56%"
                ry="52%"
                fx="52%"
                fy="46%"
              >
                <Stop
                  offset="0%"
                  stopColor={isDark ? '#6F5BFF' : '#AB99FF'}
                  stopOpacity={isDark ? 0.38 : 0.48}
                />
                <Stop
                  offset="65%"
                  stopColor={isDark ? '#6F5BFF' : '#AB99FF'}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${isDark ? 'hdrDarkGlow' : 'hdrLightGlow'})`}
            />
          </Svg>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userInfoButton}
              activeOpacity={0.8}
              onPress={navigateToProfile}
            >
              <View style={styles.avatarWrapper}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: isInstagram ? '#E1306C' : isTwilio ? '#F22F46' : '#8576D0' },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {getInitials(customerName)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    {
                      borderColor: isDark ? '#292D66' : '#6669B6',
                      backgroundColor: isClosed ? '#94A3B8' : '#10B981',
                    },
                  ]}
                />
              </View>

              <View style={styles.headerTitles}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {customerName}
                </Text>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.7}
              onPress={() => {
                if (isClosed) {
                  showToastAlert('This conversation is already closed.');
                } else {
                  setShowCloseModal(true);
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            >
              {isClosed ? (
                <CheckCircle2 size={22} strokeWidth={2.2} color="#10B981" />
              ) : (
                <Circle size={22} strokeWidth={2.2} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.7}
              onPress={navigateToProfile}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 12 }}
            >
              <Info size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* MAIN CONVERSATION AREA SHEET */}
      <View style={styles.mainContentSheet}>
        {isDark ? (
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A1023' }]} />
            <Image
              source={CHAT_BG_DARK}
              style={[StyleSheet.absoluteFill, styles.chatBgImage]}
              resizeMode="cover"
            />
            {/* Dark tint gradient matching the dark card and theme palette */}
            <LinearGradient
              colors={['rgba(12, 17, 37, 0.55)', 'rgba(16, 22, 45, 0.50)', 'rgba(10, 16, 35, 0.65)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        ) : (
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EFEAE2' }]} />
            <Image
              source={CHAT_BG_LIGHT}
              style={[StyleSheet.absoluteFill, styles.chatBgImageLight]}
              resizeMode="cover"
            />
          </>
        )}

        {internalNoteAlert && (
          <View style={[styles.toastBanner, { backgroundColor: isDark ? '#1F1B2C' : 'rgba(251, 191, 36, 0.15)' }]}>
            <Sparkles size={14} color="#FBBF24" />
            <Text style={[styles.toastText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
              {internalNoteAlert}
            </Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#8576D0"
              />
            }
          >
            {isLoadingMessages && messages.length === 0 ? (
              <View style={styles.centerFeedback}>
                <ActivityIndicator size="large" color="#8576D0" />
                <Text style={[styles.feedbackText, { color: isDark ? '#A2ADD8' : '#7883A0' }]}>
                  Loading conversation...
                </Text>
              </View>
            ) : loadError && messages.length === 0 ? (
              <TouchableOpacity
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: isDark ? '#202941' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(248, 113, 113, 0.35)' : '#FECACA',
                  },
                ]}
                onPress={() => loadThread(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.errorCardText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                  {loadError}
                </Text>
                <Text style={styles.errorRetryHint}>Tap to retry</Text>
              </TouchableOpacity>
            ) : messages.length === 0 ? (
              <View style={styles.centerFeedback}>
                <Text style={[styles.feedbackText, { color: isDark ? '#A2ADD8' : '#7883A0' }]}>
                  No messages in this conversation yet.
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const currentDateKey = getDateKey(msg.rawTimestamp);
                const prevDateKey = prevMsg ? getDateKey(prevMsg.rawTimestamp) : null;
                const showDateSeparator = Boolean(
                  msg.rawTimestamp &&
                  (!prevDateKey || currentDateKey !== prevDateKey)
                );
                const dateLabel = showDateSeparator ? formatDateSeparator(msg.rawTimestamp) : null;

                const isCustomer = msg.sender === 'customer';
                const resolvedMedia = resolveMediaUrl(msg.mediaUrl);
                const isAudio = isAudioMessage(msg, resolvedMedia);
                const isVideo = !isAudio && isVideoMessage(msg, resolvedMedia);
                const isDocument = !isAudio && !isVideo && isDocumentMessage(msg, resolvedMedia);
                const isImage = !isAudio && !isVideo && !isDocument && Boolean(resolvedMedia);
                const hasValidCaption = Boolean(msg.text && !isMediaPlaceholder(msg.text));

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && dateLabel ? (
                      <View style={styles.dateSeparatorRow}>
                        <View
                          style={[
                            styles.dateSeparatorPill,
                            {
                              backgroundColor: isDark
                                ? 'rgba(23, 29, 45, 0.92)'
                                : 'rgba(255, 255, 255, 0.94)',
                              borderColor: isDark
                                ? 'rgba(164, 170, 255, 0.12)'
                                : 'rgba(0, 0, 0, 0.06)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateSeparatorText,
                              { color: isDark ? '#A2ADD8' : '#5E677F' },
                            ]}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.messageRow,
                        isCustomer ? styles.customerRow : styles.agentRow,
                      ]}
                    >
                      {isAudio ? (
                        <View
                          style={[
                            styles.messageBubble,
                            styles.audioMessageBubble,
                            isCustomer
                              ? [
                                  styles.customerBubble,
                                  {
                                    backgroundColor: customerBubbleBg,
                                    borderColor: customerBubbleBorder,
                                  },
                                ]
                              : styles.agentBubble,
                          ]}
                        >
                          <WhatsAppAudioBubble
                            messageId={msg.id}
                            url={resolvedMedia}
                            isCustomer={isCustomer}
                            isDark={isDark}
                            customerName={customerName}
                            time={msg.time}
                            status={msg.status}
                            isInstagram={isInstagram}
                            activeAudioId={activeAudioId}
                            onPlayAudio={(id) => setActiveAudioId(id)}
                            onPauseAudio={() => {
                              if (activeAudioId === msg.id) {
                                setActiveAudioId(null);
                              }
                            }}
                          />
                        </View>
                      ) : isVideo ? (
                        <View
                          style={[
                            styles.messageBubble,
                            styles.videoMessageBubble,
                            isCustomer
                              ? [
                                  styles.customerBubble,
                                  {
                                    backgroundColor: customerBubbleBg,
                                    borderColor: customerBubbleBorder,
                                  },
                                ]
                              : styles.agentBubble,
                          ]}
                        >
                          <WhatsAppVideoBubble
                            url={resolvedMedia}
                            isCustomer={isCustomer}
                            isDark={isDark}
                            time={msg.time}
                            status={msg.status}
                            caption={msg.text}
                            onOpenVideo={(vUrl) => {
                              setActiveAudioId(null);
                              if (typeof window !== 'undefined' && (window as any).__activeAudioElement) {
                                try {
                                  (window as any).__activeAudioElement.pause();
                                } catch {}
                              }
                              setActiveVideoModalUrl(vUrl);
                            }}
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.messageBubble,
                            isImage ? styles.imageMessageBubble : null,
                            isCustomer
                              ? [
                                  styles.customerBubble,
                                  {
                                    backgroundColor: customerBubbleBg,
                                    borderColor: customerBubbleBorder,
                                  },
                                ]
                              : styles.agentBubble,
                          ]}
                        >
                          {isDocument ? (
                            <TouchableOpacity
                              style={[
                                styles.mediaFileCard,
                                {
                                  backgroundColor: isCustomer
                                    ? isDark
                                      ? '#161B32'
                                      : '#F1F5F9'
                                    : 'rgba(255, 255, 255, 0.16)',
                                },
                              ]}
                              activeOpacity={0.8}
                              onPress={() => {
                                if (resolvedMedia) Linking.openURL(resolvedMedia).catch(() => {});
                              }}
                            >
                              <FileText size={18} color={isCustomer ? '#8576D0' : '#FFFFFF'} />
                              <Text
                                style={[
                                  styles.mediaFileName,
                                  { color: isCustomer ? customerTextColor : '#FFFFFF' },
                                ]}
                                numberOfLines={1}
                              >
                                {msg.fileName || 'Document attachment'}
                              </Text>
                            </TouchableOpacity>
                          ) : isImage && resolvedMedia ? (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => {
                                Linking.openURL(resolvedMedia).catch(() => {});
                              }}
                            >
                              <Image
                                source={{ uri: resolvedMedia }}
                                style={styles.messageMediaImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ) : null}

                          {hasValidCaption || (!resolvedMedia && msg.text) ? (
                            <Text
                              style={[
                                styles.messageText,
                                isImage || isDocument ? { marginTop: 8 } : null,
                                isCustomer
                                  ? { color: customerTextColor }
                                  : { color: '#FFFFFF' },
                              ]}
                            >
                              {msg.text}
                            </Text>
                          ) : null}

                          <View style={styles.bubbleMetaRow}>
                            <Text
                              style={[
                                styles.bubbleTimeText,
                                {
                                  color: isCustomer
                                    ? isDark
                                      ? '#8E9BB5'
                                      : '#7883A0'
                                    : 'rgba(255, 255, 255, 0.72)',
                                },
                              ]}
                            >
                              {msg.time}
                            </Text>
                            {!isCustomer && (
                              msg.status === 'sending' ? (
                                <Check
                                  size={13}
                                  color="rgba(255, 255, 255, 0.65)"
                                  style={styles.bubbleTickIcon}
                                />
                              ) : (
                                <CheckCheck
                                  size={13}
                                  color={msg.status === 'read' ? '#53BDEB' : 'rgba(255, 255, 255, 0.65)'}
                                  style={styles.bubbleTickIcon}
                                />
                              )
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </React.Fragment>
                );
              })
            )}
          </ScrollView>

          <View style={styles.bottomBarContainer}>
            {selectedAttachment && (
              <View
                style={[
                  styles.attachmentPreviewBar,
                  {
                    backgroundColor: isDark ? '#161F33' : '#F1F3F9',
                    borderColor: isDark ? 'rgba(164, 170, 255, 0.15)' : '#E2E8F0',
                  },
                ]}
              >
                {selectedAttachment.type === 'video' ? (
                  <View style={styles.attachmentThumbBox}>
                    <Video size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <Image source={{ uri: selectedAttachment.uri }} style={styles.attachmentThumbImage} />
                )}
                <Text
                  style={[
                    styles.attachmentNameText,
                    { color: isDark ? '#F8F8FF' : '#111827' },
                  ]}
                  numberOfLines={1}
                >
                  {selectedAttachment.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedAttachment(null)}
                  style={styles.attachmentRemoveBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color={isDark ? '#A2ADD8' : '#64748B'} />
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.capsuleInputBar,
                {
                  backgroundColor: inputCapsuleBg,
                  borderColor: inputCapsuleBorder,
                },
                isDark ? styles.capsuleShadowDark : styles.capsuleShadowLight,
              ]}
            >
              <TouchableOpacity
                style={isDark ? styles.attachButtonDark : styles.attachButtonLight}
                activeOpacity={0.7}
                onPress={handleAttachFile}
                disabled={isSending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Paperclip
                  size={isDark ? 20 : 22}
                  color={isDark ? '#A2ADD8' : '#7583A5'}
                  strokeWidth={2}
                />
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.seamlessTextInput,
                  { color: inputTextColor },
                ]}
                placeholder="Type a message..."
                placeholderTextColor={placeholderColor}
                value={inputMessage}
                onChangeText={setInputMessage}
                multiline={true}
              />

              {inputMessage.trim().length > 0 || selectedAttachment ? (
                <TouchableOpacity
                  style={[
                    styles.actionCircleButton,
                    { backgroundColor: '#8576D0', opacity: isSending ? 0.7 : 1 },
                    styles.actionButtonShadow,
                  ]}
                  onPress={handleSendMessage}
                  disabled={isSending}
                  activeOpacity={0.8}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={19} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionCircleButton,
                    { backgroundColor: '#8576D0' },
                    styles.actionButtonShadow,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    showToastAlert('Tap the paperclip icon to attach an image or video.')
                  }
                >
                  <Mic size={21} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Close Conversation Confirmation Modal */}
      <Modal
        visible={showCloseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isClosing) setShowCloseModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isClosing) setShowCloseModal(false);
            }}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#1A223D' : '#FFFFFF',
                borderColor: isDark ? 'rgba(164, 170, 255, 0.14)' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#1A2138' }]}>
              Close conversation?
            </Text>
            <Text style={[styles.modalDesc, { color: isDark ? '#A2ADD8' : '#64748B' }]}>
              This will mark the conversation with {customerName} as closed in your inbox.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
                ]}
                onPress={() => setShowCloseModal(false)}
                disabled={isClosing}
              >
                <Text style={[styles.modalBtnText, { color: isDark ? '#FFFFFF' : '#334155' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#8576D0' }]}
                onPress={handleConfirmClose}
                disabled={isClosing}
              >
                {isClosing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Close chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN VIDEO PLAYER MODAL */}
      <Modal
        visible={Boolean(activeVideoModalUrl)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveVideoModalUrl(null)}
      >
        <View style={styles.videoModalBackdrop}>
          <View style={styles.videoModalHeader}>
            <Text style={styles.videoModalTitle}>Video</Text>
            <TouchableOpacity
              style={styles.videoModalCloseBtn}
              onPress={() => setActiveVideoModalUrl(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.videoModalPlayerContainer}>
            {Platform.OS === 'web' && activeVideoModalUrl ? (
              <video
                src={activeVideoModalUrl}
                controls
                autoPlay
                style={{
                  maxWidth: '92vw',
                  maxHeight: '75vh',
                  borderRadius: 14,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  backgroundColor: '#000000',
                }}
              />
            ) : (
              <TouchableOpacity
                style={styles.videoNativeOpenBtn}
                onPress={() => {
                  if (activeVideoModalUrl) {
                    Linking.openURL(activeVideoModalUrl).catch(() => {});
                  }
                }}
              >
                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.videoNativeOpenText}>Play in External Player</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: scaleContainer(22),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: scaleHeight(44),
    height: scaleHeight(44),
    borderRadius: scaleHeight(22),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  headerTitles: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: scaleFont(17),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  statusText: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.regular,
    color: '#E0DDFE',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: scaleContainer(36),
    borderTopRightRadius: scaleContainer(36),
    marginTop: -16,
    overflow: 'hidden',
    paddingTop: 8,
  },
  chatBgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  chatBgImageLight: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
    gap: 8,
  },
  toastText: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  messagesScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  centerFeedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  feedbackText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginVertical: 20,
  },
  errorCardText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  errorRetryHint: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.semiBold,
    color: '#8576D0',
  },
  dateSeparatorRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  dateSeparatorText: {
    fontSize: scaleFont(11.5),
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  },
  messageRow: {
    marginBottom: 6,
  },
  customerRow: {
    alignItems: 'flex-start',
  },
  agentRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    minWidth: 76,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  customerBubble: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    shadowColor: '#2F2B5A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  agentBubble: {
    backgroundColor: '#8576D0',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 0,
    shadowColor: '#8576D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  messageText: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.regular,
    lineHeight: scaleFont(21),
  },
  audioMessageBubble: {
    minWidth: 260,
    maxWidth: '88%',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voiceBubbleContainer: {
    width: '100%',
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceAvatarWrapper: {
    position: 'relative',
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAvatarInitials: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  voiceMicBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveformArea: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  voiceWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 2,
  },
  voiceWaveformBar: {
    width: 2.5,
    borderRadius: 2,
    marginHorizontal: 0.5,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingLeft: 46,
    paddingRight: 2,
  },
  voiceDurationText: {
    fontSize: scaleFont(11),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  voiceTimeTicks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoMessageBubble: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
    minWidth: 230,
    maxWidth: '85%',
  },
  videoBubbleContainer: {
    width: '100%',
  },
  videoCard: {
    width: 240,
    height: 165,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  videoNativeFallback: {
    ...StyleSheet.absoluteFill,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  videoBadgePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  videoBadgeText: {
    fontSize: scaleFont(11),
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mediaCaptionText: {
    marginTop: 6,
    paddingHorizontal: 6,
  },
  imageMessageBubble: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  videoModalTitle: {
    fontSize: scaleFont(16),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalPlayerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  videoNativeOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#8576D0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  videoNativeOpenText: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginLeft: 12,
  },
  bubbleTimeText: {
    fontSize: scaleFont(11),
    fontFamily: Fonts.regular,
  },
  bubbleTickIcon: {
    marginLeft: 3,
  },
  messageMediaImage: {
    width: 210,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#1A1728',
  },
  mediaFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  mediaFileName: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.medium,
    maxWidth: 180,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timeRowCustomer: {
    alignSelf: 'flex-start',
  },
  timeRowAgent: {
    alignSelf: 'flex-end',
  },
  timeText: {
    fontSize: scaleFont(11),
    fontFamily: Fonts.regular,
    color: '#7883A0',
  },
  tickIcon: {
    marginLeft: 4,
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 14 : 18,
  },
  capsuleInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 36,
    borderWidth: 1.5,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 5,
    minHeight: scaleHeight(58),
  },
  capsuleShadowLight: {
    shadowColor: '#6C42EC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  capsuleShadowDark: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  attachButtonLight: {
    width: scaleHeight(44),
    height: scaleHeight(44),
    borderRadius: scaleHeight(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButtonDark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seamlessTextInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: scaleFont(15),
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 110,
  },
  actionCircleButton: {
    width: scaleHeight(46),
    height: scaleHeight(46),
    borderRadius: scaleHeight(23),
    backgroundColor: '#8576D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonShadow: {
    shadowColor: '#8576D0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  attachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  attachmentThumbImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  attachmentThumbBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#8576D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentNameText: {
    flex: 1,
    fontSize: scaleFont(13),
    fontFamily: Fonts.medium,
  },
  attachmentRemoveBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: scaleFont(17),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  modalDesc: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.regular,
    lineHeight: scaleFont(20),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 88,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});
