import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Camera,
  Lock,
  AlertTriangle,
  Info,
  Image as ImageIcon,
  Trash2,
  X,
  Pencil,
  Check,
} from 'lucide-react-native';
import Svg, { Rect, Path, Circle, Line, G } from 'react-native-svg';
import { authStore, useAuth } from '@/store/auth';
import { apiClient } from '@/api/client';
import { Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const authState = useAuth();
  const { isDark } = useAppTheme();

  // Consistent theme colors matching Settings/Inbox card theme without header violet gradient
  const theme = {
    screenBg: isDark ? '#0A1023' : '#EEEEF5',
    cardBg: isDark ? '#202941' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(164, 170, 255, 0.07)' : 'rgba(255, 255, 255, 0.95)',
    cardShadow: isDark ? '#000000' : '#2F2B5A',
    textPrimary: isDark ? '#FFFFFF' : '#1A2138',
    textSecondary: isDark ? '#A2ADD8' : '#7583A5',
    textMuted: isDark ? '#A2ADD8' : '#7583A5',
    placeholder: isDark ? 'rgba(162, 173, 216, 0.45)' : '#9CA3AF',
    iconMuted: isDark ? 'rgba(162, 173, 216, 0.50)' : 'rgba(117, 131, 165, 0.50)',
    primary: isDark ? '#7655F0' : '#8060E8',
    primaryGradient: (isDark
      ? ['#A69BFF', '#7655F0', '#6241DD']
      : ['#8060E8', '#6749DE']) as [string, string, ...string[]],
    roleBg: isDark ? 'rgba(118, 85, 240, 0.22)' : 'rgba(128, 96, 232, 0.15)',
    roleText: isDark ? '#C4B5FD' : '#6F51D1',
  };

  const user = authState.user;
  const workspaceName = authState.selectedWorkspace?.name || authState.workspaces[0]?.name || 'Workspace';
  const userRole = authState.selectedWorkspace?.role || user?.platform_role || 'Member';

  const [fullName, setFullName] = useState(user?.full_name || (user?.email ? user.email.split('@')[0] : ''));
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Custom app modals state (eliminating all native Alerts)
  const [statusModal, setStatusModal] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    authStore
      .refreshUser()
      .then(() => {
        if (cancelled) return;
        const fresh = authStore.getState().user;
        if (fresh?.full_name) setFullName(fresh.full_name);
        if (fresh?.avatar_url !== undefined) setAvatarUri(fresh.avatar_url || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const userEmail = user?.email || '';
  const userInitial = ((fullName || userEmail || 'U').trim()[0] || 'U').toUpperCase();

  const pickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setStatusModal({
          type: 'info',
          title: 'Permission Required',
          message: 'Permission to access the media library is needed to select a profile photo.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      setStatusModal({ type: 'error', title: 'Error', message: 'Failed to pick image from gallery.' });
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setStatusModal({
          type: 'info',
          title: 'Permission Required',
          message: 'Camera permission is needed to take a profile photo.',
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      setStatusModal({ type: 'error', title: 'Error', message: 'Failed to capture photo with camera.' });
    }
  };

  const handleAvatarPress = () => {
    setShowPhotoPicker(true);
  };

  const handleStartEditName = () => {
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const persistProfileChanges = async (options?: { exitOnSuccess?: boolean }) => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setStatusModal({ type: 'error', title: 'Required', message: 'Please enter your full name.' });
      return;
    }
    const setBusy = options?.exitOnSuccess ? setIsSaving : setIsSavingName;
    try {
      setBusy(true);
      let resolvedAvatarUrl: string | null = avatarUri;
      if (
        resolvedAvatarUrl &&
        (resolvedAvatarUrl.startsWith('file://') ||
          resolvedAvatarUrl.startsWith('content://') ||
          resolvedAvatarUrl.startsWith('ph://') ||
          resolvedAvatarUrl.startsWith('blob:') ||
          resolvedAvatarUrl.startsWith('data:'))
      ) {
        const workspaceId = authState.selectedWorkspace?.id || authState.workspaces[0]?.id;
        const uploaded = await apiClient.uploadFile(
          { uri: resolvedAvatarUrl, name: 'profile-avatar.jpg', mimeType: 'image/jpeg' },
          workspaceId
        );
        resolvedAvatarUrl = uploaded.url;
        setAvatarUri(resolvedAvatarUrl);
      }
      const result = await apiClient.patch('/auth/me', {
        full_name: trimmedName,
        avatar_url: resolvedAvatarUrl,
      });
      await authStore.updateUser({
        full_name: result?.full_name || trimmedName,
        avatar_url: result?.avatar_url ?? resolvedAvatarUrl,
      });
      await authStore.refreshUser();
      await authStore.refreshWorkspaces();
      if (!options?.exitOnSuccess) setIsEditingName(false);
      setStatusModal({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile changes have been saved successfully.',
        onConfirm: options?.exitOnSuccess
          ? () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))
          : undefined,
      });
    } catch (err: any) {
      console.error('[EditProfile] Save error:', err);
      setStatusModal({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Failed to update profile in database. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveName = () => persistProfileChanges({ exitOnSuccess: false });
  const handleSave = () => persistProfileChanges({ exitOnSuccess: true });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/settings');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.screenBg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Clean Top Header (No Violet Gradient) */}
      <View style={[styles.header, { backgroundColor: theme.screenBg }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(128, 140, 190, 0.12)' : 'rgba(255, 255, 255, 0.85)' },
          ]}
          activeOpacity={0.7}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Edit Profile
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAvatarPress}
              style={styles.avatarWrapper}
            >
              {avatarUri ? (
                <View
                  style={[
                    styles.avatarCircle,
                    { borderColor: theme.cardBorder },
                  ]}
                >
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={theme.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </LinearGradient>
              )}

              {/* Floating Camera Badge */}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.screenBg,
                  },
                ]}
              >
                <Camera size={16} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAvatarPress}
              style={styles.changePhotoBtn}
            >
              <Text
                style={[
                  styles.changePhotoText,
                  { color: isDark ? '#A69BFF' : theme.primary },
                ]}
              >
                Change photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields Cards */}
          <View style={styles.formContainer}>
            {/* FULL NAME CARD */}
            <View
              style={[
                styles.fieldCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.cardShadow,
                },
              ]}
            >
              <View style={styles.nameRow}>
                <View style={styles.nameTextCol}>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                    FULL NAME
                  </Text>
                  {isEditingName ? (
                    <TextInput
                      ref={nameInputRef}
                      style={[styles.fieldInput, { color: theme.textPrimary }]}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your name"
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="words"
                      selectionColor={theme.primary}
                      autoFocus={true}
                      onSubmitEditing={handleSaveName}
                      returnKeyType="done"
                    />
                  ) : (
                    <Text
                      style={[styles.fieldInputText, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {fullName || 'No name set'}
                    </Text>
                  )}
                </View>

                {/* Edit / Save Button on Right Side */}
                <TouchableOpacity
                  style={[
                    styles.nameActionBtn,
                    {
                      backgroundColor: isEditingName
                        ? theme.primary
                        : isDark
                        ? 'rgba(118, 85, 240, 0.16)'
                        : 'rgba(128, 96, 232, 0.12)',
                      borderColor: isEditingName
                        ? theme.primary
                        : isDark
                        ? 'rgba(166, 155, 255, 0.25)'
                        : 'rgba(128, 96, 232, 0.25)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={isEditingName ? handleSaveName : handleStartEditName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : isEditingName ? (
                    <View style={styles.btnContentRow}>
                      <Check size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                      <Text style={[styles.nameActionBtnText, { color: '#FFFFFF' }]}>Save</Text>
                    </View>
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Pencil
                        size={13}
                        color={isDark ? '#C4B5FD' : theme.primary}
                        strokeWidth={2}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.nameActionBtnText,
                          { color: isDark ? '#C4B5FD' : theme.primary },
                        ]}
                      >
                        Edit
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* EMAIL ADDRESS CARD (Read-only + Lock indicator) */}
            <View
              style={[
                styles.fieldCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.cardShadow,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                EMAIL ADDRESS
              </Text>
              <View style={styles.readOnlyRow}>
                <Text
                  style={[styles.readOnlyText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {userEmail}
                </Text>
                <Lock size={17} color={theme.iconMuted} strokeWidth={2} />
              </View>
            </View>

            {/* WORKSPACE & ROLE BADGE PILL */}
            <View style={styles.roleContainer}>
              <View
                style={[
                  styles.rolePill,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                    shadowColor: theme.cardShadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: theme.roleBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: theme.roleText },
                    ]}
                  >
                    {userRole}
                  </Text>
                </View>
                <Text
                  style={[styles.workspaceNameText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {workspaceName}
                </Text>
              </View>
            </View>
          </View>

          {/* SAVE CHANGES BUTTON */}
          <View style={styles.bottomActionContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.primary,
                  opacity: isSaving ? 0.75 : 1,
                  shadowColor: theme.primary,
                },
              ]}
              activeOpacity={0.85}
              disabled={isSaving}
              onPress={handleSave}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Status Bottom Sheet Modal (Success "Congrats" / Error / Info) */}
      <Modal
        visible={!!statusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          const onConfirm = statusModal?.onConfirm;
          setStatusModal(null);
          if (onConfirm) onConfirm();
        }}
      >
        <View style={styles.statusSheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              const onConfirm = statusModal?.onConfirm;
              setStatusModal(null);
              if (onConfirm) onConfirm();
            }}
          />
          <View
            style={[
              styles.statusSheetCard,
              {
                backgroundColor: isDark ? '#181C2E' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {/* Header: Title ("Edit Profile") + Circular Close Button (X) */}
            <View style={styles.statusSheetHeader}>
              <Text style={[styles.statusSheetHeaderTitle, { color: theme.textPrimary }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                style={[
                  styles.statusSheetCloseBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  const onConfirm = statusModal?.onConfirm;
                  setStatusModal(null);
                  if (onConfirm) onConfirm();
                }}
              >
                <X size={16} color={isDark ? '#FFFFFF' : '#475569'} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Illustration Section */}
            <View style={styles.statusSheetIllustration}>
              {statusModal?.type === 'success' ? (
                <Svg width={220} height={150} viewBox="0 0 220 150" fill="none">
                  {/* Subtle circular halo background */}
                  <Circle
                    cx="110"
                    cy="75"
                    r="60"
                    fill={isDark ? '#222B48' : '#EDE9FE'}
                    opacity={isDark ? 0.7 : 0.8}
                  />

                  {/* Sparkle / decorative dots */}
                  <Circle cx="168" cy="34" r="2.5" fill="#7655F0" opacity={0.8} />
                  <Circle cx="52" cy="118" r="3" fill="#7655F0" opacity={0.65} />

                  {/* Floating window / profile card */}
                  <Rect
                    x="35"
                    y="40"
                    width="150"
                    height="85"
                    rx="12"
                    fill={isDark ? '#161B2E' : '#FFFFFF'}
                    stroke={isDark ? '#2C3555' : '#E2E8F0'}
                    strokeWidth="1.5"
                  />

                  {/* Window title bar 3 dots */}
                  <Circle cx="48" cy="51" r="2.2" fill="#7655F0" />
                  <Circle cx="55" cy="51" r="2.2" fill="#9E8CFC" />
                  <Circle cx="62" cy="51" r="2.2" fill="#C4B5FD" />

                  {/* Window title bar divider */}
                  <Line
                    x1="35"
                    y1="59"
                    x2="185"
                    y2="59"
                    stroke={isDark ? '#232C48' : '#F1F5F9'}
                    strokeWidth="1"
                  />

                  {/* Glowing Shield with Checkmark on left */}
                  <G transform="translate(68, 88)">
                    {/* Outer shield glow */}
                    <Path
                      d="M 0,-18 L 16,-12 C 16,3 10,12 0,18 C -10,12 -16,3 -16,-12 Z"
                      fill={isDark ? 'rgba(118, 85, 240, 0.25)' : 'rgba(118, 85, 240, 0.15)'}
                    />
                    {/* Inner shield */}
                    <Path
                      d="M 0,-15 L 13,-10 C 13,2 8,10 0,15 C -8,10 -13,2 -13,-10 Z"
                      fill={isDark ? '#2C2658' : '#EDE9FE'}
                      stroke="#7655F0"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    {/* Checkmark inside shield */}
                    <Path
                      d="M -5,0 L -1,4 L 6,-4"
                      stroke={isDark ? '#FFFFFF' : '#7655F0'}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </G>

                  {/* Profile data preview lines on right */}
                  <Rect
                    x="96"
                    y="69"
                    width="74"
                    height="6"
                    rx="3"
                    fill={isDark ? '#3D4A74' : '#CBD5E1'}
                  />
                  <Rect
                    x="96"
                    y="79"
                    width="56"
                    height="5"
                    rx="2.5"
                    fill={isDark ? '#283252' : '#E2E8F0'}
                  />
                  <Rect
                    x="96"
                    y="88"
                    width="66"
                    height="5"
                    rx="2.5"
                    fill={isDark ? '#283252' : '#E2E8F0'}
                  />
                  <Rect
                    x="96"
                    y="97"
                    width="44"
                    height="5"
                    rx="2.5"
                    fill={isDark ? '#283252' : '#E2E8F0'}
                  />

                  {/* 5-Star pill badge overlapping bottom right */}
                  <Rect
                    x="94"
                    y="112"
                    width="88"
                    height="24"
                    rx="6"
                    fill={isDark ? '#111524' : '#F8FAFC'}
                    stroke={isDark ? '#2C3656' : '#E2E8F0'}
                    strokeWidth="1.2"
                  />
                  {/* 5 purple stars */}
                  {[103, 116, 129, 142, 155].map((starX, idx) => (
                    <G key={idx} transform={`translate(${starX}, 124)`}>
                      <Path
                        d="M 0.0,-4.2 L 1.08,-1.5 L 3.99,-1.3 L 1.75,0.57 L 2.47,3.4 L 0.0,1.85 L -2.47,3.4 L -1.75,0.57 L -3.99,-1.3 L -1.08,-1.5 Z"
                        fill="#7655F0"
                      />
                    </G>
                  ))}
                </Svg>
              ) : (
                <View
                  style={[
                    styles.statusErrorIconBox,
                    {
                      backgroundColor:
                        statusModal?.type === 'error'
                          ? isDark
                            ? 'rgba(239, 68, 68, 0.16)'
                            : 'rgba(239, 68, 68, 0.12)'
                          : isDark
                          ? 'rgba(118, 85, 240, 0.16)'
                          : 'rgba(118, 85, 240, 0.12)',
                      borderColor:
                        statusModal?.type === 'error'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(118, 85, 240, 0.3)',
                    },
                  ]}
                >
                  {statusModal?.type === 'error' ? (
                    <AlertTriangle size={32} color="#EF4444" />
                  ) : (
                    <Info size={32} color={theme.primary} />
                  )}
                </View>
              )}
            </View>

            {/* Title: Congrats */}
            <Text style={[styles.statusSheetCongratsTitle, { color: theme.textPrimary }]}>
              {statusModal?.type === 'success' ? 'Congrats' : (statusModal?.title || 'Alert')}
            </Text>

            {/* Subtitle / Description */}
            <Text style={[styles.statusSheetDescription, { color: theme.textSecondary }]}>
              {statusModal?.type === 'success'
                ? 'Your name successfully changed. You can use your account now.'
                : statusModal?.message}
            </Text>

            {/* Done Action Button */}
            <TouchableOpacity
              style={[styles.statusSheetDoneBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                const onConfirm = statusModal?.onConfirm;
                setStatusModal(null);
                if (onConfirm) onConfirm();
              }}
            >
              <Text style={styles.statusSheetDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Profile Photo Selection Sheet / Modal */}
      <Modal
        visible={showPhotoPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPhotoPicker(false)}
          />
          <View
            style={[
              styles.photoPickerCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.photoPickerHeader}>
              <View>
                <Text style={[styles.photoPickerTitle, { color: theme.textPrimary }]}>
                  Profile Photo
                </Text>
                <Text style={[styles.photoPickerSubtitle, { color: theme.textSecondary }]}>
                  Choose an option to update your photo
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.photoPickerCloseBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setShowPhotoPicker(false)}
              >
                <X size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={styles.photoPickerOptions}>
              {/* Option 1: Choose from Gallery */}
              <TouchableOpacity
                style={[
                  styles.photoPickerOptionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: theme.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowPhotoPicker(false);
                  setTimeout(() => pickFromGallery(), 250);
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? 'rgba(118, 85, 240, 0.16)' : 'rgba(128, 96, 232, 0.12)' }]}>
                  <ImageIcon size={20} color={theme.primary} />
                </View>
                <View style={styles.optionTextBox}>
                  <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                    Choose from Gallery
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                    Select an existing image from your device
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Take Photo */}
              <TouchableOpacity
                style={[
                  styles.photoPickerOptionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: theme.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setShowPhotoPicker(false);
                  setTimeout(() => takePhoto(), 250);
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(52, 211, 153, 0.12)' }]}>
                  <Camera size={20} color="#34D399" />
                </View>
                <View style={styles.optionTextBox}>
                  <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                    Take Photo
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                    Capture a new picture using camera
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Remove Photo (if set) */}
              {avatarUri && (
                <TouchableOpacity
                  style={[
                    styles.photoPickerOptionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.05)',
                      borderColor: isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.18)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowPhotoPicker(false);
                    setAvatarUri(null);
                  }}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.18)' : 'rgba(244, 63, 94, 0.12)' }]}>
                    <Trash2 size={20} color="#FF1744" />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={[styles.optionTitle, { color: '#FF1744' }]}>
                      Remove Photo
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: isDark ? '#FDA4AF' : '#E11D48' }]}>
                      Reset avatar back to initial
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: scaleContainer(20),
    paddingTop: scaleContainer(16),
    paddingBottom: scaleContainer(40),
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    width: scaleHeight(104),
    height: scaleHeight(104),
    borderRadius: scaleHeight(52),
  },
  avatarCircle: {
    width: scaleHeight(104),
    height: scaleHeight(104),
    borderRadius: scaleHeight(52),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: scaleFont(42),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: scaleContainer(16),
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  changePhotoBtn: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changePhotoText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  formContainer: {
    gap: 14,
  },
  fieldCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    padding: 0,
    margin: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  fieldInputText: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    paddingVertical: 1,
  },
  nameActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameActionBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  readOnlyText: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    flex: 1,
    paddingRight: 8,
  },
  roleContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 14,
    borderWidth: 1,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  roleBadge: {
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  workspaceNameText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  bottomActionContainer: {
    marginTop: 18,
  },
  saveButton: {
    height: scaleHeight(52),
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleContainer(20),
  },
  statusSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  statusSheetCard: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  statusSheetHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusSheetHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.light,
    fontWeight: '300',
    letterSpacing: -0.1,
  },
  statusSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: scaleContainer(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSheetIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statusErrorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statusSheetCongratsTitle: {
    fontSize: scaleFont(18),
    fontFamily: Fonts.light,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  statusSheetDescription: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statusSheetDoneBtn: {
    width: '100%',
    height: scaleHeight(50),
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSheetDoneText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontFamily: Fonts.light,
    fontWeight: '300',
    letterSpacing: -0.1,
  },
  photoPickerCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  photoPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  photoPickerTitle: {
    fontSize: scaleFont(18),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  photoPickerSubtitle: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginTop: 2,
  },
  photoPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: scaleContainer(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerOptions: {
    gap: 10,
  },
  photoPickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: scaleContainer(16),
    borderWidth: 1,
    gap: 14,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
});
