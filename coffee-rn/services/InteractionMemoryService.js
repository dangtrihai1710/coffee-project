// services/InteractionMemoryService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Khai báo các key lưu trữ
const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  RECOMMENDATION_FEEDBACK: 'recommendation_feedback',
  INTERACTION_HISTORY: 'interaction_history',
  USER_CONTEXT: 'user_context',
};

// Định nghĩa mức độ phản hồi
const FEEDBACK_LEVELS = {
  VERY_POSITIVE: 'very_positive',  
  POSITIVE: 'positive',          
  NEUTRAL: 'neutral',             
  NEGATIVE: 'negative',            
  VERY_NEGATIVE: 'very_negative',  
};

// Loại tương tác có thể có
const INTERACTION_TYPES = {
  RECOMMENDATION_GIVEN: 'recommendation_given',     
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted', 
  RECOMMENDATION_REJECTED: 'recommendation_rejected', 
  USER_REPORTED_SUCCESS: 'user_reported_success',   
  USER_REPORTED_FAILURE: 'user_reported_failure',    
  USER_ASKED_FOLLOWUP: 'user_asked_followup',       
  USER_EXPRESSED_CONFUSION: 'user_expressed_confusion', 
  USER_EXPRESSED_GRATITUDE: 'user_expressed_gratitude', 
};

class InteractionMemoryService {
  // Lưu trữ lịch sử tương tác mới
  static async saveInteraction(interaction) {
    try {
      // Đảm bảo interaction có định dạng đúng
      const validInteraction = {
        id: interaction.id || `interaction_${Date.now()}`,
        timestamp: interaction.timestamp || new Date().toISOString(),
        type: interaction.type || INTERACTION_TYPES.RECOMMENDATION_GIVEN,
        content: interaction.content || {},
        context: interaction.context || {},
      };

      // Lấy lịch sử tương tác hiện tại
      const currentHistory = await this.getInteractionHistory();
      
      // Thêm tương tác mới vào đầu mảng
      const updatedHistory = [validInteraction, ...currentHistory];
      
      // Giới hạn số lượng tương tác được lưu trữ (giữ 100 mục gần nhất)
      const limitedHistory = updatedHistory.slice(0, 100);
      
      // Lưu lịch sử cập nhật
      await AsyncStorage.setItem(
        STORAGE_KEYS.INTERACTION_HISTORY,
        JSON.stringify(limitedHistory)
      );
      
      // Cập nhật ngữ cảnh người dùng nếu có thông tin mới
      if (interaction.updateUserContext) {
        await this.updateUserContext(interaction.updateUserContext);
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử tương tác:', error);
      return false;
    }
  }

  // Lấy lịch sử tương tác
  static async getInteractionHistory() {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.INTERACTION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử tương tác:', error);
      return [];
    }
  }

  // Lưu phản hồi về một đề xuất cụ thể
  static async saveRecommendationFeedback(recommendationId, feedback) {
    try {
      // Lấy phản hồi hiện tại
      const currentFeedback = await this.getRecommendationFeedback();
      
      // Tạo bản ghi phản hồi mới hoặc cập nhật nếu đã tồn tại
      const newFeedbackEntry = {
        id: recommendationId,
        lastUpdated: new Date().toISOString(),
        feedbackHistory: [
          {
            timestamp: new Date().toISOString(),
            level: feedback.level || FEEDBACK_LEVELS.NEUTRAL,
            comment: feedback.comment || '',
            success: feedback.success || null,
            context: feedback.context || {},
          },
          ...(currentFeedback[recommendationId]?.feedbackHistory || []),
        ],
        // Tính toán điểm đánh giá tổng thể dựa trên lịch sử
        overallScore: this._calculateOverallScore(
          feedback.level,
          currentFeedback[recommendationId]?.overallScore
        ),
        // Cập nhật số lần sử dụng và tỷ lệ thành công
        usageCount: (currentFeedback[recommendationId]?.usageCount || 0) + 1,
        successCount: (currentFeedback[recommendationId]?.successCount || 0) + 
                      (feedback.success === true ? 1 : 0),
      };
      
      // Tính tỷ lệ thành công
      if (newFeedbackEntry.usageCount > 0) {
        newFeedbackEntry.successRate = newFeedbackEntry.successCount / 
                                       newFeedbackEntry.usageCount;
      }
      
      // Cập nhật đối tượng phản hồi
      const updatedFeedback = {
        ...currentFeedback,
        [recommendationId]: newFeedbackEntry,
      };
      
      // Lưu vào bộ nhớ
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECOMMENDATION_FEEDBACK,
        JSON.stringify(updatedFeedback)
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi đề xuất:', error);
      return false;
    }
  }

  // Lấy phản hồi đề xuất
  static async getRecommendationFeedback() {
    try {
      const feedback = await AsyncStorage.getItem(STORAGE_KEYS.RECOMMENDATION_FEEDBACK);
      return feedback ? JSON.parse(feedback) : {};
    } catch (error) {
      console.error('Lỗi khi lấy phản hồi đề xuất:', error);
      return {};
    }
  }

