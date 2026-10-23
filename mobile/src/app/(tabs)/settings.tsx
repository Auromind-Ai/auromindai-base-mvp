import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Settings & Profile</Text>
        <Text style={styles.subtitle}>Coming up in next step...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080C' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#71717A', fontSize: 14, marginTop: 6 },
});
