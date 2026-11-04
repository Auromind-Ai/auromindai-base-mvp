import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Path,
} from 'react-native-svg';
import {
  ChevronLeft,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { authStore, useAuth } from '@/store/auth';
import { requestAccountDeletion, cancelAccountDeletion } from '@/api/auth';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const authState = useAuth();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : Platform.OS === 'ios' ? 44 : 20) + 12;

  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const theme = {
    screenBg: isDark ? '#0A1023' : '#EEEEF5',
    cardBg: isDark ? '#182038' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(215, 222, 238, 0.9)',
    cardShadow: isDark ? '#000000' : '#2F2B5A',
    textPrimary: isDark ? '#FFFFFF' : '#1A2138',
    textSecondary: isDark ? '#A2ADD8' : '#6B7280',
    textMuted: isDark ? '#7583A5' : '#9CA3AF',
    divider: isDark ? 'rgba(162, 173, 216, 0.10)' : 'rgba(117, 131, 165, 0.12)',
    primary: isDark ? '#7655F0' : '#8060E8',
    primaryDisabled: isDark ? 'rgba(118, 85, 240, 0.45)' : 'rgba(128, 96, 232, 0.45)',
    checkboxBorder: isDark ? 'rgba(162, 173, 216, 0.35)' : '#CBD5E1',
    modalBg: isDark ? '#1A223D' : '#FFFFFF',
    modalBorder: isDark ? 'rgba(164, 170, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    modalOverlay: 'rgba(0, 0, 0, 0.65)',
    trashCircleBg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FFEAEA',
    closeBtnBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  };

  const isPendingDeletion = !!authState.user?.deletion_scheduled_at;
  const scheduledDateFormatted = authState.user?.deletion_scheduled_at
    ? new Date(authState.user.deletion_scheduled_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Execute deletion request
  const handleRequestDeletion = async () => {
    if (!confirmedCheckbox || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestAccountDeletion();
      await authStore.refreshUser();
      // Show Confirmation Modal (Screen 49)
      setShowDoneModal(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to submit account deletion request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // When user clicks "Done" on the Confirmation popup (Screen 49)
  const handleDoneLogout = async () => {
    setShowDoneModal(false);
    try {
      await authStore.signOut();
    } catch {
      await authStore.clearAuth();
    } finally {
      router.replace('/(auth)/login');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/settings');
    }
  };

  // Cancel deletion if already scheduled
  const handleCancelPending = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await cancelAccountDeletion();
      await authStore.refreshUser();
      handleBack();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to cancel deletion. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBg }]}>
      <StatusBar style="light" />

      {/* TOP HEADER SECTION WITH SIGNATURE GRADIENT & GLOW */}
      <View style={styles.headerWrapper}>
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
                id={isDark ? 'delDarkGlow' : 'delLightGlow'}
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
              fill={`url(#${isDark ? 'delDarkGlow' : 'delLightGlow'})`}
            />
          </Svg>
        </View>

        <SafeAreaView edges={['left', 'right']}>
          <View style={[styles.headerTitleRow, { paddingTop: topPadding }]}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitleText}>Delete Account</Text>
            <View style={styles.headerRightSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN CONTENT SHEET (Screen 48 UI) */}
      <View
        style={[
          styles.mainSheetCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending Deletion Warning (if already scheduled) */}
          {isPendingDeletion && scheduledDateFormatted && (
            <View
              style={[
                styles.alreadyScheduledBox,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
                },
              ]}
            >
              <AlertTriangle size={20} color="#EF4444" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alreadyScheduledTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  Deletion Already Scheduled
                </Text>
                <Text style={[styles.alreadyScheduledDesc, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                  Your account is scheduled for permanent deletion on {scheduledDateFormatted}.
                  Log in before this date to recover and restore your account.
                </Text>
                <TouchableOpacity
                  style={styles.cancelPendingBtn}
                  activeOpacity={0.8}
                  disabled={isCancelling}
                  onPress={handleCancelPending}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.cancelPendingBtnText}>Cancel Deletion & Restore</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Heading */}
          <Text style={[styles.mainHeading, { color: theme.textPrimary }]}>
            Are you sure you want to delete your account?
          </Text>

          {/* Subtitle / consequences */}
          <Text style={[styles.mainDescription, { color: theme.textSecondary }]}>
            By deleting your account, you won’t be able to revert this action and all your data,
            including profiles, submitted projects, your payments will be lost.
          </Text>

          {/* Bullet points section */}
          <Text style={[styles.bulletSectionTitle, { color: theme.textPrimary }]}>
            Before you delete, make sure that:
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                You will no longer be able to access your account.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                Account deletion requests will typically be completed within 30 days.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                You will be logged out of the app after submitting your request.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                Deleting your account won’t affect any existing agreements with Auromindai.
              </Text>
            </View>
          </View>

          {/* Interactive Checkbox Row */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            activeOpacity={0.8}
            onPress={() => setConfirmedCheckbox((prev) => !prev)}
          >
            <View
              style={[
                styles.checkboxBox,
                confirmedCheckbox
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: 'transparent', borderColor: theme.checkboxBorder },
              ]}
            >
              {confirmedCheckbox && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.textSecondary }]}>
              By clicking ‘Delete Account,’ I confirm that I’ve read and understood the above and
              want to delete my account.
            </Text>
          </TouchableOpacity>

          {/* Error Message if any */}
          {errorMessage && (
            <View style={styles.errorMessageBox}>
              <AlertTriangle size={16} color="#EF4444" />
              <Text style={styles.errorMessageText}>{errorMessage}</Text>
            </View>
          )}

          {/* Spacer */}
          <View style={{ height: 28 }} />
        </ScrollView>

        {/* Bottom Action Button */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor:
                  confirmedCheckbox && !isSubmitting
                    ? theme.primary
                    : theme.primaryDisabled,
              },
            ]}
            activeOpacity={0.8}
            disabled={!confirmedCheckbox || isSubmitting}
            onPress={handleRequestDeletion}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* ============================================================== */}
      {/* SCREEN 49: CONFIRMATION MODAL BOTTOM SHEET                     */}
      {/* ============================================================== */}
      <Modal
        visible={showDoneModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDoneLogout}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDoneLogout} />

          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.modalBorder,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>
                Delete Account
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseCircle, { backgroundColor: theme.closeBtnBg }]}
                activeOpacity={0.7}
                onPress={handleDoneLogout}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Illustration matching Screenshot 49 */}
            <View style={styles.illustrationWrapper}>
              <View
                style={[
                  styles.trashCircleBadge,
                  { backgroundColor: theme.trashCircleBg },
                ]}
              >
                {/* Custom Coral Trash Can SVG */}
                <Svg width={54} height={54} viewBox="0 0 54 54" fill="none">
                  {/* Top lid handle */}
                  <Rect x="21" y="8" width="12" height="4" rx="2" fill="#FF5A5F" />
                  {/* Main lid bar */}
                  <Rect x="14" y="13" width="26" height="5" rx="2.5" fill="#FF5A5F" />
                  {/* Bin body */}
                  <Path
                    d="M17.5 20 H36.5 L34.8 41 C34.6 43 33.0 44.5 31.0 44.5 H23.0 C21.0 44.5 19.4 43 19.2 41 L17.5 20 Z"
                    fill="#FF5A5F"
                  />
                  {/* Rounded horizontal slots inside bin */}
                  <Rect x="22" y="27" width="10" height="3" rx="1.5" fill="#FFFFFF" />
                  <Rect x="22" y="34" width="10" height="3" rx="1.5" fill="#FFFFFF" />
                </Svg>
              </View>
            </View>

            {/* Confirmation Title */}
            <Text style={[styles.confirmationTitle, { color: theme.textPrimary }]}>
              Confirmation!
            </Text>

            {/* 30-Day Recovery Concept Description */}
            <Text style={[styles.confirmationSubtitle, { color: theme.textSecondary }]}>
              Your account has been scheduled for deletion. You will be logged out now.
              {'\n\n'}
              You have a 30-day grace period to log back in anytime to recover and restore your account.
            </Text>

            {/* Done Action Button */}
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
              onPress={handleDoneLogout}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerWrapper: {
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  headerRightSpacer: {
    width: 36,
  },
  mainSheetCard: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  mainHeading: {
    fontSize: 18,
    fontFamily: Fonts.medium,
    fontWeight: '300',
    letterSpacing: -0.2,
    lineHeight: 25,
    marginBottom: 12,
  },
  mainDescription: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 20,
  },
  bulletSectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '300',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  bulletList: {
    gap: 12,
    marginBottom: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 13,
    lineHeight: 18,
    marginRight: 8,
    opacity: 0.7,
  },
  bulletText: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 18.5,
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 18,
    flex: 1,
  },
  errorMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorMessageText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    color: '#EF4444',
    flex: 1,
  },
  alreadyScheduledBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  alreadyScheduledTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginBottom: 3,
  },
  alreadyScheduledDesc: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 17,
    marginBottom: 8,
  },
  cancelPendingBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelPendingBtnText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bottomBarContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
  },
  deleteButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  /* Screen 49 Modal styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 28 : 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  trashCircleBadge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationTitle: {
    fontSize: 19,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  confirmationSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  doneButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
