// services/ApiService.js
import { Platform } from 'react-native';

class ApiService {
  static API_BASE_PORT = '5000';
  static CONNECTION_TIMEOUT = 3000; // 3 giây
  static isInitialized = false;
  static apiUrl = null;
  
  // Danh sách các IP thông dụng để thử kết nối
  static COMMON_IPS = [
    // '10.0.2.2',      // Máy chủ local trong Android Emulator
    // '127.0.0.1',     // Localhost
    // '192.168.1.2',   // Thêm các IP thông dụng của mạng nhà bạn
    // '192.168.1.3',
    // '192.168.1.4',
    // '192.168.1.5',
    // '192.168.1.6',
    // '192.168.1.7',
    // '192.168.0.100',
    // '192.168.0.101',
    // '192.168.0.102',
    '192.168.182.50',
  ];
  
  // Khởi tạo API URL bằng cách tự động tìm server
  static async initialize() {
    // Nếu đã khởi tạo rồi, không cần khởi tạo lại
    if (this.isInitialized && this.apiUrl) {
      return this.apiUrl;
    }
    
    // Nếu chạy trên Android Emulator, dùng 10.0.2.2 để truy cập localhost
    if (Platform.OS === 'android' && Platform.isTV === false) {
      const emulatorUrl = `http://10.0.2.2:${this.API_BASE_PORT}`;
      if (await this.checkServerAvailability(emulatorUrl)) {
        this.apiUrl = emulatorUrl;
        this.isInitialized = true;
        console.log(`[API] Đã kết nối tới server emulator: ${this.apiUrl}`);
        return this.apiUrl;
      }
    }
    
    // Thử từng IP cho đến khi tìm được server
    for (const ip of this.COMMON_IPS) {
      const url = `http://${ip}:${this.API_BASE_PORT}`;
      console.log(`[API] Thử kết nối đến: ${url}`);
      
      if (await this.checkServerAvailability(url)) {
        this.apiUrl = url;
        this.isInitialized = true;
        console.log(`[API] Đã kết nối thành công tới: ${this.apiUrl}`);
        return this.apiUrl;
      }
    }
    
    // Nếu không tìm thấy server, dùng giá trị mặc định
    this.apiUrl = 'http://localhost:5000';
    console.warn('[API] Không thể tự động tìm được server. Sử dụng server mặc định:', this.apiUrl);
    return this.apiUrl;
  }
  
  // Kiểm tra xem server có khả dụng không
  static async checkServerAvailability(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  // Gửi ảnh lá cây để phân tích
  static async analyzeLeafImage(imageUri) {
    try {
      // Đảm bảo đã khởi tạo API URL
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });

      console.log(`[API] Gửi ảnh đến: ${this.apiUrl}/predict`);
      const response = await fetch(`${this.apiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error analyzing leaf image:', error);
      throw error;
    }
  }
}

export default ApiService;