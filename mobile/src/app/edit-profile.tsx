import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Camera,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react-native';
import { authStore, useAuth } from '@/store/auth';
import { apiClient } from '@/api/client';
import { Fonts } from '@/theme/tokens';
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

  // Custom app modals state (eliminating all native Alerts)
  const [statusModal, setStatusModal] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  React.useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
    authStore.refreshUser();
  }, [user?.full_name]);

  const userEmail = user?.email || '';
  const userInitial = ((fullName || userEmail || 'U').trim()[0] || 'U').toUpperCase();

  // Image picking handlers
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
        aspect: [1, 1], // Perfect square crop for 1:1 circular display
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      setStatusModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to pick image from gallery.',
      });
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
      setStatusModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to capture photo with camera.',
      });
    }
  };

  const handleAvatarPress = () => {
    setShowPhotoPicker(true);
  };

  // Save changes handler
  const handleSave = async () => {
    if (!fullName.trim()) {
      setStatusModal({
        type: 'error',
        title: 'Required',
        message: 'Please enter your full name.',
      });
      return;
    }

    try {
      setIsSaving(true);

      // 1. Update backend DB
      const result = await apiClient.patch('/auth/me', { full_name: fullName.trim() });

      // 2. Update local state & storage
      await authStore.updateUser({
        full_name: (result && result.full_name) ? result.full_name : fullName.trim(),
        avatar_url: avatarUri,
      });

      // 3. Sync & refresh from DB across all screens
      await authStore.refreshUser();
      await authStore.refreshWorkspaces();

      setStatusModal({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully!',
        onConfirm: () => router.back(),
      });
    } catch (err: any) {
      console.error('[EditProfile] Save error:', err);
      setStatusModal({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Failed to update profile in database. Please try again.',
      });
    } finally {
      setIsSaving(false);
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
          onPress={() => router.back()}
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
                    contentFit="cover"
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
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                FULL NAME
              </Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.textPrimary }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="words"
                selectionColor={theme.primary}
              />
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

      {/* Custom Status Modal (Success / Error / Info) */}
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
        <View style={styles.modalOverlay}>
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
              styles.statusModalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Modal Icon Badge */}
            <View
              style={[
                styles.statusIconBox,
                {
                  backgroundColor:
                    statusModal?.type === 'success'
                      ? isDark
                        ? 'rgba(52, 211, 153, 0.16)'
                        : 'rgba(52, 211, 153, 0.12)'
                      : statusModal?.type === 'error'
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.16)'
                        : 'rgba(239, 68, 68, 0.12)'
                      : isDark
                      ? 'rgba(118, 85, 240, 0.16)'
                      : 'rgba(118, 85, 240, 0.12)',
                  borderColor:
                    statusModal?.type === 'success'
                      ? 'rgba(52, 211, 153, 0.3)'
                      : statusModal?.type === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(118, 85, 240, 0.3)',
                },
              ]}
            >
              {statusModal?.type === 'success' ? (
                <CheckCircle2 size={28} color="#34D399" />
              ) : statusModal?.type === 'error' ? (
                <AlertTriangle size={28} color="#EF4444" />
              ) : (
                <Info size={28} color={theme.primary} />
              )}
            </View>

            {/* Title & Message */}
            <Text style={[styles.statusModalTitle, { color: theme.textPrimary }]}>
              {statusModal?.title}
            </Text>
            <Text style={[styles.statusModalMessage, { color: theme.textSecondary }]}>
              {statusModal?.message}
            </Text>

            {/* OK / Done Action Button */}
            <TouchableOpacity
              style={[styles.statusModalConfirmBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                const onConfirm = statusModal?.onConfirm;
                setStatusModal(null);
                if (onConfirm) onConfirm();
              }}
            >
              <Text style={styles.statusModalConfirmText}>
                {statusModal?.type === 'success' ? 'Done' : 'OK'}
              </Text>
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
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 42,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontWeight: '500',
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
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  readOnlyText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
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
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  workspaceNameText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  bottomActionContainer: {
    marginTop: 18,
  },
  saveButton: {
    height: 52,
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
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  statusIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusModalMessage: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusModalConfirmBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
    fontWeight: '700',
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
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  photoPickerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  photoPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 16,
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
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
});
