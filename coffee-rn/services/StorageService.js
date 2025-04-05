// services/StorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Các key lưu trữ
const STORAGE_KEYS = {
  SCAN_HISTORY: 'scanHistory',
};

class StorageService {
  // Lưu lịch sử quét
  static async saveScanHistory(history) {
    try {
      const jsonValue = JSON.stringify(history);
      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, jsonValue);
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử quét:', error);
      return false;
    }
  }

  // Lấy lịch sử quét
  static async getScanHistory() {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử quét:', error);
      return [];
    }
  }

  // Thêm một mục vào lịch sử quét
  static async addScanToHistory(scan) {
    try {
      const currentHistory = await this.getScanHistory();
      const updatedHistory = [scan, ...currentHistory];
      // Giới hạn số lượng mục trong lịch sử (tuỳ chọn)
      const limitedHistory = updatedHistory.slice(0, 50);
      await this.saveScanHistory(limitedHistory);
      return limitedHistory;
    } catch (error) {
      console.error('Lỗi khi thêm quét vào lịch sử:', error);
      return null;
    }
  }

  // Xóa một mục khỏi lịch sử quét
  static async removeScanFromHistory(scanId) {
    try {
      const currentHistory = await this.getScanHistory();
      const updatedHistory = currentHistory.filter(item => item.id !== scanId);
      await this.saveScanHistory(updatedHistory);
      return updatedHistory;
    } catch (error) {
      console.error('Lỗi khi xóa mục khỏi lịch sử:', error);
      return null;
    }
  }

  // Xóa toàn bộ lịch sử quét
  static async clearScanHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa toàn bộ lịch sử:', error);
      return false;
    }
  }
}

export default StorageService;