  // Cập nhật ngữ cảnh người dùng
  static async updateUserContext(contextUpdates) {
    try {
      // Lấy ngữ cảnh hiện tại
      const currentContext = await this.getUserContext();
      
      // Cập nhật ngữ cảnh với dữ liệu mới
      const updatedContext = {
        ...currentContext,
        ...contextUpdates,
        lastUpdated: new Date().toISOString(),
      };
      
      // Lưu vào bộ nhớ
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_CONTEXT,
        JSON.stringify(updatedContext)
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật ngữ cảnh người dùng:', error);
      return false;
    }
  }

  // Lấy ngữ cảnh người dùng
  static async getUserContext() {
    try {
      const context = await AsyncStorage.getItem(STORAGE_KEYS.USER_CONTEXT);
      return context ? JSON.parse(context) : {
        // Ngữ cảnh mặc định
        preferredDetailLevel: 'medium',
        experienceLevel: 'beginner',
        farmSize: 'small',
        region: null,
        previousConditions: [],
        successfulTreatments: [],
        unsuccessfulTreatments: [],
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Lỗi khi lấy ngữ cảnh người dùng:', error);
      return {};
    }
  }

  // Phương thức trợ giúp để tính điểm đánh giá tổng thể
  static _calculateOverallScore(newFeedbackLevel, currentScore = 0) {
    // Ánh xạ các mức độ phản hồi sang giá trị số
    const feedbackValues = {
      [FEEDBACK_LEVELS.VERY_POSITIVE]: 1,
      [FEEDBACK_LEVELS.POSITIVE]: 0.5,
      [FEEDBACK_LEVELS.NEUTRAL]: 0,
      [FEEDBACK_LEVELS.NEGATIVE]: -0.5,
      [FEEDBACK_LEVELS.VERY_NEGATIVE]: -1,
    };
    
    // Trọng số cho phản hồi mới (đặt cao hơn để ưu tiên phản hồi gần đây)
    const newFeedbackWeight = 0.7;
    const currentScoreWeight = 0.3;
    
    // Tính điểm mới
    const newValue = feedbackValues[newFeedbackLevel] || 0;
    
    // Nếu đây là phản hồi đầu tiên, chỉ trả về giá trị mới
    if (currentScore === 0 && newValue === 0) {
      return 0;
    } else if (currentScore === 0) {
      return newValue;
    }
    
    // Tính điểm trung bình có trọng số
    return (newValue * newFeedbackWeight) + (currentScore * currentScoreWeight);
  }

  // Phân tích ngữ điệu của người dùng từ lịch sử tương tác gần đây
  static async analyzeUserSentiment() {
    try {
      // Lấy lịch sử tương tác gần đây nhất (10 tương tác)
      const recentInteractions = (await this.getInteractionHistory()).slice(0, 10);
      
      // Đếm các loại tương tác
      const interactionCounts = recentInteractions.reduce((counts, interaction) => {
        counts[interaction.type] = (counts[interaction.type] || 0) + 1;
        return counts;
      }, {});
      
      // Đếm phản hồi tiêu cực và tích cực
      const positiveInteractions = (interactionCounts[INTERACTION_TYPES.USER_REPORTED_SUCCESS] || 0) + 
                                   (interactionCounts[INTERACTION_TYPES.USER_EXPRESSED_GRATITUDE] || 0) +
                                   (interactionCounts[INTERACTION_TYPES.RECOMMENDATION_ACCEPTED] || 0);
                                   
      const negativeInteractions = (interactionCounts[INTERACTION_TYPES.USER_REPORTED_FAILURE] || 0) + 
                                   (interactionCounts[INTERACTION_TYPES.USER_EXPRESSED_CONFUSION] || 0) +
                                   (interactionCounts[INTERACTION_TYPES.RECOMMENDATION_REJECTED] || 0);
                                   
      // Tính toán mức độ hài lòng tổng thể
      const totalRelevantInteractions = positiveInteractions + negativeInteractions;
      
      if (totalRelevantInteractions === 0) {
        return {
          sentiment: 'neutral',
          confidence: 0,
          details: {
            positiveCount: positiveInteractions,
            negativeCount: negativeInteractions,
            recentInteractionTypes: interactionCounts
          }
        };
      }
      
      const sentimentScore = (positiveInteractions - negativeInteractions) / totalRelevantInteractions;
      
      // Xác định cảm xúc tổng thể
      let sentiment = 'neutral';
      if (sentimentScore > 0.5) sentiment = 'very_positive';
      else if (sentimentScore > 0.1) sentiment = 'positive';
      else if (sentimentScore < -0.5) sentiment = 'very_negative';
      else if (sentimentScore < -0.1) sentiment = 'negative';
      
      return {
        sentiment,
        confidence: Math.abs(sentimentScore),
        details: {
          sentimentScore,
          positiveCount: positiveInteractions,
          negativeCount: negativeInteractions,
          recentInteractionTypes: interactionCounts
        }
      };
    } catch (error) {
      console.error('Lỗi khi phân tích cảm xúc người dùng:', error);
      return {
        sentiment: 'neutral',
        confidence: 0,
        details: {
          error: error.message
        }
      };
    }
  }
}

export {
  InteractionMemoryService,
  INTERACTION_TYPES,
  FEEDBACK_LEVELS
};