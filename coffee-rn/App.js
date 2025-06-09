// App.js
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AuthWrapper from './components/AuthWrapper';
import ApiService from './services/ApiService';
import { LogBox } from 'react-native';


LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component'
]);


import { InteractionMemoryService } from './services/InteractionMemoryService';

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
    
    // Khởi tạo InteractionMemoryService
    const initializeMemoryService = async () => {
      try {
        // Đảm bảo có ngữ cảnh người dùng mặc định
        const userContext = await InteractionMemoryService.getUserContext();
        console.log('InteractionMemoryService đã khởi tạo', userContext);
      } catch (error) {
        console.error('Lỗi khởi tạo InteractionMemoryService:', error);
      }
    };
    
    initializeApi();
    initializeMemoryService();
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