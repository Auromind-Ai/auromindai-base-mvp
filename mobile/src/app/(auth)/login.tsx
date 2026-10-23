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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Mail, ChevronDown } from 'lucide-react-native';
import { OrbionLogo } from '@/components/common/OrbionLogo';
import { BrandColors } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    const contactValue = loginMethod === 'phone' ? `+91 ${phoneNumber}` : email;
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { contact: contactValue, method: loginMethod },
    });
  };

  const isFormValid =
    loginMethod === 'phone'
      ? phoneNumber.trim().length >= 10
      : email.trim().includes('@');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding */}
          <View style={styles.header}>
            <OrbionLogo size="sm" showText={true} />
            <Text style={styles.title}>Login to your account</Text>
            <Text style={styles.subtitle}>
              Access your workspace and manage your customer conversations.
            </Text>
          </View>

          {/* Social Logins */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Login */}
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.googleIconBadge}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Email Login Alternative */}
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.8}
              onPress={() => setLoginMethod(loginMethod === 'phone' ? 'email' : 'phone')}
              accessibilityRole="button"
            >
              <Mail size={18} color="#A1A1AA" style={styles.buttonIcon} />
              <Text style={styles.socialButtonText}>
                {loginMethod === 'phone' ? 'Continue with Email' : 'Continue with Phone'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* "or" Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {loginMethod === 'phone' ? 'Phone Number Login' : 'Email Address Login'}
            </Text>

            {loginMethod === 'phone' ? (
              <View style={styles.phoneInputContainer}>
                {/* Country Code Pill */}
                <View style={styles.countryPicker}>
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                  <ChevronDown size={14} color="#71717A" style={{ marginLeft: 4 }} />
                </View>
                <View style={styles.inputSeparator} />

                {/* Phone Input */}
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter your number"
                  placeholderTextColor="#71717A"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  accessibilityLabel="Phone number input"
                />
              </View>
            ) : (
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter your work email"
                  placeholderTextColor="#71717A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Email input"
                />
              </View>
            )}

            {/* Primary Continue Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !isFormValid && styles.primaryButtonDisabled,
              ]}
              disabled={!isFormValid}
              activeOpacity={0.85}
              onPress={handleContinue}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 260,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 50,
    borderRadius: 14,
  },
  googleIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#EA4335',
    fontWeight: '800',
    fontSize: 13,
  },
  buttonIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#71717A',
    fontSize: 12,
    marginHorizontal: 14,
    textTransform: 'lowercase',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  countryCode: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputSeparator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  emailInputContainer: {
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
    justifyContent: 'center',
  },
  emailInput: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    color: '#71717A',
    fontSize: 13,
  },
  signUpLink: {
    color: BrandColors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
