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
  
  // Đăng ký người dùng mới
  static async register(data) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      // Trong môi trường demo, có thể chỉ lưu trữ cục bộ
      if (!ApiService.apiUrl) {
        // Demo: tạo tài khoản giả lập
        const mockUser = {
          id: Date.now().toString(),
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          createdAt: new Date().toISOString(),
        };
        
        // Lưu vào AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mockUser));
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'demo_token_' + mockUser.id);
        
        this.isAuthenticated = true;
        this.currentUser = mockUser;
        
        return {
          success: true,
          user: mockUser,
        };
      }
      
      // Nếu có API thực tế, gửi yêu cầu đăng ký
      const response = await fetch(`${ApiService.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng ký thất bại');
      }
      
      const result = await response.json();
      
      // Lưu thông tin đăng nhập
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
      
      this.isAuthenticated = true;
      this.currentUser = result.user;
      
      return result;
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    }
  }
  
  // Đăng nhập người dùng
  static async login(email, password) {
    try {
      // Đảm bảo API đã được khởi tạo
      await ApiService.initialize();
      
      // Trong môi trường demo, có thể chỉ lưu trữ cục bộ với mật khẩu cố định
      if (!ApiService.apiUrl) {
        // Demo: kiểm tra với dữ liệu giả
        if (email === 'demo@example.com' && password === 'password') {
          const mockUser = {
            id: '12345',
            fullName: 'Người Dùng Demo',
            email: 'demo@example.com',
            phone: '0123456789',
            createdAt: new Date().toISOString(),
          };
          
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mockUser));
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'demo_token_12345');
          
          this.isAuthenticated = true;
          this.currentUser = mockUser;
          
          return {
            success: true,
            user: mockUser,
          };
        } else {
          throw new Error('Email hoặc mật khẩu không đúng');
        }
      }
      
      // Nếu có API thực tế, gửi yêu cầu đăng nhập
      const response = await fetch(`${ApiService.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng nhập thất bại');
      }
      
      const result = await response.json();
      
      // Lưu thông tin đăng nhập
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
      
      this.isAuthenticated = true;
      this.currentUser = result.user;
      
      return result;
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw error;
    }
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
      
      // Trong trường hợp demo
      if (!ApiService.apiUrl) {
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
      
      // Nếu có API thực tế
      const response = await fetch(`${ApiService.apiUrl}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Cập nhật thông tin thất bại');
      }
      
      const result = await response.json();
      
      // Lưu thông tin mới
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
      this.currentUser = result.user;
      
      return result;
    } catch (error) {
      console.error('Lỗi cập nhật thông tin:', error);
      throw error;
    }
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
      
      if (!ApiService.apiUrl) {
        // Demo: giả lập thành công
        return {
          success: true,
          message: 'Đã gửi email đặt lại mật khẩu.',
        };
      }
      
      const response = await fetch(`${ApiService.apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể đặt lại mật khẩu');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      throw error;
    }
  }
}

export default AuthService;