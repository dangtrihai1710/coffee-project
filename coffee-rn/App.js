import { SafeAreaProvider } from 'react-native-safe-area-context';

// App.js
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthWrapper from './components/AuthWrapper';
import ApiService from './services/ApiService';
import AuthService from './services/AuthService';
import SessionStorageService from './services/SessionStorageService';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component'
]);

import { InteractionMemoryService } from './services/InteractionMemoryService';

// Function migration dữ liệu cũ sang session storage
const migrateOldData = async () => {
  try {
    console.log('[MIGRATION] Bắt đầu kiểm tra dữ liệu cũ...');
    
    // Kiểm tra nếu có dữ liệu cũ (không có prefix user)
    const oldScanHistory = await AsyncStorage.getItem('scanHistory');
    const oldConversations = await AsyncStorage.getItem('advisor_conversations');
    const oldUserPreferences = await AsyncStorage.getItem('user_preferences');
    const oldInteractionHistory = await AsyncStorage.getItem('interaction_history');
    const oldRecommendationFeedback = await AsyncStorage.getItem('recommendation_feedback');
    const oldUserContext = await AsyncStorage.getItem('user_context');
    
    // Đếm số item cần migrate
    let itemsToMigrate = 0;
    if (oldScanHistory) itemsToMigrate++;
    if (oldConversations) itemsToMigrate++;
    if (oldUserPreferences) itemsToMigrate++;
    if (oldInteractionHistory) itemsToMigrate++;
    if (oldRecommendationFeedback) itemsToMigrate++;
    if (oldUserContext) itemsToMigrate++;
    
    if (itemsToMigrate > 0) {
      console.log(`[MIGRATION] Phát hiện ${itemsToMigrate} loại dữ liệu cũ, đang migrate...`);
      
      // Lấy thông tin user hiện tại
      const userData = await AuthService.getUserData();
      if (userData && userData.id) {
        console.log(`[MIGRATION] Migrate cho user: ${userData.id} (${userData.email})`);
        
        // 1. Migrate scan history
        if (oldScanHistory) {
          console.log('[MIGRATION] Migrate scan history...');
          const scanHistoryData = JSON.parse(oldScanHistory);
          await SessionStorageService.saveScanHistory(scanHistoryData);
          await AsyncStorage.removeItem('scanHistory');
          console.log(`[MIGRATION] ✓ Đã migrate ${scanHistoryData.length} scan records`);
        }
        
        // 2. Migrate conversations
        if (oldConversations) {
          console.log('[MIGRATION] Migrate conversations...');
          const conversationsData = JSON.parse(oldConversations);
          await SessionStorageService.saveConversations(conversationsData);
          await AsyncStorage.removeItem('advisor_conversations');
          console.log(`[MIGRATION] ✓ Đã migrate ${conversationsData.length} conversations`);
          
          // Migrate conversation messages
          const allKeys = await AsyncStorage.getAllKeys();
          const conversationKeys = allKeys.filter(key => key.startsWith('advisor_conversations_'));
          
          for (const key of conversationKeys) {
            const messages = await AsyncStorage.getItem(key);
            if (messages) {
              const conversationId = key.replace('advisor_conversations_', '');
              const messagesData = JSON.parse(messages);
              await SessionStorageService.saveConversationMessages(conversationId, messagesData);
              await AsyncStorage.removeItem(key);
              console.log(`[MIGRATION] ✓ Đã migrate ${messagesData.length} messages cho conversation ${conversationId}`);
            }
          }
        }
        
        // 3. Migrate user preferences
        if (oldUserPreferences) {
          console.log('[MIGRATION] Migrate user preferences...');
          const preferencesData = JSON.parse(oldUserPreferences);
          await SessionStorageService.saveUserPreferences(preferencesData);
          await AsyncStorage.removeItem('user_preferences');
          console.log('[MIGRATION] ✓ Đã migrate user preferences');
        }
        
        // 4. Migrate interaction history
        if (oldInteractionHistory) {
          console.log('[MIGRATION] Migrate interaction history...');
          const interactionData = JSON.parse(oldInteractionHistory);
          await SessionStorageService.saveInteractionHistory(interactionData);
          await AsyncStorage.removeItem('interaction_history');
          console.log(`[MIGRATION] ✓ Đã migrate ${interactionData.length} interactions`);
        }
        
        // 5. Migrate recommendation feedback
        if (oldRecommendationFeedback) {
          console.log('[MIGRATION] Migrate recommendation feedback...');
          const feedbackData = JSON.parse(oldRecommendationFeedback);
          await SessionStorageService.saveRecommendationFeedback(feedbackData);
          await AsyncStorage.removeItem('recommendation_feedback');
          console.log('[MIGRATION] ✓ Đã migrate recommendation feedback');
        }
        
        // 6. Migrate user context (merge với preferences)
        if (oldUserContext) {
          console.log('[MIGRATION] Migrate user context...');
          const contextData = JSON.parse(oldUserContext);
          const currentPreferences = await SessionStorageService.getUserPreferences();
          const mergedPreferences = { ...currentPreferences, ...contextData };
          await SessionStorageService.saveUserPreferences(mergedPreferences);
          await AsyncStorage.removeItem('user_context');
          console.log('[MIGRATION] ✓ Đã migrate user context');
        }
        
        console.log('[MIGRATION] 🎉 Migration hoàn tất thành công!');
      } else {
        console.log('[MIGRATION] ⚠️ Không có user data, bỏ qua migration');
      }
    } else {
      console.log('[MIGRATION] ✓ Không có dữ liệu cũ cần migrate');
    }
  } catch (error) {
    console.error('[MIGRATION] ❌ Lỗi migration:', error);
    // Không throw error để không ảnh hưởng đến app startup
  }
};

