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
import { User, Mail, AlertCircle } from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { sendOTP, googleLogin } from '../../api/auth';
import { BrandColors, Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';

export default function SignupScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = email.trim().length > 3 && email.includes('@') && email.includes('.');
  const isValidName = fullName.trim().length >= 2;
  const isFormValid = isValidEmail && isValidName;

  const handleSignUp = async () => {
    if (!isFormValid || loading) return;

    setError('');
    setLoading(true);

    try {
      await sendOTP(email, 'signup');
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          contact: email.trim().toLowerCase(),
          method: 'email',
          authType: 'signup',
          fullName: fullName.trim(),
        },
      });
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('log in')
      ) {
        setError('Account already exists with this email. Please log in.');
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

  const handleGoogleSignupPress = async () => {
    if (googleLoading) return;
    setError('');
    setGoogleLoading(true);

    try {
      await googleLogin('signup');
    } catch (err: any) {
      setError(err?.message || 'Google sign-up could not be initiated.');
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

          {/* Create Account Card matching exact reference design */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {/* Header: Title & Subtitle */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Create Account</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Start your free account today
              </Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#F87171" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Continue with Google Button */}
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
              onPress={handleGoogleSignupPress}
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

            {/* Input: Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={15} color="#A855F7" strokeWidth={2} />
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                placeholder="Sarah Jenkins"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="words"
                autoCorrect={false}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (error) setError('');
                }}
                accessibilityLabel="Full Name input"
              />
            </View>

            {/* Input: Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Mail size={15} color="#A855F7" strokeWidth={2} />
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
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
                onSubmitEditing={handleSignUp}
                returnKeyType="go"
                accessibilityLabel="Email input"
              />
            </View>

            {/* Submit Button: Sign Up Free */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonLoading,
              ]}
              disabled={loading}
              activeOpacity={0.85}
              onPress={handleSignUp}
              accessibilityRole="button"
              accessibilityLabel="Sign Up Free"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Sign Up Free</Text>
              )}
            </TouchableOpacity>

            {/* Footer: Already have an account? Login */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={[styles.loginLink, { color: colors.primary }]}>Login</Text>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
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
    fontSize: 26,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    height: 52,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginLeft: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#1D1D21',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    height: 52,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  submitButton: {
    backgroundColor: '#814AC8',
    borderRadius: 9999,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#814AC8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  submitButtonLoading: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  loginLink: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
});
