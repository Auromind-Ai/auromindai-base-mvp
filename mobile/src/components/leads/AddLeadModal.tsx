import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  User,
  Phone,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';
import { useAuth } from '../../store/auth';
import { createManualLead, ManualLeadResponse } from '../../api/leads';

export type LeadSource = 'whatsapp' | 'instagram' | 'twilio' | 'manual';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (lead: ManualLeadResponse) => void;
}

const SOURCES: { id: LeadSource; label: string; color: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'twilio', label: 'Twilio', color: '#F22F46' },
  { id: 'manual', label: 'Manual', color: '#8B5CF6' },
];

export function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const { isDark } = useAppTheme();
  const authState = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('manual');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPhone('');
    setSource('manual');
    setBudgetMin('');
    setBudgetMax('');
    setNote('');
    setError('');
    setFocusedField(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const workspaceId =
      authState.selectedWorkspace?.id || authState.workspaces[0]?.id;

    if (!workspaceId) {
      setError('Please select a workspace before adding a lead.');
      return;
    }

    // 1. Name validation (required, min 2 chars)
    if (!name || name.trim().length < 2) {
      setError('Name is required and must be at least 2 characters.');
      return;
    }

    // 2. Phone validation (Indian mobile or general standard phone format)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(?:\+?\d{1,3})?[6-9]\d{9}$/;
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Phone is required and must be at least 10 digits.');
      return;
    }
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid mobile number (e.g. +91 9876543210 or 10 digits starting with 6-9).');
      return;
    }

    // 3. Budget validation
    const minVal = budgetMin.trim() === '' ? null : parseFloat(budgetMin.trim());
    const maxVal = budgetMax.trim() === '' ? null : parseFloat(budgetMax.trim());

    if (minVal !== null && (isNaN(minVal) || minVal < 0)) {
      setError('Min budget must be a positive number.');
      return;
    }
    if (maxVal !== null && (isNaN(maxVal) || maxVal < 0)) {
      setError('Max budget must be a positive number.');
      return;
    }
    if (minVal !== null && maxVal !== null && maxVal <= minVal) {
      setError('Max budget must be greater than min budget.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await createManualLead(workspaceId, {
        name: name.trim(),
        phone: cleanPhone,
        source,
        status: 'new',
        budget_min: minVal,
        budget_max: maxVal,
        note: note.trim() || null,
      });

      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.data?.detail ||
        'Failed to add lead. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware color palette
  const modalBg = isDark ? '#161424' : '#FFFFFF';
  const modalBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : '#E5E7EB';
  const inputBg = isDark ? '#0F0D1A' : '#F9FAFB';
  const inputBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB';
  const inputBorderActive = isDark ? '#8B5CF6' : '#7C3AED';
  const textPrimary = isDark ? '#F8F8FF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#4B5563';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const closeButtonBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: modalBg,
                  borderColor: modalBorder,
                  shadowColor: isDark ? '#000000' : '#7C3AED',
                  shadowOpacity: isDark ? 0.55 : 0.12,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={[styles.headerTitle, { color: textPrimary }]}>
                    Add New Lead
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                    Create and qualify a customer lead
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.closeButton, { backgroundColor: closeButtonBg }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={18} color={textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Scrollable Form Body */}
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Error Banner */}
                {error ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={16} color="#F87171" style={styles.errorIcon} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Name Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: inputBg,
                        borderColor:
                          focusedField === 'name' ? inputBorderActive : inputBorder,
                      },
                    ]}
                  >
                    <User
                      size={18}
                      color={focusedField === 'name' ? inputBorderActive : placeholderColor}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: textPrimary }]}
                      placeholder="Rahul Sharma"
                      placeholderTextColor={placeholderColor}
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (error) setError('');
                      }}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Phone Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Phone <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: inputBg,
                        borderColor:
                          focusedField === 'phone' ? inputBorderActive : inputBorder,
                      },
                    ]}
                  >
                    <Phone
                      size={18}
                      color={focusedField === 'phone' ? inputBorderActive : placeholderColor}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: textPrimary }]}
                      placeholder="+91 98765 43210"
                      placeholderTextColor={placeholderColor}
                      value={phone}
                      onChangeText={(val) => {
                        setPhone(val);
                        if (error) setError('');
                      }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Source Selection Chips */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Source
                  </Text>
                  <View style={styles.sourcesGrid}>
                    {SOURCES.map((item) => {
                      const isSelected = source === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.sourceChip,
                            {
                              backgroundColor: isSelected
                                ? isDark
                                  ? `${item.color}25`
                                  : `${item.color}15`
                                : inputBg,
                              borderColor: isSelected
                                ? item.color
                                : inputBorder,
                            },
                          ]}
                          activeOpacity={0.75}
                          onPress={() => setSource(item.id)}
                        >
                          <View
                            style={[
                              styles.sourceDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.sourceLabel,
                              {
                                color: isSelected
                                  ? isDark
                                    ? '#FFFFFF'
                                    : item.color
                                  : textSecondary,
                                fontFamily: isSelected
                                  ? Fonts.semiBold
                                  : Fonts.medium,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Budget (Min / Max) */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Budget <Text style={styles.optionalText}>(optional)</Text>
                  </Text>
                  <View style={styles.budgetRow}>
                    <View
                      style={[
                        styles.budgetInputContainer,
                        {
                          backgroundColor: inputBg,
                          borderColor:
                            focusedField === 'budgetMin'
                              ? inputBorderActive
                              : inputBorder,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: textPrimary }]}
                        placeholder="Min (₹)"
                        placeholderTextColor={placeholderColor}
                        value={budgetMin}
                        onChangeText={(val) => {
                          setBudgetMin(val);
                          if (error) setError('');
                        }}
                        onFocus={() => setFocusedField('budgetMin')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numeric"
                      />
                    </View>

                    <Text style={[styles.budgetDivider, { color: textSecondary }]}>
                      —
                    </Text>

                    <View
                      style={[
                        styles.budgetInputContainer,
                        {
                          backgroundColor: inputBg,
                          borderColor:
                            focusedField === 'budgetMax'
                              ? inputBorderActive
                              : inputBorder,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: textPrimary }]}
                        placeholder="Max (₹)"
                        placeholderTextColor={placeholderColor}
                        value={budgetMax}
                        onChangeText={(val) => {
                          setBudgetMax(val);
                          if (error) setError('');
                        }}
                        onFocus={() => setFocusedField('budgetMax')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* Note Field */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Note <Text style={styles.optionalText}>(optional)</Text>
                  </Text>
                  <View
                    style={[
                      styles.textAreaContainer,
                      {
                        backgroundColor: inputBg,
                        borderColor:
                          focusedField === 'note' ? inputBorderActive : inputBorder,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.textAreaInput, { color: textPrimary }]}
                      placeholder="Add requirements or conversation notes..."
                      placeholderTextColor={placeholderColor}
                      value={note}
                      onChangeText={(val) => {
                        setNote(val);
                        if (error) setError('');
                      }}
                      onFocus={() => setFocusedField('note')}
                      onBlur={() => setFocusedField(null)}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.cancelButton,
                    {
                      borderColor: inputBorder,
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.cancelButtonText, { color: textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  style={styles.submitButtonWrapper}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#8A3FFC', '#6E2FE4']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.submitGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Add Lead</Text>
                        <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
    lineHeight: 17,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    maxHeight: 400,
  },
  formScrollContent: {
    paddingBottom: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorIcon: {
    marginRight: 2,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: Fonts.regular,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 13,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  requiredStar: {
    color: '#EF4444',
  },
  optionalText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  sourceLabel: {
    fontSize: 12.5,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetInputContainer: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  budgetDivider: {
    fontSize: 14,
    fontWeight: '600',
  },
  textAreaContainer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 72,
  },
  textAreaInput: {
    fontFamily: Fonts.regular,
    fontSize: 13.5,
    minHeight: 56,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
  },
  cancelButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
  },
  submitButtonWrapper: {
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#8A3FFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    height: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});
