import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import SessionStorageService from './SessionStorageService';
// Các key lưu trữ dữ liệu xác thực
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  USERS_LIST: 'usersList'
};

// Lớp quản lý mã hóa mật khẩu
class PasswordManager {
  /**
   * Tạo salt ngẫu nhiên
   */
  static generateSalt() {
    // Tạo salt ngẫu nhiên 32 ký tự hex
    const randomBytes = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15) +
                       Date.now().toString(36);
    return randomBytes.substring(0, 32);
  }

  /**
   * Mã hóa mật khẩu bằng SHA-256 với salt
   */
  static async hashPassword(password, salt = null) {
    if (!salt) {
      salt = this.generateSalt();
    }
    
    // Kết hợp password và salt
    const passwordSalt = password + salt;
    
    // Mã hóa bằng SHA-256 sử dụng expo-crypto
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passwordSalt,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    return {
      hash: hash,
      salt: salt
    };
  }

  /**
   * Xác minh mật khẩu
   */
  static async verifyPassword(password, storedHash, storedSalt) {
    const newHashData = await this.hashPassword(password, storedSalt);
    return newHashData.hash === storedHash;
  }
}

class AuthService {
  static isAuthenticated = false;
  static currentUser = null;
  
  // Xóa toàn bộ dữ liệu trong AsyncStorage
  static async clearAllData() {
    try {
      await AsyncStorage.clear();
      console.log('Đã xóa toàn bộ dữ liệu trong AsyncStorage');
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa dữ liệu:', error);
      return false;
    }
  }
  
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
  
  // Lấy danh sách người dùng
  static async getAllUsers() {
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_LIST);
      if (!usersString) {
        return [];
      }
      return JSON.parse(usersString);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error);
      return [];
    }
  }
  
  // Lưu danh sách người dùng
  static async saveAllUsers(users) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu danh sách người dùng:', error);
      return false;
    }
  }
  
  // Tìm người dùng theo email
  static async findUserByEmail(email) {
    const users = await this.getAllUsers();
    return users.find(user => user.email === email);
  }
  
  // Export STORAGE_KEYS để có thể sử dụng trong các file khác
  static get storageKeys() {
    return STORAGE_KEYS;
  }

  // Đăng ký tài khoản mới với mã hóa mật khẩu
  static async register(data) {
    try {
      console.log('🔍 DEBUG: Bắt đầu đăng ký với expo-crypto');
      
      // Lấy danh sách người dùng hiện tại
      const users = await this.getAllUsers();
      
      // Kiểm tra email đã tồn tại chưa
      const existingUser = users.find(user => user.email === data.email);
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }
      
      console.log('🔍 DEBUG: Chuẩn bị mã hóa mật khẩu...');
      
      // Mã hóa mật khẩu (async)
      const passwordData = await PasswordManager.hashPassword(data.password);
      
      console.log('🔍 DEBUG: Mật khẩu đã được mã hóa');
      
      // Tạo người dùng mới
      const newUser = {
        id: 'user_' + Date.now().toString(),
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || '',
        password_hash: passwordData.hash,
        password_salt: passwordData.salt,
        createdAt: new Date().toISOString()
      };
      
      // Thêm vào danh sách người dùng và lưu lại
      users.push(newUser);
      await this.saveAllUsers(users);
      
      // Tạo token
      const token = 'token_' + newUser.id;
      
      // Lưu thông tin đăng nhập hiện tại (không bao gồm hash và salt)
      const userForStorage = {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        createdAt: newUser.createdAt
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userForStorage));
      
      this.isAuthenticated = true;
      this.currentUser = userForStorage;
      
      console.log(`✅ Mật khẩu đã được mã hóa SHA-256 cho: ${data.email}`);
      console.log(`📦 Hash: ${passwordData.hash.substring(0, 20)}...`);
      console.log(`🧂 Salt: ${passwordData.salt.substring(0, 20)}...`);
      
      return {
        success: true,
        user: userForStorage,
        token: token
      };
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    }
  }

  // Đăng nhập với xác minh mật khẩu đã mã hóa
  static async login(email, password) {
    try {
      // QUAN TRỌNG: Luôn cho phép đăng nhập với tài khoản demo
      if (email === 'demo@example.com' && password === 'password') {
        console.log('Đăng nhập với tài khoản demo');
        return this.loginOffline(email);
      }
      
      // Kiểm tra từ danh sách người dùng đã đăng ký
      const user = await this.findUserByEmail(email);
      if (!user) {
        throw new Error('Email không tồn tại');
      }
      
      // Xác minh mật khẩu (async)
      const isValidPassword = await PasswordManager.verifyPassword(
        password, 
        user.password_hash, 
        user.password_salt
      );
      
      if (!isValidPassword) {
        throw new Error('Mật khẩu không đúng');
      }
      
      console.log('✅ Đăng nhập thành công với tài khoản:', email);
      console.log('🔐 Mật khẩu đã được xác minh qua SHA-256');
      
      // Đánh dấu là đã đăng nhập
      this.isAuthenticated = true;
      
      // Chuẩn bị thông tin user (không bao gồm hash và salt)
      const userForStorage = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt
      };
      
      this.currentUser = userForStorage;
      
      // Lưu thông tin đăng nhập hiện tại
      const token = 'token_' + user.id;
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userForStorage));
      
      return {
        success: true,
        user: userForStorage,
        token: token
      };
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
  
  // Đổi mật khẩu
  static async changePassword(email, oldPassword, newPassword) {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }
      
      // Xác minh mật khẩu cũ (async)
      const isOldPasswordValid = await PasswordManager.verifyPassword(
        oldPassword, 
        user.password_hash, 
        user.password_salt
      );
      
      if (!isOldPasswordValid) {
        throw new Error('Mật khẩu cũ không đúng');
      }
      
      // Mã hóa mật khẩu mới (async)
      const newPasswordData = await PasswordManager.hashPassword(newPassword);
      
      // Cập nhật mật khẩu trong danh sách users
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.email === email);
      
      if (userIndex >= 0) {
        users[userIndex].password_hash = newPasswordData.hash;
        users[userIndex].password_salt = newPasswordData.salt;
        await this.saveAllUsers(users);
      }
      
      console.log('✅ Đã đổi mật khẩu thành công cho:', email);
      
      return {
        success: true,
        message: 'Đổi mật khẩu thành công'
      };
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      throw error;
    }
  }
  
  // Đăng xuất
