// App.js
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import CaptureCamera from './components/CaptureCamera';
import ApiService from './services/ApiService'; // Thêm dòng này

export default function App() {
  // Thêm useEffect để khởi tạo ApiService khi app khởi động
  useEffect(() => {
    const initializeApi = async () => {
      try {
        const apiUrl = await ApiService.initialize();
        console.log('API Service đã khởi tạo với URL:', apiUrl);
      } catch (error) {
        console.error('Lỗi khởi tạo API Service:', error);
      }
    };
    
    initializeApi();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <CaptureCamera />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});