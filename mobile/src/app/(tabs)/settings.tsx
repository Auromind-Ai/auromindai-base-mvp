import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Settings & Profile</Text>
        <Text style={styles.subtitle}>Auromind AI Omni-Inbox Settings</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 20, fontFamily: Fonts.bold },
  subtitle: { color: '#71717A', fontSize: 14, fontFamily: Fonts.regular, marginTop: 6 },
});
