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
import { formatShortTime, getInitials } from '@/utils/formatters';

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'agent';
  text: string;
  time: string;
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
  const mediaUrl = m.media_url || m.metadata?.media_url || null;
  const mediaType = m.media_type || m.metadata?.message_type || m.metadata?.media_type || null;

  return {
    id: String(m.id || `${m.timestamp}-${Math.random()}`),
    sender: isCust ? 'customer' : isBot ? 'ai' : 'agent',
    text: m.content || '',
    time: formatShortTime(m.timestamp || (m as any).created_at, ''),
    status: m.status,
    mediaUrl,
    mediaType,
    fileName: m.metadata?.filename || null,
  };
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
    const optimisticMsg: Message = {
      id: optimisticId,
      sender: 'agent',
      text: textToSend || (attachmentToSend?.type === 'video' ? 'Sent a video' : 'Sent an image'),
      time: formatShortTime(new Date().toISOString(), 'Just now'),
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
        <LinearGradient
          colors={
            isDark
              ? ['#0C1125', '#10162D', '#0A1023']
              : ['#F2F2F8', '#F6F6FA', '#EEEEF5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

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
              messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                const resolvedMedia = resolveMediaUrl(msg.mediaUrl);
                const lowerMediaType = (msg.mediaType || '').toLowerCase();
                const isVideo = lowerMediaType.includes('video') || Boolean(resolvedMedia?.match(/\.(mp4|mov|webm)(\?|$)/i));
                const isDocument = lowerMediaType.includes('document') || lowerMediaType.includes('pdf') || Boolean(resolvedMedia?.match(/\.pdf(\?|$)/i));

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isCustomer ? styles.customerRow : styles.agentRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
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
                      {resolvedMedia ? (
                        isVideo || isDocument ? (
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
                            onPress={() => Linking.openURL(resolvedMedia).catch(() => {})}
                          >
                            {isVideo ? (
                              <Video size={18} color={isCustomer ? '#8576D0' : '#FFFFFF'} />
                            ) : (
                              <FileText size={18} color={isCustomer ? '#8576D0' : '#FFFFFF'} />
                            )}
                            <Text
                              style={[
                                styles.mediaFileName,
                                { color: isCustomer ? customerTextColor : '#FFFFFF' },
                              ]}
                              numberOfLines={1}
                            >
                              {msg.fileName || (isVideo ? 'Video attachment' : 'Document attachment')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => Linking.openURL(resolvedMedia).catch(() => {})}
                          >
                            <Image
                              source={{ uri: resolvedMedia }}
                              style={styles.messageMediaImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        )
                      ) : null}

                      {msg.text ? (
                        <Text
                          style={[
                            styles.messageText,
                            resolvedMedia ? { marginTop: 8 } : null,
                            isCustomer
                              ? { color: customerTextColor }
                              : { color: '#FFFFFF' },
                          ]}
                        >
                          {msg.text}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.timeRow,
                        isCustomer ? styles.timeRowCustomer : styles.timeRowAgent,
                      ]}
                    >
                      <Text style={styles.timeText}>{msg.time}</Text>
                      {!isCustomer && (
                        msg.status === 'sending' ? (
                          <Check size={14} color="#7883A0" style={styles.tickIcon} />
                        ) : (
                          <CheckCheck
                            size={14}
                            color={msg.status === 'read' ? '#8576D0' : '#7883A0'}
                            style={styles.tickIcon}
                          />
                        )
                      )}
                    </View>
                  </View>
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
  messageRow: {
    marginBottom: 14,
  },
  customerRow: {
    alignItems: 'flex-start',
  },
  agentRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
