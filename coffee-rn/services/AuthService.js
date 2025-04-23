// services/AuthService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

// Các key lưu trữ dữ liệu xác thực
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
};

class AuthService {
  static isAuthenticated = false;
  static currentUser = null;
  
  // Khởi tạo kiểm tra trạng thái đăng nhập
  static async initialize() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (token && userData) {
        this.isAuthenticated = true;
        this.currentUser = JSON.parse(userData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Lỗi khi khởi tạo AuthService:', error);
      return false;
    }
  }
  
  // Export STORAGE_KEYS để có thể sử dụng trong các file khác
  static get storageKeys() {
    return STORAGE_KEYS;
  }

  static async register(data) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      // Chuyển qua offline mode nếu không có kết nối API hoặc server không hỗ trợ auth
      if (!ApiService.apiUrl || !ApiService.isInitialized || !ApiService.hasAuthEndpoints) {
        console.log('Sử dụng chế độ đăng ký offline do không có kết nối API hoặc server không hỗ trợ auth');
        return await this.registerOffline(data);
      }
      
      // Thử gọi API đăng ký
      try {
        const result = await ApiService.postJson('/auth/register', data);
        
        // Lưu thông tin đăng nhập
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        
        this.isAuthenticated = true;
        this.currentUser = result.user;
        
        return result;
      } catch (error) {
        console.error('Lỗi khi gọi API đăng ký:', error);
        
        // Nếu lỗi liên quan đến kết nối/timeout, chuyển sang offline mode
        if (error.message && (
          error.message.includes('kết nối') || 
          error.message.includes('không hỗ trợ') ||
          error.message.includes('không thể') ||
          error.message.includes('Network') ||
          error.message.includes('timeout') ||
          error.message.includes('abort')
        )) {
          return await this.registerOffline(data);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    }
  }
  
