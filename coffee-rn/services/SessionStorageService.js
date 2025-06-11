// services/SessionStorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class SessionStorageService {
  // Lấy prefix key cho user hiện tại
  static async getCurrentUserPrefix() {
    try {
      const userData = await AuthService.getUserData();
      if (userData && userData.id) {
        return `user_${userData.id}_`;
      }
      return 'guest_'; // Fallback cho trường hợp chưa đăng nhập
    } catch (error) {
      console.error('Lỗi khi lấy user prefix:', error);
      return 'guest_';
    }
  }

  // Tạo key với prefix của user
  static async createUserKey(baseKey) {
    const prefix = await this.getCurrentUserPrefix();
    return `${prefix}${baseKey}`;
  }

  // =============== SCAN HISTORY - Theo từng user ===============
  
  // Lưu lịch sử quét cho user hiện tại
  static async saveScanHistory(history) {
    try {
      const key = await this.createUserKey('scanHistory');
      const jsonValue = JSON.stringify(history);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử quét:', error);
      return false;
    }
  }

  // Lấy lịch sử quét của user hiện tại
  static async getScanHistory() {
    try {
      const key = await this.createUserKey('scanHistory');
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử quét:', error);
      return [];
    }
  }

  // Thêm mục quét mới cho user hiện tại
  static async addScanToHistory(scan) {
    try {
      const currentHistory = await this.getScanHistory();
      const updatedHistory = [scan, ...currentHistory];
      const limitedHistory = updatedHistory.slice(0, 50);
      await this.saveScanHistory(limitedHistory);
      return limitedHistory;
    } catch (error) {
      console.error('Lỗi khi thêm quét vào lịch sử:', error);
      return null;
    }
  }

  // Xóa mục từ lịch sử quét của user hiện tại
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

  // Xóa toàn bộ lịch sử quét của user hiện tại
  static async clearScanHistory() {
    try {
      const key = await this.createUserKey('scanHistory');
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa toàn bộ lịch sử:', error);
      return false;
    }
  }

  // =============== ADVISOR CONVERSATIONS - Theo từng user ===============
  
  // Lưu danh sách hội thoại
  static async saveConversations(conversations) {
    try {
      const key = await this.createUserKey('advisor_conversations');
      await AsyncStorage.setItem(key, JSON.stringify(conversations));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu danh sách hội thoại:', error);
      return false;
    }
  }

  // Lấy danh sách hội thoại
  static async getConversations() {
    try {
      const key = await this.createUserKey('advisor_conversations');
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách hội thoại:', error);
      return [];
    }
  }

  // Lưu tin nhắn của một hội thoại cụ thể
  static async saveConversationMessages(conversationId, messages) {
    try {
      const key = await this.createUserKey(`conversation_${conversationId}`);
      await AsyncStorage.setItem(key, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu tin nhắn hội thoại:', error);
      return false;
    }
  }

  // Lấy tin nhắn của một hội thoại cụ thể
  static async getConversationMessages(conversationId) {
    try {
      const key = await this.createUserKey(`conversation_${conversationId}`);
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn hội thoại:', error);
      return [];
    }
  }

  // Xóa một hội thoại
  static async deleteConversation(conversationId) {
    try {
      // Xóa tin nhắn
      const messagesKey = await this.createUserKey(`conversation_${conversationId}`);
      await AsyncStorage.removeItem(messagesKey);
      
      // Cập nhật danh sách hội thoại
      const conversations = await this.getConversations();
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      await this.saveConversations(updatedConversations);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa hội thoại:', error);
      return false;
    }
  }

  // =============== USER PREFERENCES - Theo từng user ===============
  
  // Lưu tùy chọn của user
  static async saveUserPreferences(preferences) {
    try {
      const key = await this.createUserKey('user_preferences');
      await AsyncStorage.setItem(key, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu tùy chọn người dùng:', error);
      return false;
    }
  }

  // Lấy tùy chọn của user
  static async getUserPreferences() {
    try {
      const key = await this.createUserKey('user_preferences');
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : {
        preferredDetailLevel: 'medium',
        experienceLevel: 'beginner',
        farmSize: 'small',
        region: null,
      };
    } catch (error) {
      console.error('Lỗi khi lấy tùy chọn người dùng:', error);
      return {};
    }
  }

  // =============== INTERACTION MEMORY - Theo từng user ===============
  
  // Lưu lịch sử tương tác
  static async saveInteractionHistory(interactions) {
    try {
      const key = await this.createUserKey('interaction_history');
      await AsyncStorage.setItem(key, JSON.stringify(interactions));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử tương tác:', error);
      return false;
    }
  }

  // Lấy lịch sử tương tác
  static async getInteractionHistory() {
    try {
      const key = await this.createUserKey('interaction_history');
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử tương tác:', error);
      return [];
    }
  }

  // Lưu phản hồi đề xuất
  static async saveRecommendationFeedback(feedback) {
    try {
      const key = await this.createUserKey('recommendation_feedback');
      await AsyncStorage.setItem(key, JSON.stringify(feedback));
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi đề xuất:', error);
      return false;
    }
  }

  // Lấy phản hồi đề xuất
  static async getRecommendationFeedback() {
    try {
      const key = await this.createUserKey('recommendation_feedback');
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Lỗi khi lấy phản hồi đề xuất:', error);
      return {};
    }
  }

  // =============== UTILITIES ===============
  
  // Xóa toàn bộ dữ liệu của user hiện tại
  static async clearCurrentUserData() {
    try {
      const prefix = await this.getCurrentUserPrefix();
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Lọc các key của user hiện tại
      const userKeys = allKeys.filter(key => key.startsWith(prefix));
      
      // Xóa tất cả key của user
      await AsyncStorage.multiRemove(userKeys);
      
      console.log(`Đã xóa ${userKeys.length} keys cho user hiện tại`);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa dữ liệu user:', error);
      return false;
    }
  }

  // Lấy tất cả key của user hiện tại (debug)
  static async getCurrentUserKeys() {
    try {
      const prefix = await this.getCurrentUserPrefix();
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith(prefix));
    } catch (error) {
      console.error('Lỗi khi lấy keys của user:', error);
      return [];
    }
  }

  // Chuyển đổi dữ liệu từ user cũ sang user mới
  static async migrateUserData(fromUserId, toUserId) {
    try {
      const fromPrefix = `user_${fromUserId}_`;
      const toPrefix = `user_${toUserId}_`;
      
      const allKeys = await AsyncStorage.getAllKeys();
      const fromUserKeys = allKeys.filter(key => key.startsWith(fromPrefix));
      
      for (const oldKey of fromUserKeys) {
        const data = await AsyncStorage.getItem(oldKey);
        if (data) {
          const newKey = oldKey.replace(fromPrefix, toPrefix);
          await AsyncStorage.setItem(newKey, data);
        }
      }
      
      console.log(`Đã migrate ${fromUserKeys.length} keys từ user ${fromUserId} sang ${toUserId}`);
      return true;
    } catch (error) {
      console.error('Lỗi khi migrate dữ liệu user:', error);
      return false;
    }
  }
}

export default SessionStorageService;