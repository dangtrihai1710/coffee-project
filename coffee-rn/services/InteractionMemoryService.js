// services/InteractionMemoryService.js (Updated)
import SessionStorageService from './SessionStorageService';

// Định nghĩa mức độ phản hồi (giữ nguyên)
const FEEDBACK_LEVELS = {
  VERY_POSITIVE: 'very_positive',  
  POSITIVE: 'positive',          
  NEUTRAL: 'neutral',             
  NEGATIVE: 'negative',            
  VERY_NEGATIVE: 'very_negative',  
};

// Loại tương tác có thể có (giữ nguyên)
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
  // THAY ĐỔI: Sử dụng SessionStorageService
  static async saveInteraction(interaction) {
    try {
      const validInteraction = {
        id: interaction.id || `interaction_${Date.now()}`,
        timestamp: interaction.timestamp || new Date().toISOString(),
        type: interaction.type || INTERACTION_TYPES.RECOMMENDATION_GIVEN,
        content: interaction.content || {},
        context: interaction.context || {},
      };

      const currentHistory = await SessionStorageService.getInteractionHistory();
      const updatedHistory = [validInteraction, ...currentHistory];
      const limitedHistory = updatedHistory.slice(0, 100);
      
      await SessionStorageService.saveInteractionHistory(limitedHistory);
      
      if (interaction.updateUserContext) {
        await this.updateUserContext(interaction.updateUserContext);
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu lịch sử tương tác:', error);
      return false;
    }
  }

  // THAY ĐỔI: Sử dụng SessionStorageService
  static async getInteractionHistory() {
    return await SessionStorageService.getInteractionHistory();
  }

  // THAY ĐỔI: Sử dụng SessionStorageService
  static async saveRecommendationFeedback(recommendationId, feedback) {
    try {
      const currentFeedback = await SessionStorageService.getRecommendationFeedback();
      
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
        overallScore: this._calculateOverallScore(
          feedback.level,
          currentFeedback[recommendationId]?.overallScore
        ),
        usageCount: (currentFeedback[recommendationId]?.usageCount || 0) + 1,
        successCount: (currentFeedback[recommendationId]?.successCount || 0) + 
                      (feedback.success === true ? 1 : 0),
      };
      
      if (newFeedbackEntry.usageCount > 0) {
        newFeedbackEntry.successRate = newFeedbackEntry.successCount / 
                                       newFeedbackEntry.usageCount;
      }
      
      const updatedFeedback = {
        ...currentFeedback,
        [recommendationId]: newFeedbackEntry,
      };
      
      await SessionStorageService.saveRecommendationFeedback(updatedFeedback);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi đề xuất:', error);
      return false;
    }
  }

  // THAY ĐỔI: Sử dụng SessionStorageService
  static async getRecommendationFeedback() {
    return await SessionStorageService.getRecommendationFeedback();
  }

  // THAY ĐỔI: Sử dụng SessionStorageService
  static async updateUserContext(contextUpdates) {
    try {
      const currentContext = await SessionStorageService.getUserPreferences();
      
      const updatedContext = {
        ...currentContext,
        ...contextUpdates,
        lastUpdated: new Date().toISOString(),
      };
      
      await SessionStorageService.saveUserPreferences(updatedContext);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật ngữ cảnh người dùng:', error);
      return false;
    }
  }

  // THAY ĐỔI: Sử dụng SessionStorageService
  static async getUserContext() {
    try {
      const context = await SessionStorageService.getUserPreferences();
      return context.lastUpdated ? context : {
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

  // Các phương thức helper giữ nguyên
  static _calculateOverallScore(newFeedbackLevel, currentScore = 0) {
    const feedbackValues = {
      [FEEDBACK_LEVELS.VERY_POSITIVE]: 1,
      [FEEDBACK_LEVELS.POSITIVE]: 0.5,
      [FEEDBACK_LEVELS.NEUTRAL]: 0,
      [FEEDBACK_LEVELS.NEGATIVE]: -0.5,
      [FEEDBACK_LEVELS.VERY_NEGATIVE]: -1,
    };
    
    const newFeedbackWeight = 0.7;
    const currentScoreWeight = 0.3;
    
    const newValue = feedbackValues[newFeedbackLevel] || 0;
    
    if (currentScore === 0 && newValue === 0) {
      return 0;
    } else if (currentScore === 0) {
      return newValue;
    }
    
    return (newValue * newFeedbackWeight) + (currentScore * currentScoreWeight);
  }

  static async analyzeUserSentiment() {
    try {
      const recentInteractions = (await this.getInteractionHistory()).slice(0, 10);
      
      const interactionCounts = recentInteractions.reduce((counts, interaction) => {
        counts[interaction.type] = (counts[interaction.type] || 0) + 1;
        return counts;
      }, {});
      
      const positiveInteractions = (interactionCounts[INTERACTION_TYPES.USER_REPORTED_SUCCESS] || 0) + 
                                   (interactionCounts[INTERACTION_TYPES.USER_EXPRESSED_GRATITUDE] || 0) +
                                   (interactionCounts[INTERACTION_TYPES.RECOMMENDATION_ACCEPTED] || 0);
                                   
      const negativeInteractions = (interactionCounts[INTERACTION_TYPES.USER_REPORTED_FAILURE] || 0) + 
                                   (interactionCounts[INTERACTION_TYPES.USER_EXPRESSED_CONFUSION] || 0) +
                                   (interactionCounts[INTERACTION_TYPES.RECOMMENDATION_REJECTED] || 0);
                                   
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