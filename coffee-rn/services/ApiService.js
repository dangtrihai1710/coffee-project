// services/ApiService.js

// Thay đổi API_URL theo địa chỉ máy chủ của bạn
const API_URL = 'http://192.168.1.6:5000'; 

class ApiService {
  // Gửi ảnh lá cây để phân tích
  static async analyzeLeafImage(imageUri) {
    try {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });

      const response = await fetch(`${API_URL}/predict`, {
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