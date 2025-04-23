// services/JsonStorageService.js
import * as FileSystem from 'expo-file-system';

class JsonStorageService {
  static USERS_FILE_PATH = FileSystem.documentDirectory + 'users.json';

  // Đọc tất cả người dùng
  static async getAllUsers() {
    try {
      // Kiểm tra file tồn tại chưa
      const fileInfo = await FileSystem.getInfoAsync(this.USERS_FILE_PATH);
      
      if (!fileInfo.exists) {
        // Nếu file chưa tồn tại, tạo file mới với mảng rỗng
        await this.saveAllUsers([]);
        return [];
      }
      
      // Đọc file
      const content = await FileSystem.readAsStringAsync(this.USERS_FILE_PATH);
      return JSON.parse(content);
    } catch (error) {
      console.error('Lỗi khi đọc danh sách người dùng:', error);
      return [];
    }
  }

  // Lưu tất cả người dùng
  static async saveAllUsers(users) {
    try {
      await FileSystem.writeAsStringAsync(
        this.USERS_FILE_PATH,
        JSON.stringify(users, null, 2) // Format JSON để dễ đọc
      );
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

  // Thêm người dùng mới
  static async addUser(userData) {
    const users = await this.getAllUsers();
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = users.find(user => user.email === userData.email);
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }
    
    // Thêm người dùng mới
    const newUser = {
      ...userData,
      id: 'user_' + Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await this.saveAllUsers(users);
    
    return newUser;
  }

  // Cập nhật thông tin người dùng
  static async updateUser(userId, updatedData) {
    const users = await this.getAllUsers();
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new Error('Không tìm thấy người dùng');
    }
    
    // Cập nhật thông tin
    users[userIndex] = {
      ...users[userIndex],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveAllUsers(users);
    return users[userIndex];
  }
}

export default JsonStorageService;