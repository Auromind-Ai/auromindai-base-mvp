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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { OrbionLogo } from '@/components/common/OrbionLogo';
import { BrandColors } from '@/theme/tokens';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contact?: string; method?: string }>();
  const displayContact = params.contact || '+91 98765 43210';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Countdown timer for Resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(30);
    setOtp('');
    // Trigger resend API
  };

  const handleVerify = () => {
    if (otp.length < OTP_LENGTH) return;
    // On success, navigate to Screen 4: Workspace Selection
    router.push('/workspace-selection');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Bar with Back Arrow */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Logo Emblem */}
            <View style={styles.logoWrapper}>
              <OrbionLogo size="sm" showText={false} />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitleLead}>We have sent a 6-digit code to</Text>

            {/* Target Contact Display with Edit Link */}
            <View style={styles.contactRow}>
              <Text style={styles.contactText}>{displayContact}</Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Hidden Input Layer for native keyboard handling */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                if (cleaned.length <= OTP_LENGTH) {
                  setOtp(cleaned);
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
                      isFocused && styles.otpBoxFocused,
                      isFilled && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Resend Code Countdown */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrefix}>Didn't receive the code? </Text>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend in {formatTimer(timer)}</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendActiveText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verify & Continue Action Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                otp.length < OTP_LENGTH && styles.verifyButtonDisabled,
              ]}
              disabled={otp.length < OTP_LENGTH}
              activeOpacity={0.85}
              onPress={handleVerify}
              accessibilityRole="button"
            >
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
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
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitleLead: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  editLink: {
    color: BrandColors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 28,
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#121217',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: BrandColors.primaryLight,
    backgroundColor: '#161622',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: 'rgba(129, 74, 200, 0.45)',
    backgroundColor: '#14141E',
  },
  otpDigit: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  resendPrefix: {
    color: '#71717A',
    fontSize: 13,
  },
  timerText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  resendActiveText: {
    color: BrandColors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: BrandColors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