  static async registerOffline(data) {
    console.log('Đăng ký offline với dữ liệu:', data);
    const mockUser = {
      id: 'offline_' + Date.now().toString(),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      createdAt: new Date().toISOString(),
    };
    
    try {
      // Lưu vào AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mockUser));
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'offline_token_' + mockUser.id);
      
      this.isAuthenticated = true;
      this.currentUser = mockUser;
      
      return {
        success: true,
        user: mockUser,
        token: 'offline_token_' + mockUser.id
      };
    } catch (storageError) {
      console.error('Lỗi lưu dữ liệu đăng ký offline:', storageError);
      throw new Error('Không thể lưu thông tin đăng ký. Vui lòng thử lại.');
    }
  }

  static async login(email, password) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      // Chuyển qua offline mode nếu không có kết nối API hoặc server không hỗ trợ auth
      if (!ApiService.apiUrl || !ApiService.isInitialized || !ApiService.hasAuthEndpoints) {
        console.log('Sử dụng chế độ đăng nhập offline do không có kết nối API hoặc server không hỗ trợ auth');
        
        // Trong môi trường demo, kiểm tra với dữ liệu cố định
        if (email === 'demo@example.com' && password === 'password') {
          return this.loginOffline(email);
        } else {
          throw new Error('Email hoặc mật khẩu không đúng');
        }
      }
      
      try {
        // Gọi API đăng nhập
        const result = await ApiService.postJson('/auth/login', { email, password });
        
        // Lưu thông tin đăng nhập
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        
        this.isAuthenticated = true;
        this.currentUser = result.user;
        
        return result;
      } catch (error) {
        console.error('Lỗi API đăng nhập:', error);
        
        // Nếu đây là lỗi kết nối nhưng email và password là demo, vẫn cho đăng nhập thành công
        if (email === 'demo@example.com' && password === 'password') {
          return this.loginOffline(email);
        }
        
        // Kiểm tra nếu là lỗi mạng, chuyển sang chế độ offline
        if (error.message && (
          error.message.includes('Network request failed') ||
          error.message.includes('timeout') ||
          error.message.includes('abort') ||
          error.message.includes('định dạng không hợp lệ') ||
          error.message.includes('không hỗ trợ')
        )) {
          console.log('Chuyển sang chế độ đăng nhập offline do lỗi kết nối');
          // Chuyển sang chế độ demo nếu là tài khoản demo
          if (email === 'demo@example.com' && password === 'password') {
            return this.loginOffline(email);
          }
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw error;
    }
  }
  
  // Thêm phương thức đăng nhập offline
  static async loginOffline(email) {
    const mockUser = {
      id: 'offline_12345',
      fullName: 'Người Dùng Demo',
      email: email,
      phone: '0123456789',
      createdAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mockUser));
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'offline_token_12345');
    
    this.isAuthenticated = true;
    this.currentUser = mockUser;
    
    return {
      success: true,
      token: 'offline_token_12345',
      user: mockUser,
    };
  }
  
  // Đăng xuất
  static async logout() {
    try {
      // Xóa dữ liệu lưu trữ
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      
      this.isAuthenticated = false;
      this.currentUser = null;
      
      return true;
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      return false;
    }
  }
  
  // Lấy token hiện tại
  static async getToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Lỗi lấy token:', error);
      return null;
    }
  }
  
  // Lấy thông tin người dùng
  static async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Lỗi lấy thông tin người dùng:', error);
      return null;
    }
  }
  
  // Cập nhật thông tin người dùng
  static async updateUserData(userData) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      const token = await this.getToken();
      
      if (!token) {
        throw new Error('Chưa đăng nhập');
      }
      
      // Trong trường hợp offline hoặc không có API hoặc server không hỗ trợ auth
      if (!ApiService.apiUrl || !ApiService.isInitialized || !ApiService.hasAuthEndpoints) {
        return await this.updateUserDataOffline(userData);
      }
      
      // Nếu có API thực tế
      try {
        const result = await ApiService.putJson('/auth/update-profile', userData, token);
        
        // Lưu thông tin mới
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        this.currentUser = result.user;
        
        return result;
      } catch (error) {
        console.error('Lỗi API cập nhật thông tin:', error);
        // Nếu lỗi kết nối, vẫn cập nhật offline
        if (error.message && (
          error.message.includes('kết nối') || 
          error.message.includes('không hỗ trợ') ||
          error.message.includes('không thể') ||
          error.message.includes('Network') ||
          error.message.includes('timeout') ||
          error.message.includes('abort')
        )) {
          return await this.updateUserDataOffline(userData);
        }
        throw error;
      }
    } catch (error) {
      console.error('Lỗi cập nhật thông tin:', error);
      throw error;
    }
  }
  
  // Thêm phương thức cập nhật thông tin offline
  static async updateUserDataOffline(userData) {
    // Lấy thông tin người dùng hiện tại
    const currentUserData = await this.getUserData();
    
    // Cập nhật thông tin
    const updatedUser = { ...currentUserData, ...userData };
    
    // Lưu lại
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    this.currentUser = updatedUser;
    
    return {
      success: true,
      user: updatedUser,
    };
  }
  
  // Kiểm tra xác thực
  static isLoggedIn() {
    return this.isAuthenticated;
  }
  
  // Lấy thông tin người dùng hiện tại
  static getCurrentUser() {
    return this.currentUser;
  }
  
  // Demo: Đặt lại mật khẩu (chỉ hoạt động với API thực tế)
  static async resetPassword(email) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      // Trong trường hợp offline hoặc không có API hoặc server không hỗ trợ auth
      if (!ApiService.apiUrl || !ApiService.isInitialized || !ApiService.hasAuthEndpoints) {
        // Demo: giả lập thành công
        console.log('Sử dụng chế độ đặt lại mật khẩu offline do không có kết nối API hoặc server không hỗ trợ auth');
        return {
          success: true,
          message: 'Đã gửi email đặt lại mật khẩu (chế độ offline).',
        };
      }
      
      try {
        const result = await ApiService.postJson('/auth/reset-password', { email });
        return result;
      } catch (error) {
        console.error('Lỗi API đặt lại mật khẩu:', error);
        
        // Nếu là lỗi kết nối, vẫn trả về thành công giả lập
        if (error.message && (
          error.message.includes('kết nối') || 
          error.message.includes('không hỗ trợ') ||
          error.message.includes('không thể') ||
          error.message.includes('Network') ||
          error.message.includes('timeout') ||
          error.message.includes('abort')
        )) {
          return {
            success: true,
            message: 'Đã gửi email đặt lại mật khẩu (chế độ offline).',
          };
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      throw error;
    }
  }
}

export default AuthService;