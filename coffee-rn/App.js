// App.js
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import CaptureCamera from './CaptureCamera';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <CaptureCamera />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
