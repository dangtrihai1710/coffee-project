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
      
      // Demo mode hoặc không có kết nối API
      if (!ApiService.apiUrl || !ApiService.isInitialized) {
        console.log('Sử dụng chế độ đăng ký offline do không có kết nối API');
        return await this.registerOffline(data);
      }
      
      // Thử gọi API đăng ký
      try {
        console.log(`Đang đăng ký với API URL: ${ApiService.apiUrl}/auth/register`);
        
        // Tạo AbortController để xử lý timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
        
        // Gửi yêu cầu đăng ký
        const response = await fetch(`${ApiService.apiUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        // Xóa timeout khi hoàn thành
        clearTimeout(timeoutId);
        
        // Kiểm tra kiểu nội dung của phản hồi
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Lấy nội dung phản hồi để gỡ lỗi
          const textContent = await response.text();
          console.error("Phản hồi không phải JSON:", textContent.substring(0, 200));
          throw new Error("Phản hồi từ server không phải định dạng JSON hợp lệ");
        }
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Đăng ký thất bại');
        }
        
        // Lưu thông tin đăng nhập
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        
        this.isAuthenticated = true;
        this.currentUser = result.user;
        
        return result;
      } catch (error) {
        console.error('Lỗi khi gọi API đăng ký:', error);
        // Nếu lỗi kết nối hoặc timeout, chuyển sang chế độ offline
        return await this.registerOffline(data);
      }
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    }
  }
  
  static async registerOffline(data) {
    console.log('Đăng ký offline với dữ liệu:', data);
    const mockUser = {
      id: Date.now().toString(),
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
      
      // Trong môi trường demo, kiểm tra với dữ liệu cố định
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
      } 
      
      // Nếu không có API hoặc API không được khởi tạo
      if (!ApiService.apiUrl || !ApiService.isInitialized) {
        throw new Error('Email hoặc mật khẩu không đúng');
      }
      
      // Nếu có API thực tế, gửi yêu cầu đăng nhập
      try {
        console.log(`Đang đăng nhập với API URL: ${ApiService.apiUrl}/auth/login`);
        
        // Tạo AbortController để xử lý timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
        
        const response = await fetch(`${ApiService.apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          signal: controller.signal
        });
        
        // Xóa timeout khi hoàn thành
        clearTimeout(timeoutId);
        
        // Kiểm tra content type trước khi parse JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Nhận nội dung thô để gỡ lỗi
          const textContent = await response.text();
          console.error("Phản hồi không phải JSON:", textContent.substring(0, 200) + "...");
          throw new Error("Server đã trả về định dạng không hợp lệ. Vui lòng kiểm tra kết nối.");
        }
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Đăng nhập thất bại');
        }
        
        // Lưu thông tin đăng nhập
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        
        this.isAuthenticated = true;
        this.currentUser = result.user;
        
        return result;
      } catch (apiError) {
        console.error('Lỗi API đăng nhập:', apiError);
        
        // Nếu đây là lỗi kết nối nhưng email và password là demo, vẫn cho đăng nhập thành công
        if (email === 'demo@example.com' && password === 'password') {
          return this.loginOffline(email);
        }
        
        // Kiểm tra nếu là lỗi mạng, chuyển sang chế độ offline
        if (apiError.message && (
          apiError.message.includes('Network request failed') ||
          apiError.message.includes('timeout') ||
          apiError.message.includes('abort') ||
          apiError.message.includes('định dạng không hợp lệ')
        )) {
          console.log('Chuyển sang chế độ đăng nhập offline do lỗi kết nối');
          // Chuyển sang chế độ demo nếu là tài khoản demo
          if (email === 'demo@example.com' && password === 'password') {
            return this.loginOffline(email);
          }
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw error;
    }
  }
  
  // Thêm phương thức đăng nhập offline
  static async loginOffline(email) {
    const mockUser = {
      id: '12345',
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
      
      // Trong trường hợp offline hoặc không có API
      if (!ApiService.apiUrl || !ApiService.isInitialized) {
        return await this.updateUserDataOffline(userData);
      }
      
      // Nếu có API thực tế
      try {
        console.log(`Đang cập nhật thông tin với API URL: ${ApiService.apiUrl}/auth/update-profile`);
        
        // Tạo AbortController để xử lý timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
        
        const response = await fetch(`${ApiService.apiUrl}/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData),
          signal: controller.signal
        });
        
        // Xóa timeout khi hoàn thành
        clearTimeout(timeoutId);
        
        // Kiểm tra content type trước khi parse JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Nhận nội dung thô để gỡ lỗi
          const textContent = await response.text();
          console.error("Phản hồi không phải JSON:", textContent.substring(0, 200) + "...");
          throw new Error("Server đã trả về định dạng không hợp lệ. Chuyển sang chế độ offline.");
        }
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Cập nhật thông tin thất bại');
        }
        
        // Lưu thông tin mới
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        this.currentUser = result.user;
        
        return result;
      } catch (apiError) {
        console.error('Lỗi API cập nhật thông tin:', apiError);
        // Nếu lỗi kết nối, vẫn cập nhật offline
        return await this.updateUserDataOffline(userData);
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
      
      if (!ApiService.apiUrl || !ApiService.isInitialized) {
        // Demo: giả lập thành công
        return {
          success: true,
          message: 'Đã gửi email đặt lại mật khẩu.',
        };
      }
      
      try {
        console.log(`Đang đặt lại mật khẩu với API URL: ${ApiService.apiUrl}/auth/reset-password`);
        
        // Tạo AbortController để xử lý timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
        
        const response = await fetch(`${ApiService.apiUrl}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
          signal: controller.signal
        });
        
        // Xóa timeout khi hoàn thành
        clearTimeout(timeoutId);
        
        // Kiểm tra content type trước khi parse JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Nhận nội dung thô để gỡ lỗi
          const textContent = await response.text();
          console.error("Phản hồi không phải JSON:", textContent.substring(0, 200) + "...");
          throw new Error("Server đã trả về định dạng không hợp lệ. Vui lòng kiểm tra kết nối.");
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Không thể đặt lại mật khẩu');
        }
        
        return await response.json();
      } catch (apiError) {
        console.error('Lỗi API đặt lại mật khẩu:', apiError);
        // Nếu là lỗi kết nối, vẫn trả về thành công giả lập
        return {
          success: true,
          message: 'Đã gửi email đặt lại mật khẩu (offline mode).',
        };
      }
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      throw error;
    }
  }
}

export default AuthService;