// Function debug tất cả storage keys
const debugAllStorageKeys = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('=== ALL ASYNCSTORAGE KEYS ===');
    console.log('Total keys:', allKeys.length);
    
    // Phân loại keys
    const authKeys = allKeys.filter(key => key.includes('auth') || key.includes('user') || key.includes('token'));
    const userSessionKeys = allKeys.filter(key => key.startsWith('user_'));
    const oldKeys = allKeys.filter(key => 
      !key.startsWith('user_') && 
      !authKeys.includes(key) && 
      (key.includes('scan') || key.includes('conversation') || key.includes('interaction'))
    );
    
    console.log('Auth keys:', authKeys);
    console.log('User session keys:', userSessionKeys);
    console.log('Old format keys:', oldKeys);
    console.log('==============================');
  } catch (error) {
    console.error('Debug storage error:', error);
  }
};

export default function App() {
  // Khởi tạo ứng dụng
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Khởi động Coffee Care App...');
      
      try {
        // 1. Khởi tạo API Service
        console.log('[INIT] Đang khởi tạo API Service...');
        const apiUrl = await ApiService.initialize();
        console.log('[INIT] ✓ API Service đã khởi tạo với URL:', apiUrl);
        
        // 2. Khởi tạo Memory Service
        console.log('[INIT] Đang khởi tạo InteractionMemoryService...');
        const userContext = await InteractionMemoryService.getUserContext();
        console.log('[INIT] ✓ InteractionMemoryService đã khởi tạo');
        
        // 3. Debug storage keys (trong development)
        if (__DEV__) {
          await debugAllStorageKeys();
        }
        
        // 4. Migration dữ liệu cũ (nếu user đã đăng nhập)
        console.log('[INIT] Kiểm tra migration dữ liệu...');
        await migrateOldData();
        
        console.log('✅ App khởi tạo hoàn tất!');
        
      } catch (error) {
        console.error('❌ Lỗi khởi tạo App:', error);
        // App vẫn tiếp tục hoạt động dù có lỗi khởi tạo
      }
    };
    
    initializeApp();
  }, []);

  // Cleanup function khi app unmount (nếu cần)
  useEffect(() => {
    return () => {
      console.log('🔄 App đang cleanup...');
      // Có thể thêm logic cleanup ở đây nếu cần
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <AuthWrapper />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff'
  },
});