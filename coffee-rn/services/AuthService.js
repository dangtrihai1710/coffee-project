import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// --- Cấu hình ---
// API URL giờ là địa chỉ công khai của ngrok
const API_URL = 'https://3b2ebacd31cb.ngrok-free.app';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData', // Vẫn lưu dữ liệu người dùng lấy từ server
};

class AuthService {
  
  static async _request(endpoint, options) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Sử dụng message từ backend, hoặc lỗi mặc định
        throw new Error(data.message || 'Đã có lỗi xảy ra');
      }
      return data;
    } catch (error) {
      console.error(`Lỗi API khi gọi ${endpoint}:`, error);
      throw error;
    }
  }

  static async register(userData) {
    return this._request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async login(email, password) {
    const data = await this._request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
      // Sau khi đăng nhập, lấy và lưu thông tin người dùng
      const profile = await this.getProfile();
      return { success: true, user: profile };
    }
    throw new Error('Đăng nhập thất bại: Không nhận được access token.');
  }
  
  static async getProfile() {
    try {
      const profile = await this._request('/auth/profile');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
      return profile;
    } catch (error) {
      // Nếu lấy profile thất bại (ví dụ token không hợp lệ), đăng xuất người dùng
      console.error("Lấy thông tin người dùng thất bại, đang đăng xuất.", error);
      await this.logout();
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  static async logout() {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  static async getToken() {
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  static async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  static async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  }

  // Hàm này nên được gọi khi ứng dụng khởi động
  static async initialize() {
    const token = await this.getToken();
    if (token) {
      try {
        // Xác thực token bằng cách lấy thông tin người dùng
        await this.getProfile();
        return true;
      } catch (error) {
        // Token không hợp lệ hoặc đã hết hạn
        return false;
      }
    }
    return false;
  }
}

export default AuthService;