static async logout() {
  try {
    // CHỈ XÓA DỮ LIỆU AUTH - GIỮ NGUYÊN DỮ LIỆU USER
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    this.isAuthenticated = false;
    this.currentUser = null;
    
    console.log('✅ Đăng xuất thành công - Dữ liệu user được giữ lại');
    return true;
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    return false;
  }
}
static async clearUserData() {
  try {
    await SessionStorageService.clearCurrentUserData();
    console.log('✅ Đã xóa dữ liệu user hiện tại');
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu user:', error);
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
      const currentUserData = await this.getUserData();
      if (!currentUserData) {
        throw new Error('Chưa đăng nhập');
      }
      
      // Tạo đối tượng người dùng đã cập nhật
      const updatedUser = { ...currentUserData, ...userData };
      
      // Cập nhật trong danh sách người dùng
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(user => user.id === currentUserData.id);
      
      if (userIndex >= 0) {
        // Cập nhật thông tin cơ bản (không thay đổi password_hash và password_salt)
        users[userIndex] = {
          ...users[userIndex],
          fullName: updatedUser.fullName,
          phone: updatedUser.phone
        };
        await this.saveAllUsers(users);
      }
      
      // Cập nhật thông tin người dùng hiện tại
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      this.currentUser = updatedUser;
      
      return {
        success: true,
        user: updatedUser
      };
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
  
  // Demo: Đặt lại mật khẩu
  static async resetPassword(email) {
    try {
      // Kiểm tra email trong danh sách người dùng
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        // Vẫn trả về thành công dù không tìm thấy người dùng (để bảo mật)
        return {
          success: true,
          message: 'Đã gửi email đặt lại mật khẩu (nếu email tồn tại).'
        };
      }
      
      // Trong môi trường thực tế, gửi email đặt lại mật khẩu
      // Nhưng demo chỉ cần trả về thành công
      
      return {
        success: true,
        message: 'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
      };
    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error);
      throw error;
    }
  }
}

export default AuthService;