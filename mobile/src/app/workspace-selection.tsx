import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OrbionLogo } from '@/components/common/OrbionLogo';

export default function WorkspaceSelectionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <OrbionLogo size="sm" showText={false} />
        <Text style={styles.title}>Select Workspace</Text>
        <Text style={styles.subtitle}>Choose the workspace you want to access.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 18,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 6,
  },
});
