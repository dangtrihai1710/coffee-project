// App.js
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AuthWrapper from './components/AuthWrapper';
import ApiService from './services/ApiService';

export default function App() {
  // Khởi tạo ApiService khi app khởi động
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
      <AuthWrapper />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff'
  },
});