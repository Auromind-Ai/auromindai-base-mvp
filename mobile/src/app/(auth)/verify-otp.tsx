import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { verifyOTP, sendOTP } from '../../api/auth';
import { authStore } from '../../store/auth';
import { BrandColors, Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const params = useLocalSearchParams<{ contact?: string; method?: string; authType?: 'login' | 'signup'; fullName?: string }>();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar with Back Arrow */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.cardElevated }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Logo Emblem (icon only, matching reference #3) */}
            <View style={styles.logoWrapper}>
              <OrbionLogo size="sm" showText={false} />
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>Verify Your Email</Text>
            <Text style={[styles.subtitleLead, { color: colors.textSecondary }]}>
              We have sent a 6-digit code to
            </Text>

            {/* Target Contact Display with Edit Link */}
            <View style={styles.contactRow}>
              <Text style={[styles.contactText, { color: colors.textPrimary }]}>{displayContact}</Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#F87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Success Banner */}
            {successMessage ? (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color="#34D399" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Hidden Input Layer for native keyboard handling */}
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
                const isFocused = otp.length === index;
                const isFilled = Boolean(digit);

                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                      },
                      isFocused && [
                        styles.otpBoxFocused,
                        {
                          borderColor: colors.primary,
                          backgroundColor: isDark
                            ? 'rgba(129, 74, 200, 0.15)'
                            : 'rgba(139, 92, 246, 0.1)',
                        },
                      ],
                      isFilled && [styles.otpBoxFilled, { borderColor: colors.primary }],
                    ]}
                  >
                    <Text style={[styles.otpDigit, { color: colors.textPrimary }]}>{digit}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Resend Code Countdown */}
            <View style={styles.resendRow}>
              <Text style={[styles.resendPrefix, { color: colors.textSecondary }]}>
                Didn't receive the code?{' '}
              </Text>
              {resendLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : timer > 0 ? (
                <Text style={[styles.timerText, { color: colors.primary }]}>
                  Resend in {formatTimer(timer)}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={[styles.resendActiveText, { color: colors.primary }]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verify & Continue Action Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (otp.length < OTP_LENGTH || loading) && styles.verifyButtonDisabled,
              ]}
              disabled={otp.length < OTP_LENGTH || loading}
              activeOpacity={0.85}
              onPress={handleVerify}
              accessibilityRole="button"
              accessibilityLabel="Verify and Continue"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080C',
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleLead: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  editLink: {
    color: '#C084FC',
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  successText: {
    color: '#34D399',
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
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
    gap: 10,
    marginVertical: 16,
    width: '100%',
  },
  otpBox: {
    width: 48,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#121217',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(129, 74, 200, 0.15)',
    shadowColor: '#814AC8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: 'rgba(192, 132, 252, 0.6)',
  },
  otpDigit: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 28,
  },
  resendPrefix: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  timerText: {
    color: '#C084FC',
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  resendActiveText: {
    color: '#C084FC',
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  verifyButton: {
    backgroundColor: BrandColors.primary,
    height: 52,
    borderRadius: 9999,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.55,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
