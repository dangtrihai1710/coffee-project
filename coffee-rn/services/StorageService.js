// services/StorageService.js (Updated)
import SessionStorageService from './SessionStorageService';

class StorageService {
  // Wrapper methods để tương thích với code hiện tại
  
  static async saveScanHistory(history) {
    return await SessionStorageService.saveScanHistory(history);
  }

  static async getScanHistory() {
    return await SessionStorageService.getScanHistory();
  }

  static async addScanToHistory(scan) {
    return await SessionStorageService.addScanToHistory(scan);
  }

  static async removeScanFromHistory(scanId) {
    return await SessionStorageService.removeScanFromHistory(scanId);
  }

  static async clearScanHistory() {
    return await SessionStorageService.clearScanHistory();
  }
}

export default StorageService;