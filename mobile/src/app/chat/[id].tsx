import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import {
  ChevronLeft,
  Circle,
  MoreVertical,
  Paperclip,
  Mic,
  Send,
  CheckCheck,
  FileText,
  X,
  Image as ImageIcon,
  File,
  Video,
  Mic as VoiceIcon,
  MessageSquareQuote,
  LayoutTemplate,
  StickyNote,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'agent';
  text: string;
  time: string;
  attachment?: {
    type: 'catalogue';
    title: string;
    subtitle: string;
    thumbnails: string[];
  };
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, statusBarStyle } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string; channel?: string; name?: string }>();

  const conversationId = params.id || '1';
  const isInstagram = params.channel === 'instagram' || conversationId === '2' || conversationId === '5';
  const isTwilio = params.channel === 'twilio' || conversationId === '4' || conversationId === '7';
  const customerName = params.name || (isInstagram ? 'TrendyWear Boutique' : isTwilio ? 'Sneha Fashions' : 'Priya Sharma');

  const [inputMessage, setInputMessage] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [internalNoteAlert, setInternalNoteAlert] = useState<string | null>(null);

  // WhatsApp static conversation matching the exact uploaded UI design
  const whatsappMessages: Message[] = [
    {
      id: 'w1',
      sender: 'customer',
      text: 'Hi, I want to know more about your saree collection.',
      time: '11:20 AM',
    },
    {
      id: 'w2',
      sender: 'ai',
      text: "Hi Priya! 👋 Sure, I'd be happy to help.\nHere is our latest saree collection catalogue.",
      time: '11:21 AM',
      attachment: {
        type: 'catalogue',
        title: 'Saree Collection 2024',
        subtitle: '12 Items • PDF',
        thumbnails: [
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150&q=80',
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=150&q=80',
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=150&q=80',
        ],
      },
    },
    {
      id: 'w3',
      sender: 'customer',
      text: 'Thank you! Can you share the price for this one?',
      time: '11:23 AM',
    },
  ];

  // Instagram static conversation matching Screen 8
  const instagramMessages: Message[] = [
    {
      id: 'i1',
      sender: 'customer',
      text: 'This is super! 😍 Do you have this in size M?',
      time: '11:18 AM',
    },
    {
      id: 'i2',
      sender: 'ai',
      text: 'Yes, available in Size M. Shall I share the product link?',
      time: '11:19 AM',
    },
    {
      id: 'i3',
      sender: 'customer',
      text: 'Yes please! 🙏',
      time: '11:20 AM',
    },
  ];

  // Twilio SMS static conversation
  const twilioMessages: Message[] = [
    {
      id: 't1',
      sender: 'customer',
      text: 'Can you confirm our SMS appointment for tomorrow?',
      time: '10:05 AM',
    },
    {
      id: 't2',
      sender: 'ai',
      text: 'Hello! Yes, your appointment is confirmed for tomorrow at 3:00 PM via Twilio SMS service.',
      time: '10:06 AM',
    },
    {
      id: 't3',
      sender: 'customer',
      text: 'Received the verification code via SMS. Thank you!',
      time: '10:08 AM',
    },
  ];

  const [messages, setMessages] = useState<Message[]>(
    isInstagram ? instagramMessages : isTwilio ? twilioMessages : whatsappMessages
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/inbox');
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  const handleActionClick = (actionName: string) => {
    setShowQuickActions(false);
    if (actionName === 'Internal Note') {
      setInternalNoteAlert('Internal Note mode enabled. Notes are only visible to your team.');
      setTimeout(() => setInternalNoteAlert(null), 3500);
    } else {
      setInternalNoteAlert(`Action triggered: ${actionName}`);
      setTimeout(() => setInternalNoteAlert(null), 2500);
    }
  };

  const navigateToProfile = () => {
    router.push({
      pathname: '/customer/[id]',
      params: { id: conversationId },
    } as any);
  };

  // Theme colors matching the audit and reference image
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
        {/* Background Linear Gradient with angle ~135deg */}
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

        {/* Center Radial Glow effect */}
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
            {/* Back button without surrounding bg & border */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            {/* Customer Avatar & Name (Tappable -> Customer Profile) */}
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
                    {customerName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.onlineDot, { borderColor: isDark ? '#292D66' : '#6669B6' }]} />
              </View>

              <View style={styles.headerTitles}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {customerName}
                </Text>
                <Text style={styles.statusText}>
                  {isInstagram ? 'Active now' : isTwilio ? 'Twilio SMS • Active' : 'Online'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Top Right Section Icons without surrounding bg & border */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
            >
              <Circle size={22} strokeWidth={2.2} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconButton}
              activeOpacity={0.7}
              onPress={navigateToProfile}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 12 }}
            >
              <MoreVertical size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* MAIN CONVERSATION AREA SHEET */}
      <View style={styles.mainContentSheet}>
        {/* Background gradient for conversation area */}
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

        {/* Alert toast for internal notes / quick actions */}
        {internalNoteAlert && (
          <View style={[styles.toastBanner, { backgroundColor: isDark ? '#1F1B2C' : 'rgba(251, 191, 36, 0.15)' }]}>
            <Sparkles size={14} color="#FBBF24" />
            <Text style={[styles.toastText, { color: isDark ? '#FBBF24' : '#B45309' }]}>{internalNoteAlert}</Text>
          </View>
        )}

        {/* Chat Messages Body */}
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.messagesScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Instagram Story Reply Banner (Screen 8) */}
            {isInstagram && (
              <View
                style={[
                  styles.storyReplyCard,
                  {
                    backgroundColor: isDark ? '#1E2540' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
                  },
                ]}
              >
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&q=80',
                  }}
                  style={styles.storyThumbnail}
                />
                <View style={styles.storyTextWrapper}>
                  <Text style={styles.storyTitle}>Replied to your story</Text>
                  <Text style={[styles.storySubtitle, { color: isDark ? '#A2ADD8' : '#6B7280' }]}>
                    Summer Collection Preview
                  </Text>
                </View>
                <Text style={[styles.storyTime, { color: isDark ? '#7E8BA0' : '#9CA3AF' }]}>11:18 AM</Text>
              </View>
            )}

            {/* Messages Flow */}
            {messages.map((msg) => {
              const isCustomer = msg.sender === 'customer';
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
                    <Text
                      style={[
                        styles.messageText,
                        isCustomer
                          ? { color: customerTextColor }
                          : { color: '#FFFFFF' },
                      ]}
                    >
                      {msg.text}
                    </Text>

                    {/* Attachment Card (Screen 7 Saree Catalogue) */}
                    {msg.attachment && (
                      <View
                        style={[
                          styles.catalogueCard,
                          {
                            backgroundColor: isDark ? '#161B32' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
                          },
                        ]}
                      >
                        <View style={styles.thumbnailRow}>
                          {msg.attachment.thumbnails.map((uri, index) => (
                            <Image
                              key={index}
                              source={{ uri }}
                              style={styles.catalogueThumb}
                            />
                          ))}
                        </View>
                        <View style={styles.catalogueMeta}>
                          <View style={styles.pdfIconBadge}>
                            <FileText size={16} color="#F43F5E" />
                          </View>
                          <View style={styles.catalogueDetails}>
                            <Text
                              style={[
                                styles.catalogueTitle,
                                { color: isDark ? '#FFFFFF' : '#1F1A3C' },
                              ]}
                            >
                              {msg.attachment.title}
                            </Text>
                            <Text
                              style={[
                                styles.catalogueSubtitle,
                                { color: isDark ? '#9CA3AF' : '#7883A0' },
                              ]}
                            >
                              {msg.attachment.subtitle}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Timestamp & Read tick placed underneath the bubble */}
                  <View
                    style={[
                      styles.timeRow,
                      isCustomer ? styles.timeRowCustomer : styles.timeRowAgent,
                    ]}
                  >
                    <Text style={styles.timeText}>
                      {msg.time}
                    </Text>
                    {!isCustomer && (
                      <CheckCheck size={14} color="#7883A0" style={styles.tickIcon} />
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom Message Input Bar - Exact match to uploaded images */}
          <View style={styles.bottomBarContainer}>
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
              {/* Attachment Button (Paperclip) */}
              <TouchableOpacity
                style={isDark ? styles.attachButtonDark : styles.attachButtonLight}
                activeOpacity={0.7}
                onPress={() => setShowQuickActions(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Paperclip
                  size={isDark ? 20 : 22}
                  color={isDark ? '#A2ADD8' : '#7583A5'}
                  strokeWidth={2}
                />
              </TouchableOpacity>

              {/* Seamless Text Input */}
              <TextInput
                style={[
                  styles.seamlessTextInput,
                  {
                    color: inputTextColor,
                  },
                ]}
                placeholder="Type a message..."
                placeholderTextColor={placeholderColor}
                value={inputMessage}
                onChangeText={setInputMessage}
                multiline={true}
              />

              {/* Mic / Send Circular Purple Action Button */}
              {inputMessage.trim().length > 0 ? (
                <TouchableOpacity
                  style={[
                    styles.actionCircleButton,
                    { backgroundColor: '#8576D0' },
                    styles.actionButtonShadow,
                  ]}
                  onPress={handleSendMessage}
                  activeOpacity={0.8}
                >
                  <Send size={19} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionCircleButton,
                    { backgroundColor: '#8576D0' },
                    styles.actionButtonShadow,
                  ]}
                  activeOpacity={0.8}
                >
                  <Mic size={21} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Screen 10: Quick Actions Bottom Sheet Modal */}
      <Modal
        visible={showQuickActions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
        >
          <View
            style={[
              styles.bottomSheetCard,
              {
                backgroundColor: isDark ? '#161B30' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: isDark ? '#FFFFFF' : '#111827' },
                ]}
              >
                More Options
              </Text>
              <TouchableOpacity
                onPress={() => setShowQuickActions(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Send Image')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#3B82F620' }]}>
                  <ImageIcon size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Send Image
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Send Document')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#10B98120' }]}>
                  <File size={18} color="#10B981" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Send Document
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Send Video')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#EC489920' }]}>
                  <Video size={18} color="#EC4899" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Send Video
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Send Voice Note')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#F59E0B20' }]}>
                  <VoiceIcon size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Send Voice Note
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Quick Replies')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#8B5CF620' }]}>
                  <MessageSquareQuote size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Quick Replies
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Message Templates')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#06B6D420' }]}>
                  <LayoutTemplate size={18} color="#06B6D4" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Message Templates
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Internal Note')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#EAB30820' }]}>
                  <StickyNote size={18} color="#EAB308" />
                </View>
                <View style={styles.actionDetailsWrap}>
                  <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    Internal Note
                  </Text>
                  <Text style={styles.actionSubtext}>Only visible to team</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionItem,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' },
                ]}
                onPress={() => handleActionClick('Assign Conversation')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#A855F720' }]}>
                  <UserCheck size={18} color="#A855F7" />
                </View>
                <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Assign Conversation
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
    paddingBottom: 22,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  statusText: {
    fontSize: 12.5,
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
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
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
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500',
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
  storyReplyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  storyThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  storyTextWrapper: {
    flex: 1,
  },
  storyTitle: {
    color: '#E1306C',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  storySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  storyTime: {
    fontSize: 11,
    fontFamily: Fonts.regular,
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
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  catalogueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  catalogueThumb: {
    flex: 1,
    height: 76,
    borderRadius: 8,
    backgroundColor: '#1A1728',
  },
  catalogueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catalogueDetails: {
    flex: 1,
  },
  catalogueTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  catalogueSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 2,
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
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#7883A0',
  },
  tickIcon: {
    marginLeft: 4,
  },

  /* Bottom Input Bar - Matching exactly to design capsule */
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
    minHeight: 58,
  },
  capsuleShadowLight: {
    shadowColor: '#6C42EC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 110,
  },
  actionCircleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
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

  /* Quick Actions Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  actionDetailsWrap: {
    flex: 1,
  },
  actionSubtext: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
});
