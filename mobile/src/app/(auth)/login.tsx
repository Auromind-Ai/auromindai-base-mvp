import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { sendOTP, googleLogin } from '../../api/auth';
import { BrandColors, Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = email.trim().length > 3 && email.includes('@') && email.includes('.');

  const handleSendOtp = async () => {
    if (!isValidEmail || loading) return;

    setError('');
    setLoading(true);

    try {
      await sendOTP(email, 'login');
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { contact: email.trim().toLowerCase(), method: 'email' },
      });
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (
        msg.toLowerCase().includes('not registered') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('sign up first')
      ) {
        setError('Your email is not registered. Please sign up first.');
      } else if (msg.toLowerCase().includes('deactivat')) {
        setError('Your account is deactivated due to some reason. Please contact support.');
      } else if (msg.toLowerCase().includes('too many') || err?.status === 429) {
        setError('Too many requests. Please wait a few moments and try again.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        setError('Unable to reach server. Please check your network connection.');
      } else {
        setError(msg || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginPress = async () => {
    if (googleLoading) return;
    setError('');
    setGoogleLoading(true);

    try {
      await googleLogin();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in could not be initiated.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding Logo */}
          <View style={styles.brandingHeader}>
            <OrbionLogo size="sm" showText={true} />
          </View>

          {/* Form Card matching exact web application login box */}
          <View
            style={[
              styles.loginCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {/* Card Titles */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome Back</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Log in to your account to continue
              </Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#F87171" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: isDark ? '#FFFFFF' : colors.cardElevated,
                  borderColor: colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.88}
              onPress={handleGoogleLoginPress}
              disabled={googleLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <GoogleIcon size={20} />
                  <Text style={[styles.googleButtonText, { color: isDark ? '#111827' : colors.textPrimary }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider: OR CONTINUE WITH EMAIL */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with email</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            </View>

            {/* Manual Email Input Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[
                  styles.emailInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                placeholder="your@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onSubmitEditing={handleSendOtp}
                returnKeyType="go"
                accessibilityLabel="Email input"
              />
            </View>

            {/* Primary Submit Button: Log In Free */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isValidEmail || loading) && styles.submitButtonDisabled,
              ]}
              disabled={!isValidEmail || loading}
              activeOpacity={0.85}
              onPress={handleSendOtp}
              accessibilityRole="button"
              accessibilityLabel="Log In Free"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Log In Free</Text>
              )}
            </TouchableOpacity>

            {/* Footer Sign Up Link */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  router.push('/(auth)/signup');
                }}
              >
                <Text style={[styles.signUpLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#08080C',
    position: 'relative',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loginCard: {
    backgroundColor: '#121217',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
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
  },
  errorIcon: {
    marginRight: 4,
  },
  errorText: {
    color: '#F87171',
    fontFamily: Fonts.regular,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 9999,
    paddingHorizontal: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  googleButtonText: {
    color: '#111827',
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#6B7280',
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontFamily: Fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#1D1D21',
    fontFamily: Fonts.regular,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: BrandColors.primary,
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    color: '#9CA3AF',
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  signUpLink: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 13,
    fontWeight: '700',
  },
});
