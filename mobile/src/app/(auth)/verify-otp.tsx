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
  ShieldCheck,
  Mail,
} from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { verifyOTP, sendOTP } from '../../api/auth';
import { authStore } from '../../store/auth';
import { Fonts } from '../../theme/tokens';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
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
      const data = await verifyOTP(displayContact, otp, authType, fullName);

      // Save token and user details into auth store
      if (data?.access_token) {
        authStore.setAuth({
          token: data.access_token,
          user: data.user,
          workspaces: data.workspaces,
        });
      }

      // Navigate directly to Inbox Screen
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
    <View style={styles.screenContainer}>
      <StatusBar style="light" />

      {/* 1. SEAMLESS FULL-SCREEN CONTINUOUS BACKGROUND GRADIENT */}
      <LinearGradient
        colors={[
          '#151C3E',
          '#21255C',
          '#322F74',
          '#1E214E',
          '#111633',
          '#0A1023',
        ]}
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
              <Stop offset="0%" stopColor="#6F5BFF" stopOpacity={0.48} />
              <Stop offset="45%" stopColor="#514BC0" stopOpacity={0.22} />
              <Stop offset="75%" stopColor="#292D66" stopOpacity={0.08} />
              <Stop offset="100%" stopColor="#0A1023" stopOpacity={0} />
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
            style={styles.backButton}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <ArrowLeft size={20} color="#F8F8FF" />
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
              <View style={styles.inboxCard}>
                {/* Title & Subtitle with Integrated Logo */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardLogoWrapper}>
                    <OrbionLogo size="sm" showText={true} textColor="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>Verify Your Email</Text>
                  <Text style={styles.cardSubtitle}>
                    We have sent a 6-digit verification code to
                  </Text>
                  <View style={styles.contactRow}>
                    <Mail size={14} color="#A69BFF" style={{ marginRight: 6 }} />
                    <Text style={styles.contactText}>{displayContact}</Text>
                    <TouchableOpacity
                      onPress={() => router.back()}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.editLink}>Edit</Text>
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
                          isFilled && styles.otpBoxFilled,
                          isCellFocused && styles.otpBoxFocused,
                        ]}
                      >
                        <Text style={styles.otpDigit}>{digit}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>

                {/* Resend Code Row */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendPrefix}>Didn't receive code? </Text>
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#A69BFF" />
                  ) : timer > 0 ? (
                    <Text style={styles.timerText}>
                      Resend in {formatTimer(timer)}
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                      <Text style={styles.resendActiveText}>Resend OTP</Text>
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
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Verify and Continue"
                >
                  <LinearGradient
                    colors={
                      otp.length < OTP_LENGTH || loading
                        ? ['#353A5A', '#272B45']
                        : ['#A69BFF', '#7655F0', '#6241DD']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.verifyGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.verifyContent}>
                        <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                        <ArrowRight size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    flexGrow: 1,
    justifyContent: 'center',
  },

  cardLogoWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },

  /* INBOX CARD (#202941) */
  inboxCard: {
    backgroundColor: '#202941',
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.09)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    color: '#F8F8FF',
    fontFamily: Fonts.semiBold,
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#8E99B7',
    fontFamily: Fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: '#141C30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.10)',
  },
  contactText: {
    color: '#F8F8FF',
    fontFamily: Fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  editLink: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    marginRight: 2,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#6EE7B7',
    fontFamily: Fonts.regular,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 17,
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
    gap: 8,
    marginVertical: 14,
    width: '100%',
  },
  otpBox: {
    flex: 1,
    maxWidth: 48,
    height: 52,
    borderRadius: 14,
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
    fontSize: 20,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  resendPrefix: {
    color: '#8E99B7',
    fontFamily: Fonts.regular,
    fontSize: 12.5,
  },
  timerText: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    fontWeight: '500',
  },
  resendActiveText: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    fontWeight: '500',
  },
  verifyButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  verifyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(164, 170, 255, 0.06)',
  },
  securityText: {
    color: '#717FA0',
    fontFamily: Fonts.regular,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
