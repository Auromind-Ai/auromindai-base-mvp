import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Mail,
} from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { verifyOTP, sendOTP, verifyTwoFactorLogin } from '../../api/auth';
import { authStore } from '../../store/auth';
import { Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';
import { scaleFont, scaleContainer, scaleHeight } from '../../theme/responsive';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { isDark, statusBarStyle } = useAppTheme();
  const params = useLocalSearchParams<{
    contact?: string;
    method?: string;
    authType?: 'login' | 'signup';
    fullName?: string;
  }>();

  const displayContact = params.contact || 'your@email.com';
  const authType = params.authType || 'login';
  const fullName = params.fullName;

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pending2FAToken, setPending2FAToken] = useState<string | null>(null);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Countdown timer for Resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (timer > 0 || resendLoading) return;
    setError('');
    setSuccessMessage('');
    setResendLoading(true);

    try {
      await sendOTP(displayContact, authType);
      setTimer(60);
      setOtp('');
      setSuccessMessage('Verification code resent successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < OTP_LENGTH || loading) return;

    setError('');
    setLoading(true);

    try {
      if (pending2FAToken) {
        const twoFaRes = await verifyTwoFactorLogin(pending2FAToken, otp);
        if (!twoFaRes?.access_token || !twoFaRes?.user) {
          setError('Two-factor verification did not return a valid session.');
          return;
        }
        await authStore.setAuth({
          token: twoFaRes.access_token,
          user: twoFaRes.user,
          workspaces: twoFaRes.workspaces,
        });
        router.replace('/(tabs)/inbox');
        return;
      }

      const data = await verifyOTP(displayContact, otp, authType, fullName);

      if (data?.requiresTwoFactor && data?.pending_token) {
        setPending2FAToken(data.pending_token);
        setOtp('');
        setSuccessMessage('Enter the 6-digit code from your authenticator app.');
        return;
      }

      if (!data?.access_token || !data?.user) {
        setError('Verification did not return an active session. Please try again.');
        return;
      }

      await authStore.setAuth({
        token: data.access_token,
        user: data.user,
        workspaces: data.workspaces,
      });

      router.replace('/(tabs)/inbox');
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('incorrect')
      ) {
        setError('Invalid or expired OTP. Please check and try again.');
      } else {
        setError(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: isDark ? '#0A1023' : '#F8F9FA' }]}>
      <StatusBar style={statusBarStyle} />

      {/* 1. SEAMLESS FULL-SCREEN CONTINUOUS BACKGROUND GRADIENT */}
      <LinearGradient
        colors={
          isDark
            ? ['#151C3E', '#21255C', '#322F74', '#1E214E', '#111633', '#0A1023']
            : ['#F3E8FF', '#EDE9FE', '#F5F3FF', '#EDE9FE', '#FAF5FF', '#F8F9FA']
        }
        locations={[0, 0.18, 0.38, 0.58, 0.80, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      {/* 2. ATMOSPHERIC AMBIENT GLOW */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient
              id="seamlessAtmosphereOtp"
              cx="50%"
              cy="14%"
              rx="68%"
              ry="50%"
              fx="50%"
              fy="14%"
            >
              <Stop offset="0%" stopColor={isDark ? "#6F5BFF" : "#7C3AED"} stopOpacity={isDark ? 0.48 : 0.16} />
              <Stop offset="45%" stopColor={isDark ? "#514BC0" : "#8B5CF6"} stopOpacity={isDark ? 0.22 : 0.08} />
              <Stop offset="75%" stopColor={isDark ? "#292D66" : "#DDD6FE"} stopOpacity={isDark ? 0.08 : 0.03} />
              <Stop offset="100%" stopColor={isDark ? "#0A1023" : "#F8F9FA"} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#seamlessAtmosphereOtp)" />
        </Svg>
      </View>

      {/* 3. CONTENT AREA */}
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar with Glassmorphic Back Arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                backgroundColor: isDark ? '#161F33' : '#FFFFFF',
                borderColor: isDark ? 'rgba(164, 170, 255, 0.12)' : '#E5E7EB',
                shadowOpacity: isDark ? 0.25 : 0.06,
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <ArrowLeft size={20} color={isDark ? "#F8F8FF" : "#111827"} />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Inbox Card (#202941) with Integrated Brand Hero */}
              <View
                style={[
                  styles.inboxCard,
                  {
                    backgroundColor: isDark ? '#202941' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(164, 170, 255, 0.09)' : '#E5E7EB',
                    shadowColor: isDark ? '#000000' : '#7C3AED',
                    shadowOpacity: isDark ? 0.45 : 0.08,
                  },
                ]}
              >
                {/* Title & Subtitle with Integrated Logo */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardLogoWrapper}>
                    <OrbionLogo size="sm" showText={true} />
                  </View>
                  <Text style={[styles.cardTitle, { color: isDark ? '#F8F8FF' : '#111827' }]}>{pending2FAToken ? 'Two-Factor Authentication' : 'Verify Your Email'}</Text>
                  <Text style={[styles.cardSubtitle, { color: isDark ? '#8E99B7' : '#4B5563' }]}>
                    {pending2FAToken ? 'Enter the 6-digit authenticator code for' : 'We have sent a 6-digit verification code to'}
                  </Text>
                  <View
                    style={[
                      styles.contactRow,
                      {
                        backgroundColor: isDark ? '#141C30' : '#F3F4F6',
                        borderColor: isDark ? 'rgba(164, 170, 255, 0.10)' : '#E5E7EB',
                      },
                    ]}
                  >
                    <Mail size={14} color={isDark ? '#A69BFF' : '#7C3AED'} style={{ marginRight: 6 }} />
                    <Text style={[styles.contactText, { color: isDark ? '#F8F8FF' : '#111827' }]}>{displayContact}</Text>
                    <TouchableOpacity
                      onPress={() => router.back()}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.editLink, { color: isDark ? '#A69BFF' : '#7C3AED' }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Banner */}
                {error ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={15} color="#F87171" style={styles.errorIcon} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Success Banner */}
                {successMessage ? (
                  <View style={styles.successBanner}>
                    <CheckCircle2 size={15} color="#34D399" style={styles.errorIcon} />
                    <Text style={styles.successText}>{successMessage}</Text>
                  </View>
                ) : null}

                {/* Hidden Native Input Layer */}
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length <= OTP_LENGTH) {
                      setOtp(cleaned);
                      if (error) setError('');
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  style={styles.hiddenInput}
                  autoFocus={true}
                  accessibilityLabel="6 digit verification code"
                />

                {/* 6 Individual Box Cells */}
                <TouchableOpacity
                  style={styles.otpBoxesContainer}
                  activeOpacity={1}
                  onPress={() => inputRef.current?.focus()}
                >
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                    const digit = otp[index] || '';
                    const isCellFocused = otp.length === index;
                    const isFilled = Boolean(digit);

                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          {
                            backgroundColor: isDark ? '#141C30' : '#F9FAFB',
                            borderColor: isDark ? 'rgba(164, 170, 255, 0.12)' : '#D1D5DB',
                          },
                          isFilled && {
                            borderColor: isDark ? '#8A3FFC' : '#7C3AED',
                            backgroundColor: isDark ? '#192038' : '#FAF5FF',
                          },
                          isCellFocused && {
                            borderColor: isDark ? '#A69BFF' : '#7C3AED',
                            borderWidth: 1.5,
                            shadowColor: '#7C3AED',
                            shadowOpacity: isDark ? 0.35 : 0.12,
                          },
                        ]}
                      >
                        <Text style={[styles.otpDigit, { color: isDark ? '#FFFFFF' : '#111827' }]}>{digit}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                {/* Resend Code Row */}
                <View style={styles.resendRow}>
                  <Text style={[styles.resendPrefix, { color: isDark ? '#8E99B7' : '#6B7280' }]}>{"Didn't receive code? "}</Text>
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={isDark ? "#A69BFF" : "#7C3AED"} />
                  ) : timer > 0 ? (
                    <Text style={[styles.timerText, { color: isDark ? '#8E99B7' : '#6B7280' }]}>
                      Resend in {formatTimer(timer)}
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                      <Text style={[styles.resendActiveText, { color: isDark ? '#A69BFF' : '#7C3AED' }]}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Verify & Continue Action Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={otp.length < OTP_LENGTH || loading}
                  onPress={handleVerify}
                  style={[
                    styles.verifyButtonWrapper,
                    (otp.length < OTP_LENGTH || loading) && styles.verifyButtonDisabled,
                    !isDark && otp.length >= OTP_LENGTH && !loading && { borderColor: "rgba(124, 58, 237, 0.3)" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Verify and Continue"
                >
                  <LinearGradient
                    colors={
                      otp.length < OTP_LENGTH || loading
                        ? (isDark ? ['#353A5A', '#272B45'] : ['#E5E7EB', '#D1D5DB'])
                        : ['#8A3FFC', '#6E2FE4']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.verifyGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.verifyContent}>
                        <Text style={[styles.verifyButtonText, !isDark && (otp.length < OTP_LENGTH || loading) && { color: '#6B7280' }]}>Verify & Continue</Text>
                        <ArrowRight size={17} color={!isDark && (otp.length < OTP_LENGTH || loading) ? "#6B7280" : "#FFFFFF"} style={{ marginLeft: 6 }} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A1023',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: scaleContainer(16),
    paddingTop: scaleContainer(8),
    paddingBottom: scaleContainer(4),
  },
  backButton: {
    width: scaleHeight(40),
    height: scaleHeight(40),
    borderRadius: scaleContainer(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161F33',
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleContainer(16),
    paddingTop: scaleContainer(12),
    paddingBottom: scaleContainer(28),
    flexGrow: 1,
    justifyContent: 'center',
  },

  cardLogoWrapper: {
    alignItems: 'center',
    marginBottom: scaleContainer(14),
  },

  /* INBOX CARD (#202941) */
  inboxCard: {
    backgroundColor: '#202941',
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.09)',
    borderRadius: scaleContainer(24),
    paddingHorizontal: scaleContainer(20),
    paddingVertical: scaleContainer(24),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: scaleContainer(18),
  },
  cardTitle: {
    color: '#F8F8FF',
    fontFamily: Fonts.semiBold,
    fontSize: scaleFont(23),
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: scaleContainer(6),
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#8E99B7',
    fontFamily: Fonts.regular,
    fontSize: scaleFont(13),
    textAlign: 'center',
    lineHeight: scaleFont(18.5),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleContainer(6),
    backgroundColor: '#141C30',
    paddingHorizontal: scaleContainer(12),
    paddingVertical: scaleContainer(5),
    borderRadius: scaleContainer(12),
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.10)',
  },
  contactText: {
    color: '#F8F8FF',
    fontFamily: Fonts.medium,
    fontSize: scaleFont(13),
    fontWeight: '500',
    marginRight: scaleContainer(8),
  },
  editLink: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: scaleFont(12.5),
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: scaleContainer(14),
    paddingVertical: scaleContainer(9),
    paddingHorizontal: scaleContainer(12),
    marginBottom: scaleContainer(16),
    gap: scaleContainer(8),
  },
  errorIcon: {
    marginRight: 2,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: Fonts.regular,
    fontSize: scaleFont(12.5),
    flex: 1,
    lineHeight: scaleFont(17),
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: scaleContainer(14),
    paddingVertical: scaleContainer(9),
    paddingHorizontal: scaleContainer(12),
    marginBottom: scaleContainer(16),
    gap: scaleContainer(8),
  },
  successText: {
    color: '#6EE7B7',
    fontFamily: Fonts.regular,
    fontSize: scaleFont(12.5),
    flex: 1,
    lineHeight: scaleFont(17),
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleContainer(8),
    marginVertical: scaleContainer(14),
    width: '100%',
  },
  otpBox: {
    flex: 1,
    maxWidth: scaleHeight(48),
    height: scaleHeight(52),
    borderRadius: scaleContainer(14),
    borderWidth: 1.5,
    borderColor: 'rgba(164, 170, 255, 0.12)',
    backgroundColor: '#141C30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: '#7655F0',
    backgroundColor: '#162038',
    shadowColor: '#7655F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: '#A69BFF',
    backgroundColor: '#162038',
  },
  otpDigit: {
    color: '#FFFFFF',
    fontSize: scaleFont(20),
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleContainer(12),
    marginBottom: scaleContainer(20),
  },
  resendPrefix: {
    color: '#8E99B7',
    fontFamily: Fonts.regular,
    fontSize: scaleFont(12.5),
  },
  timerText: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: scaleFont(12.5),
    fontWeight: '500',
  },
  resendActiveText: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: scaleFont(12.5),
    fontWeight: '500',
  },
  verifyButtonWrapper: {
    borderRadius: scaleContainer(16),
    overflow: 'hidden',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(211, 204, 255, 0.45)',
    shadowColor: '#7757FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  verifyButtonDisabled: {
    opacity: 0.55,
    borderColor: 'transparent',
    shadowOpacity: 0.1,
  },
  verifyGradient: {
    height: scaleHeight(48),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleContainer(16),
  },
  verifyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: scaleFont(15),
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleContainer(18),
    paddingTop: scaleContainer(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(164, 170, 255, 0.06)',
  },
  securityText: {
    color: '#717FA0',
    fontFamily: Fonts.regular,
    fontSize: scaleFont(11),
    letterSpacing: 0.2,
  },
});
