
import AsyncStorage from '@react-native-async-storage/async-storage';

// Các key lưu trữ dữ liệu xác thực
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  USERS_LIST: 'usersList' // Thêm key mới để lưu danh sách người dùng
};

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

  // Đăng ký tài khoản mới
  static async register(data) {
    try {
      // Lấy danh sách người dùng hiện tại
      const users = await this.getAllUsers();
      
      // Kiểm tra email đã tồn tại chưa
      const existingUser = users.find(user => user.email === data.email);
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }
      
      // Tạo người dùng mới
      const newUser = {
        id: 'user_' + Date.now().toString(),
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || '',
        password: data.password, // Trong thực tế, mật khẩu nên được băm
        createdAt: new Date().toISOString()
      };
      
      // Thêm vào danh sách người dùng và lưu lại
      users.push(newUser);
      await this.saveAllUsers(users);
      
      // Tạo token đơn giản
      const token = 'token_' + newUser.id;
      
      // Lưu thông tin đăng nhập hiện tại
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newUser));
      
      this.isAuthenticated = true;
      this.currentUser = newUser;
      
      return {
        success: true,
        user: newUser,
        token: token
      };
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      throw error;
    }
  }
  
  // Giả lập đăng ký (không thay đổi dữ liệu hiện có)
  static async registerOffline(data) {
    console.log('Đăng ký offline với dữ liệu:', data);
    const mockUser = {
      id: 'offline_' + Date.now().toString(),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      createdAt: new Date().toISOString(),
      // Lưu mật khẩu để có thể kiểm tra sau này
      password: data.password
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

  // Đăng nhập
  static async login(email, password) {
    try {
      // QUAN TRỌNG: Luôn cho phép đăng nhập với tài khoản demo
      if (email === 'demo@example.com' && password === 'password') {
        console.log('Đăng nhập với tài khoản demo');
        return this.loginOffline(email);
      }
      
      // Kiểm tra từ danh sách người dùng đã đăng ký
      const user = await this.findUserByEmail(email);
      if (user) {
        // Kiểm tra mật khẩu (trong thực tế, cần so sánh mật khẩu đã băm)
        if (user.password === password) {
          console.log('Đăng nhập thành công với tài khoản:', email);
          
          // Đánh dấu là đã đăng nhập
          this.isAuthenticated = true;
          this.currentUser = user;
          
          // Lưu thông tin đăng nhập hiện tại
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'token_' + user.id);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
          
          return {
            success: true,
            user: user,
            token: 'token_' + user.id
          };
        } else {
          throw new Error('Mật khẩu không đúng');
        }
      }
      
      throw new Error('Email không tồn tại');
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
        users[userIndex] = updatedUser;
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