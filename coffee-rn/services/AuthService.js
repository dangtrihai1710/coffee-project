import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';



// --- Cấu hình ---
// API URL giờ là địa chỉ công khai của ngrok
const API_URL = 'https://986b895679b0.ngrok-free.app';

// Client ID của Web Application từ Google Cloud Console
const WEB_CLIENT_ID = '637075502351-l1t9dlugduoq5c83e3i1gvfc0ajnhn7s.apps.googleusercontent.com';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
};

class AuthService {

  // Cấu hình Google Sign-In
  static configureGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true, // cần thiết để lấy idToken
    });
  }

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
        throw new Error(data.message || 'Đã có lỗi xảy ra');
      }
      return data;
    } catch (error) {
      console.error(`Lỗi API khi gọi ${endpoint}:`, error);
      throw error;
    }
  }

  // Đăng nhập bằng Google
  static async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      
      const userInfo = await GoogleSignin.signIn();
      console.log('--- Google Sign-In Data ---');
      console.log(JSON.stringify(userInfo, null, 2));
      console.log('---------------------------');

      // Sửa lỗi: idToken nằm trong userInfo.data.idToken
      const idToken = userInfo.data ? userInfo.data.idToken : null;

      if (!idToken) {
        throw new Error('Không thể lấy ID token từ Google. Cấu trúc dữ liệu trả về không như mong đợi.');
      }

      // Gửi idToken đến backend để xác thực và nhận lại JWT token của bạn
      const data = await this._request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: idToken }),
      });

      if (data.access_token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
        const profile = await this.getProfile();
        return { success: true, user: profile };
      }
      throw new Error('Đăng nhập Google thất bại: Không nhận được access token từ server.');

    } catch (error) {
      if (error.code) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('Người dùng đã hủy đăng nhập');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Đăng nhập đang được xử lý');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error('Dịch vụ Google Play không có sẵn hoặc đã lỗi thời');
            throw new Error('Dịch vụ Google Play không có sẵn.');
          default:
            console.error('Lỗi đăng nhập Google (raw):', error);
            throw new Error(`Lỗi đăng nhập Google: ${error.message}`);
        }
      } else {
        console.error('Lỗi không xác định khi đăng nhập Google:', error);
        throw error;
      }
      return { success: false, error: 'Đăng nhập đã bị hủy hoặc có lỗi xảy ra.' };
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
      console.error("Lấy thông tin người dùng thất bại, đang đăng xuất.", error);
      await this.logout();
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  static async logout() {
    try {
        // Sửa lỗi: Dùng getCurrentUser() để kiểm tra trạng thái đăng nhập
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
            await GoogleSignin.revokeAccess();
            await GoogleSignin.signOut();
        }
    } catch (error) {
        console.error('Lỗi khi đăng xuất khỏi Google:', error);
    } finally {
        // Luôn xóa token và dữ liệu người dùng của app
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
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

  static async initialize() {
    // Cấu hình google sign in khi app khởi động
    this.configureGoogleSignIn();

    const token = await this.getToken();
    if (token) {
      try {
        await this.getProfile();
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
}

export default AuthService;