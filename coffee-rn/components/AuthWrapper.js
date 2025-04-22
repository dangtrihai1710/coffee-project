// components/AuthWrapper.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
      const isLoggedIn = await AuthService.initialize();
      setIsAuthenticated(isLoggedIn);
    } catch (error) {
      console.error('Lỗi kiểm tra trạng thái đăng nhập:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('login');
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