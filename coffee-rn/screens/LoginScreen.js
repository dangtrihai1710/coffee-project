
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import ApiService from '../services/ApiService';
import COLORS from '../styles/colors';

const LoginScreen = ({ onLoginSuccess, onRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Kiểm tra nếu đã đăng nhập trước đó và khởi tạo API
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        // Khởi tạo API trước
        await ApiService.initialize();
        
        // Kiểm tra trạng thái đăng nhập
        const isLoggedIn = await AuthService.initialize();
        if (isLoggedIn) {
          onLoginSuccess();
        }
      } catch (error) {
        console.error('Lỗi khởi tạo ứng dụng:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    init();
  }, []);

  // Xóa dữ liệu và đăng nhập demo
  const handleClearAndLogin = async () => {
    setIsLoading(true);
    
    try {
      // Xóa toàn bộ dữ liệu trước khi đăng nhập
      await AuthService.clearAllData();
      
      // Đăng nhập với tài khoản demo
      await AuthService.loginOffline('demo@example.com');
      
      onLoginSuccess();
    } catch (error) {
      console.error('Lỗi khi xóa dữ liệu và đăng nhập:', error);
      Alert.alert('Lỗi', 'Không thể đăng nhập. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Lỗi', 'Email không đúng định dạng.');
      return;
    }
    
    // Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Thử đăng nhập bình thường
      try {
        await AuthService.login(email, password);
        onLoginSuccess();
      } catch (error) {
        // Nếu lỗi kết nối/server nhưng là tài khoản demo
        if (email === 'demo@example.com' && password === 'password' && 
            (error.message.includes('Network') || error.message.includes('timeout'))) {
          // Thử đăng nhập offline với tài khoản demo
          await AuthService.loginOffline(email);
          onLoginSuccess();
          return;
        }
        
        // Nếu là lỗi chung
        if (error.message.includes('Email hoặc mật khẩu không đúng')) {
          Alert.alert('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      Alert.alert('Đăng nhập thất bại', error.message || 'Không thể đăng nhập. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo đăng nhập nhanh để trải nghiệm ứng dụng
  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    try {
      await AuthService.login('demo@example.com', 'password');
      onLoginSuccess();
    } catch (error) {
      console.error('Lỗi đăng nhập demo:', error);
      
      // Thử đăng nhập offline nếu có lỗi kết nối
      if (error.message.includes('Network') || error.message.includes('timeout')) {
        try {
          await AuthService.loginOffline('demo@example.com');
          onLoginSuccess();
          return;
        } catch (offlineError) {
          Alert.alert('Lỗi', 'Không thể đăng nhập với tài khoản demo.');
        }
      } else {
        Alert.alert('Lỗi', 'Không thể đăng nhập với tài khoản demo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị loading khi đang khởi tạo
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang khởi tạo ứng dụng...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <FontAwesome5 name="leaf" size={60} color={COLORS.primary} />
          <Text style={styles.appTitle}>Coffee Care</Text>
          <Text style={styles.appSubtitle}>Chẩn đoán bệnh cây cà phê</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.loginTitle}>Đăng nhập</Text>
          
          <View style={styles.inputContainer}>
            <FontAwesome5 name="envelope" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <FontAwesome5 name="lock" size={18} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <FontAwesome5
                name={showPassword ? 'eye-slash' : 'eye'}
                size={18}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.forgotPasswordLink} onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <FontAwesome5 name="sign-in-alt" size={16} color={COLORS.white} />
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>hoặc</Text>
            <View style={styles.orLine} />
          </View>
          
          <TouchableOpacity 
            style={styles.demoButton} 
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <FontAwesome5 name="user-check" size={16} color={COLORS.primary} />
            <Text style={styles.demoButtonText}>Đăng nhập với tài khoản demo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.helpButton} 
            onPress={handleClearAndLogin}
          >
            <FontAwesome5 name="tools" size={16} color={COLORS.primary} />
            <Text style={styles.helpButtonText}>Xóa dữ liệu và đăng nhập Demo</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={onRegister}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.primary,
    fontSize: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: COLORS.grayLight,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordToggle: {
    padding: 10,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    marginHorizontal: 10,
    color: COLORS.textSecondary,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    marginBottom: 10,
  },
  demoButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  helpButton: {
    borderWidth: 1,
    borderColor: COLORS.info,
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.infoLight,
  },
  helpButtonText: {
    color: COLORS.info,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;