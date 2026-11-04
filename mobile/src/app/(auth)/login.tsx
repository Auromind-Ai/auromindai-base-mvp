import React, { useState, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  AlertCircle,
  Mail,
  ArrowRight,
  ShieldCheck,
  X,
  Globe,
} from 'lucide-react-native';
import { OrbionLogo } from '../../components/common/OrbionLogo';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { sendOTP, googleLogin } from '../../api/auth';
import { Fonts } from '../../theme/tokens';

const WEB_SIGNUP_URL =
  process.env.EXPO_PUBLIC_WEB_URL
    ? `${process.env.EXPO_PUBLIC_WEB_URL.replace(/\/$/, '')}/signup`
    : 'https://orbionagents.com/signup';

export default function LoginScreen() {
  const router = useRouter();
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenWebSignup = async () => {
    try {
      await WebBrowser.openBrowserAsync(WEB_SIGNUP_URL);
    } catch {
      await Linking.openURL(WEB_SIGNUP_URL);
    }
  };

  const isValidEmail =
    email.trim().length > 3 && email.includes('@') && email.includes('.');

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
        setError('Account not found. New users must sign up on the web platform.');
      } else if (msg.toLowerCase().includes('deactivat')) {
        setError('Your account is deactivated. Please contact support.');
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

      {/* 2. ATMOSPHERIC AMBIENT GLOW (POINTER EVENTS NONE FOR TOUCH PASS-THROUGH) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient
              id="seamlessAtmosphere"
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
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#seamlessAtmosphere)" />
        </Svg>
      </View>

      {/* 3. CONTENT AREA */}
      <SafeAreaView style={styles.safeArea}>
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
            {/* Header Branding (Omnichannel badge removed as requested) */}
            <View style={styles.brandingBox}>
              <OrbionLogo size="sm" showText={true} textColor="#FFFFFF" />
            </View>

            {/* Inbox Card (#202941) */}
            <View style={styles.inboxCard}>
              {/* Title & Subtitle */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSubtitle}>
                  Sign in to manage your AI agents and omnichannel inbox
                </Text>
              </View>

              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={15} color="#F87171" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Google OAuth Button */}
              <TouchableOpacity
                style={styles.googleButton}
                activeOpacity={0.85}
                onPress={handleGoogleLoginPress}
                disabled={googleLoading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <GoogleIcon size={19} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email Input Field (Enhanced Touch Response) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WORK EMAIL</Text>
                <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                  <View
                    style={[
                      styles.inputContainer,
                      isFocused && styles.inputContainerFocused,
                    ]}
                  >
                    <Mail
                      size={18}
                      color={isFocused ? '#A69BFF' : '#7E8BA8'}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      ref={inputRef}
                      style={styles.emailInput}
                      placeholder="your@gmail.com"
                      placeholderTextColor="#647294"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      editable={!loading}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError('');
                      }}
                      onSubmitEditing={handleSendOtp}
                      returnKeyType="go"
                      accessibilityLabel="Work Email input"
                    />
                    {email.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setEmail('')}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <X size={15} color="#8E99B7" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!isValidEmail || loading}
                onPress={handleSendOtp}
                style={[
                  styles.submitButtonWrapper,
                  (!isValidEmail || loading) && styles.submitButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Log In Free"
              >
                <LinearGradient
                  colors={
                    !isValidEmail || loading
                      ? ['#353A5A', '#272B45']
                      : ['#A69BFF', '#7655F0', '#6241DD']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.submitContent}>
                      <Text style={styles.submitButtonText}>Log In Free</Text>
                      <ArrowRight size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Web Registration Action */}
              <View style={styles.webNoticeRow}>
                <Text style={styles.webNoticeText}>Don't have an account? </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleOpenWebSignup}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="link"
                  accessibilityLabel="Sign Up on the web"
                >
                  <Text style={styles.signUpVioletText}>Sign Up</Text>
                </TouchableOpacity>
                <Text style={styles.webNoticeText}> on the web</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 28,
    flexGrow: 1,
    justifyContent: 'center',
  },

  /* BRANDING */
  brandingBox: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 20,
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
    paddingHorizontal: 8,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161F33',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.12)',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: '#F8F8FF',
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(164, 170, 255, 0.08)',
  },
  dividerText: {
    color: '#6B7A9E',
    fontFamily: Fonts.medium,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    color: '#8E99B7',
    fontFamily: Fonts.medium,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C30',
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
  },
  inputContainerFocused: {
    borderColor: '#7655F0',
    backgroundColor: '#162038',
    shadowColor: '#7655F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  emailInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  submitButtonWrapper: {
    borderRadius: 16,
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
  submitButtonDisabled: {
    opacity: 0.55,
    borderColor: 'transparent',
    shadowOpacity: 0.1,
  },
  submitGradient: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
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
  webNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  webNoticeText: {
    color: '#8E99B7',
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  signUpVioletText: {
    color: '#A69BFF',
    fontFamily: Fonts.medium,
    fontSize: 13,
    fontWeight: '500',
  },
});
