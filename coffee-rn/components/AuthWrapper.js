
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CaptureCamera from './CaptureCamera';

// Services
import AuthService from '../services/AuthService';
import COLORS from '../styles/colors';

const AuthWrapper = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Lấy storage keys từ AuthService
      const STORAGE_KEYS = AuthService.storageKeys || {
        AUTH_TOKEN: 'authToken',
        USER_DATA: 'userData',
      };
      
      // Kiểm tra trạng thái từ AsyncStorage trước
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (token && userData) {
        // Parse userData và cập nhật cho AuthService
        const user = JSON.parse(userData);
        AuthService.isAuthenticated = true;
        AuthService.currentUser = user;
        setIsAuthenticated(true);
      } else {
        // Thử phương thức initialize của AuthService
        const isLoggedIn = await AuthService.initialize();
        setIsAuthenticated(isLoggedIn);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đăng nhập:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    console.log('Đăng nhập thành công, cập nhật trạng thái đăng nhập');
    setIsAuthenticated(true);
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    setCurrentScreen('register');
  };

  const navigateToForgotPassword = () => {
    setCurrentScreen('forgotPassword');
  };

  const navigateToLogin = () => {
    setCurrentScreen('login');
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  if (isAuthenticated) {
    return <CaptureCamera onLogout={handleLogout} />;
  }

  // Hiển thị màn hình không yêu cầu xác thực
  switch (currentScreen) {
    case 'register':
      return (
        <RegisterScreen 
          onRegisterSuccess={handleLoginSuccess} 
          onBack={navigateToLogin} 
        />
      );
    case 'forgotPassword':
      return (
        <ForgotPasswordScreen onBack={navigateToLogin} />
      );
    case 'login':
    default:
      return (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onRegister={navigateToRegister}
          onForgotPassword={navigateToForgotPassword}
        />
      );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
});

export default AuthWrapper;