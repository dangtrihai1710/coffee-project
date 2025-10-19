// services/ApiService.js
import { Platform } from 'react-native';

class ApiService {
  static API_BASE_PORT = '5000';
  static CONNECTION_TIMEOUT = 5000; // Giảm timeout xuống 5 giây để nhanh hơn
  static isInitialized = false;
  static apiUrl = null;
  static hasAuthEndpoints = false;  // Đánh dấu có hỗ trợ các routes xác thực không
  
  // Danh sách các IP thông dụng để thử kết nối
  static COMMON_IPS = [
    '192.168.100.142',
    '192.168.161.50',
    '192.168.141.24',
    '192.168.100.81'
  ];
  
  // Kiểm tra một endpoint cụ thể trên server
  static async checkEndpointAvailability(url, endpoint) {
    try {
      const fullUrl = `${url}${endpoint}`;
      console.log(`[API] Kiểm tra endpoint: ${fullUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.CONNECTION_TIMEOUT);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Nếu endpoint tồn tại và trả về 200 OK
      return response.ok;
    } catch (error) {
      console.log(`[API] Endpoint không khả dụng: ${error.message}`);
      return false;
    }
  }
  
  // Khởi tạo API URL bằng cách tự động tìm server
  static async initialize(forceReconnect = false) {
    // Nếu đã khởi tạo rồi và không yêu cầu kết nối lại
    if (this.isInitialized && this.apiUrl && !forceReconnect) {
      // Kiểm tra xem URL hiện tại có còn hoạt động không
      try {
        console.log(`[API] Kiểm tra lại API URL hiện tại: ${this.apiUrl}`);
        if (await this.checkServerAvailability(this.apiUrl)) {
          return this.apiUrl;
        } else {
          console.log('[API] API URL hiện tại không còn hoạt động, thử kết nối lại');
          // Nếu không hoạt động, tiếp tục khởi tạo lại
        }
      } catch (error) {
        console.log('[API] Lỗi khi kiểm tra API URL hiện tại:', error.message);
        // Tiếp tục khởi tạo lại
      }
    }
    
    // Reset trạng thái nếu yêu cầu kết nối lại
    if (forceReconnect) {
      this.isInitialized = false;
      this.apiUrl = null;
      this.hasAuthEndpoints = false;
    }
    
    // Thêm dòng này để in log
    console.log('[API] Đang tìm kiếm server...');
    
    // Kiểm tra kết nối đến Android Emulator trước
    if (Platform.OS === 'android' && Platform.isTV === false) {
      const emulatorUrl = `http://10.0.2.2:${this.API_BASE_PORT}`;
      try {
        if (await this.checkServerAvailability(emulatorUrl)) {
          this.apiUrl = emulatorUrl;
          this.isInitialized = true;
          console.log(`[API] Đã kết nối tới server emulator: ${this.apiUrl}`);
          
          // Kiểm tra xem có hỗ trợ auth endpoints không
          this.hasAuthEndpoints = await this.checkEndpointAvailability(this.apiUrl, '/auth/login');
          console.log(`[API] Server hỗ trợ auth endpoints: ${this.hasAuthEndpoints}`);
          
          return this.apiUrl;
        }
      } catch (error) {
        console.log('[API] Không thể kết nối tới emulator:', error.message);
      }
    }
    
    // Thử từng IP cho đến khi tìm được server
    for (const ip of this.COMMON_IPS) {
      const url = `http://${ip}:${this.API_BASE_PORT}`;
      console.log(`[API] Thử kết nối đến: ${url}`);
      
      try {
        if (await this.checkServerAvailability(url)) {
          this.apiUrl = url;
          this.isInitialized = true;
          console.log(`[API] Đã kết nối thành công tới: ${this.apiUrl}`);
          
          // Kiểm tra xem có hỗ trợ auth endpoints không
          this.hasAuthEndpoints = await this.checkEndpointAvailability(this.apiUrl, '/auth/login');
          console.log(`[API] Server hỗ trợ auth endpoints: ${this.hasAuthEndpoints}`);
          
          return this.apiUrl;
        }
      } catch (error) {
        console.log(`[API] Không thể kết nối tới ${url}:`, error.message);
      }
    }
    
    // Nếu không tìm thấy server, trả về null
    console.warn('[API] Không thể tự động tìm được server.');
    this.isInitialized = false;
    this.hasAuthEndpoints = false;
    return null;
  }
  
  // Kiểm tra xem server có khả dụng không
  static async checkServerAvailability(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('Connection timeout'));
        }, this.CONNECTION_TIMEOUT);
        
        console.log(`[API] Kiểm tra kết nối tới: ${url}`);
        
        const response = await fetch(`${url}`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Thử đọc nội dung để xem có phải API thực sự không
        const text = await response.text();
        console.log(`[API] Nhận được phản hồi: ${text.substring(0, 50)}...`);
        
        if (response.ok) {
          resolve(true);
        } else {
          reject(new Error(`Server response not OK: ${response.status}`));
        }
      } catch (error) {
        console.log(`[API] Lỗi kết nối: ${error.message}`);
        reject(error);
      }
    });
  }

  // Hàm debug kiểm tra API URL hiện tại
  static async debugApiUrl() {
    // Kiểm tra xem apiUrl hiện tại có hoạt động không
    if (this.apiUrl) {
      try {
        console.log(`[DEBUG] Kiểm tra API URL: ${this.apiUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(this.apiUrl, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Đọc text phản hồi
        const text = await response.text();
        console.log(`[DEBUG] Phản hồi từ ${this.apiUrl}: 
        Status: ${response.status}
        Content-Type: ${response.headers.get('content-type')}
        Body: ${text.substring(0, 200)}...`);
        
        return {
          working: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          sample: text.substring(0, 200)
        };
      } catch (error) {
        console.error(`[DEBUG] Lỗi kiểm tra API URL: ${error.message}`);
        return {
          working: false,
          error: error.message
        };
      }
    } else {
      console.log('[DEBUG] Chưa có API URL');
      return {
        working: false,
        error: 'Chưa có API URL'
      };
    }
  }
  
// Phương thức analyzeLeafImage trong ApiService.js

static async analyzeLeafImage(imageUri) {
  try {
    // Đảm bảo đã khởi tạo API URL
    if (!this.isInitialized) {
      const apiUrl = await this.initialize();
      if (!apiUrl) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
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
    
    // Thêm xử lý timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 giây timeout cho upload ảnh
    
    try {
      const response = await fetch(`${this.apiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Kiểm tra content type trước khi cố gắng đọc JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          // Đọc nội dung text để gỡ lỗi
          const textContent = await response.text();
          console.error("Nội dung phản hồi không phải JSON:", textContent.substring(0, 200));
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Kiểm tra content type trước khi parse JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Nhận nội dung thô để gỡ lỗi
        const textContent = await response.text();
        console.error("Phản hồi không phải JSON:", textContent.substring(0, 200) + "...");
        throw new Error("Server đã trả về định dạng không hợp lệ. API có thể đã thay đổi.");
      }
      
      return await response.json();
    } catch (fetchError) {
      // Xử lý lỗi cụ thể khi gọi API
      if (fetchError.name === 'AbortError') {
        throw new Error('Quá thời gian phân tích ảnh. Vui lòng thử lại.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error analyzing leaf image:', error);
    throw error;
  }
}

  // Gửi POST request có chứa JSON
  static async postJson(endpoint, data) {
    try {
      // Đảm bảo đã khởi tạo API URL
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.apiUrl) {
        throw new Error('Không thể kết nối đến server.');
      }
      
      // Kiểm tra xem endpoint có phải là auth endpoint không
      if (endpoint.startsWith('/auth/') && !this.hasAuthEndpoints) {
        throw new Error('Server không hỗ trợ xác thực');
      }
      
      console.log(`[API] Gửi POST request đến: ${this.apiUrl}${endpoint}`);
      
      // Tạo AbortController để xử lý timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
      
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      // Xóa timeout khi hoàn thành
      clearTimeout(timeoutId);
      
      // Kiểm tra content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Nhận nội dung thô để gỡ lỗi
        const textContent = await response.text();
        console.error(`Phản hồi không phải JSON từ ${endpoint}:`, textContent.substring(0, 200) + "...");
        throw new Error("Server đã trả về định dạng không hợp lệ.");
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[API] Lỗi khi gọi ${endpoint}:`, error);
      throw error;
    }
  }
  
// Gửi PUT request có chứa JSON
static async putJson(endpoint, data, token = null) {
  try {
    // Đảm bảo đã khởi tạo API URL
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.apiUrl) {
      throw new Error('Không thể kết nối đến server.');
    }
    
    // Kiểm tra xem endpoint có phải là auth endpoint không
    if (endpoint.startsWith('/auth/') && !this.hasAuthEndpoints) {
      throw new Error('Server không hỗ trợ xác thực');
    }
    
    console.log(`[API] Gửi PUT request đến: ${this.apiUrl}${endpoint}`);
    
    // Tạo AbortController để xử lý timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
    
    // Chuẩn bị headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Thêm token nếu có
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    // Xóa timeout khi hoàn thành
    clearTimeout(timeoutId);
    
    // Kiểm tra content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // Nhận nội dung thô để gỡ lỗi
      const textContent = await response.text();
      console.error(`Phản hồi không phải JSON từ ${endpoint}:`, textContent.substring(0, 200) + "...");
      throw new Error("Server đã trả về định dạng không hợp lệ.");
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP error! status: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[API] Lỗi khi gọi ${endpoint}:`, error);
    throw error;
  }
}
}

export default ApiService;