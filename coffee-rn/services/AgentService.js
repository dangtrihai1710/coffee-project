
import { InteractionMemoryService, INTERACTION_TYPES, FEEDBACK_LEVELS } from './InteractionMemoryService';
import StorageService from './StorageService';
import diseaseData from '../utils/diseaseData';

// Định nghĩa các hằng số
const AGENT_TYPES = {
  ANALYZER: 'analysis',    // Agent phân tích dữ liệu
  ADVISOR: 'treatment',    // Agent tư vấn điều trị
  SYSTEM: 'system',        // Agent hệ thống
  ERROR: 'error'           // Thông báo lỗi
};

// Định nghĩa ID cho các đề xuất
const RECOMMENDATION_IDS = {
  RUST_TREATMENT: 'rec_rust_treatment',
  MINER_TREATMENT: 'rec_miner_treatment',
  PHOMA_TREATMENT: 'rec_phoma_treatment',
  CERCOSPORA_TREATMENT: 'rec_cercospora_treatment',
  WATERING_TECHNIQUE: 'rec_watering_technique',
  PRUNING_TECHNIQUE: 'rec_pruning_technique',
  FERTILIZER_APPLICATION: 'rec_fertilizer_application',
  PREVENTIVE_MEASURES: 'rec_preventive_measures',
  SCAN_ANALYSIS: 'rec_scan_analysis',
};

// Định nghĩa từ khóa đối với nội dung
const KEYWORDS = {
  RUST: ['gỉ sắt', 'rust', 'hemileia', 'gỉ', 'sắt'],
  MINER: ['miner', 'sâu đục lá', 'đục lá', 'sâu'],
  PHOMA: ['phoma', 'đốm đen', 'phoma leaf', 'đốm'],
  CERCOSPORA: ['cercospora', 'đốm nâu', 'brown eye', 'brown spot', 'đốm lá'],
  WATERING: ['tưới', 'nước', 'water', 'irrigation'],
  PRUNING: ['cắt tỉa', 'tỉa cành', 'pruning', 'tỉa'],
  FERTILIZER: ['phân bón', 'bón phân', 'phân', 'fertilizer'],
  PREVENT: ['phòng ngừa', 'ngăn ngừa', 'phòng bệnh', 'prevention'],
  PEST: ['sâu', 'côn trùng', 'pest', 'insect'],
  SOIL: ['đất', 'soil'],
  CLIMATE: ['khí hậu', 'mùa', 'thời tiết', 'climate', 'weather'],
  HARVEST: ['thu hoạch', 'harvest'],
  SCAN: ['quét', 'scan', 'dữ liệu quét', 'phân tích', 'scan data', 'kết quả quét'],
};

// Dịch vụ Agent
class AgentService {
  /**
   * Xử lý tin nhắn từ người dùng
   * @param {string} message - Tin nhắn từ người dùng
   * @param {object} context - Ngữ cảnh (lịch sử chat, lịch sử quét, v.v.)
   * @returns {object} - Phản hồi dựa trên tin nhắn
   */
  static async processMessage(message, context = {}) {
    try {
      // Phân tích ý định người dùng
      const intent = this._analyzeUserIntent(message);
      
      // Tìm phản hồi phù hợp dựa trên ý định
      let response;
      
      // Phân tích dữ liệu quét
      if (intent.topics.includes('scan')) {
        response = await this.analyzeScanData(context);
      }
      // Thông tin về bệnh và kỹ thuật
      else {
        response = await this._generateResponse(message, context, intent);
      }
      
      // Lưu tương tác này
      await InteractionMemoryService.saveInteraction({
        type: INTERACTION_TYPES.RECOMMENDATION_GIVEN,
        content: {
          userMessage: message,
          response,
          intent
        },
        context: context
      });
      
      return response;
    } catch (error) {
      console.error('Lỗi khi xử lý tin nhắn:', error);
      return {
        message: 'Tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        type: AGENT_TYPES.ERROR
      };
    }
  }
  
  /**
   * Phân tích dữ liệu quét
   * @param {object} context - Ngữ cảnh chứa thông tin quét
   * @returns {object} - Phản hồi về phân tích
   */
  static async analyzeScanData(context = {}) {
    try {
      const { scanHistory = [], historyStats = {} } = context;
      
      if (!scanHistory || scanHistory.length === 0) {
        return {
          message: "Tôi không tìm thấy dữ liệu quét nào. Vui lòng quét một số lá cà phê trước khi yêu cầu phân tích.",
          type: AGENT_TYPES.ANALYZER
        };
      }
      
      // Tạo phân tích dữ liệu quét
      let analysisText = "**Phân tích dữ liệu quét lá cà phê của bạn**\n\n";
      
      // Tổng quan
      analysisText += `Tôi đã phân tích ${scanHistory.length} mẫu lá cà phê từ dữ liệu quét của bạn.\n\n`;
      analysisText += `📊 **Tổng quan sức khỏe vườn cây:**\n`;
      
      // Tính toán các giá trị phần trăm
      const healthyPercent = Math.round(historyStats.healthyTrees/scanHistory.length*100);
      const diseasedPercent = Math.round(historyStats.diseasedTrees/scanHistory.length*100);
      
      analysisText += `• Cây khỏe mạnh: ${historyStats.healthyTrees} mẫu (${healthyPercent}%)\n`;
      analysisText += `• Cây có bệnh: ${historyStats.diseasedTrees} mẫu (${diseasedPercent}%)\n\n`;
      
      // Chi tiết các loại bệnh nếu có
      if (historyStats.diseasedTrees > 0 && Object.keys(historyStats.diseases || {}).length > 0) {
        analysisText += `🔍 **Chi tiết các loại bệnh phát hiện:**\n`;
        Object.entries(historyStats.diseases).forEach(([disease, count]) => {
          const percentage = Math.round((count / scanHistory.length) * 100);
          analysisText += `• ${disease}: ${count} mẫu (${percentage}%)\n`;
        });
        analysisText += `\n`;
        
        // Đề xuất xử lý cho bệnh phổ biến nhất
        const mostCommonDisease = Object.entries(historyStats.diseases)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        analysisText += `⚠️ **Cảnh báo và đề xuất:**\n`;
        
        if (mostCommonDisease === 'Gỉ sắt') {
          analysisText += `Bệnh gỉ sắt đang là vấn đề chính trong vườn cây của bạn. Đây là loại bệnh nấm phổ biến trên cây cà phê và có thể lây lan nhanh chóng trong điều kiện ẩm ướt.\n\n`;
          analysisText += `**Đề xuất xử lý:**\n`;
          analysisText += `1. Phun thuốc fungicide chứa đồng (copper) hoặc mancozeb theo hướng dẫn\n`;
          analysisText += `2. Cắt tỉa các cành bị bệnh nặng và tiêu hủy\n`;
          analysisText += `3. Cải thiện thông gió trong vườn bằng cách cắt tỉa thích hợp\n`;
          analysisText += `4. Kiểm soát độ ẩm, tránh tưới quá nhiều và tưới vào gốc thay vì lá\n`;
        } 
        else if (mostCommonDisease === 'Phoma') {
          analysisText += `Bệnh phoma đang là vấn đề chính trong vườn cây của bạn. Bệnh này thường xuất hiện trong điều kiện nhiệt độ thấp và ẩm ướt.\n\n`;
          analysisText += `**Đề xuất xử lý:**\n`;
          analysisText += `1. Phun thuốc fungicide chứa azoxystrobin hoặc copper oxychloride\n`;
          analysisText += `2. Cắt tỉa và loại bỏ các bộ phận bị nhiễm bệnh\n`;
          analysisText += `3. Cải thiện thoát nước trong vườn\n`;
          analysisText += `4. Bón phân cân đối để tăng sức đề kháng cho cây\n`;
        }
        else if (mostCommonDisease === 'Miner') {
          analysisText += `Bệnh miner (sâu đục lá) đang là vấn đề chính trong vườn cây của bạn. Đây là loài côn trùng tấn công lá cà phê và tạo các đường hầm bên trong lá.\n\n`;
          analysisText += `**Đề xuất xử lý:**\n`;
          analysisText += `1. Sử dụng thuốc trừ sâu hệ thống chứa imidacloprid hoặc thiamethoxam\n`;
          analysisText += `2. Thả các thiên địch như ong ký sinh để kiểm soát tự nhiên\n`;
          analysisText += `3. Loại bỏ và tiêu hủy lá bị nhiễm nặng\n`;
          analysisText += `4. Giám sát thường xuyên để phát hiện sớm\n`;
        }
        else if (mostCommonDisease === 'Cerco') {
          analysisText += `Bệnh đốm lá Cercospora đang là vấn đề chính trong vườn cây của bạn. Bệnh này thường liên quan đến tình trạng thiếu dinh dưỡng của cây.\n\n`;
          analysisText += `**Đề xuất xử lý:**\n`;
          analysisText += `1. Phun thuốc trừ nấm chứa copper hoặc mancozeb\n`;
          analysisText += `2. Cải thiện dinh dưỡng cây trồng, đặc biệt là bổ sung đạm và kali\n`;
          analysisText += `3. Tăng cường thoát nước để giảm độ ẩm\n`;
          analysisText += `4. Cắt tỉa để cải thiện thông gió\n`;
        }
        else {
          analysisText += `Có nhiều loại bệnh khác nhau trong vườn cây của bạn. Nên kiểm tra kỹ từng khu vực và có biện pháp xử lý phù hợp.\n\n`;
          analysisText += `**Đề xuất xử lý:**\n`;
          analysisText += `1. Phun thuốc trừ nấm phổ rộng định kỳ\n`;
          analysisText += `2. Cải thiện điều kiện canh tác: thoát nước, ánh sáng, thông gió\n`;
          analysisText += `3. Cắt tỉa và loại bỏ các bộ phận bị nhiễm bệnh\n`;
          analysisText += `4. Bón phân cân đối để tăng sức đề kháng cho cây\n`;
        }
      } else if (historyStats.healthyTrees === scanHistory.length) {
        analysisText += `✅ **Nhận xét:**\n`;
        analysisText += `Tất cả các mẫu lá đều khỏe mạnh! Vườn cây của bạn đang trong tình trạng tốt.\n\n`;
        analysisText += `**Đề xuất chăm sóc:**\n`;
        analysisText += `1. Tiếp tục duy trì chế độ chăm sóc hiện tại\n`;
        analysisText += `2. Thực hiện phun thuốc phòng bệnh định kỳ trước mùa mưa\n`;
        analysisText += `3. Bón phân cân đối theo đúng lịch\n`;
        analysisText += `4. Thực hiện cắt tỉa định kỳ để thông thoáng vườn cây\n`;
      }
      
      analysisText += `\nBạn có thể hỏi tôi thêm để biết chi tiết về cách xử lý cụ thể cho từng loại bệnh.`;
      
      // Tạo dữ liệu bổ sung cho phân tích - biểu đồ đơn giản
      const chartData = {
        healthy: historyStats.healthyTrees,
        diseased: historyStats.diseasedTrees,
        diseases: historyStats.diseases || {}
      };
      
      return {
        message: analysisText,
        type: AGENT_TYPES.ANALYZER,
        recommendationId: RECOMMENDATION_IDS.SCAN_ANALYSIS,
        data: chartData
      };
    } catch (error) {
      console.error('Lỗi khi phân tích dữ liệu quét:', error);
      return {
        message: 'Xin lỗi, tôi gặp sự cố khi phân tích dữ liệu quét của bạn. Vui lòng thử lại sau.',
        type: AGENT_TYPES.ERROR
      };
    }
  }
  
  /**
   * Lưu phản hồi của người dùng về đề xuất
   * @param {string} recommendationId - ID của đề xuất
   * @param {object} feedback - Phản hồi của người dùng
   * @param {string} conversationId - ID cuộc trò chuyện
   * @returns {boolean} - Kết quả lưu
   */
  static async saveFeedback(recommendationId, feedback, conversationId = '') {
    try {
      // Thêm conversationId vào feedback để dễ theo dõi
      const enhancedFeedback = {
        ...feedback,
        conversationId
      };
      
      // Lưu phản hồi
      await InteractionMemoryService.saveRecommendationFeedback(
        recommendationId, 
        enhancedFeedback
      );
      
      // Lưu tương tác
      const interactionType = feedback.success
        ? INTERACTION_TYPES.USER_REPORTED_SUCCESS
        : INTERACTION_TYPES.USER_REPORTED_FAILURE;
          
      await InteractionMemoryService.saveInteraction({
        type: interactionType,
        content: {
          recommendationId,
          feedback: enhancedFeedback
        }
      });
      
      // Cập nhật ngữ cảnh người dùng
      const contextUpdate = {};
      
      if (feedback.success) {
        contextUpdate.successfulTreatments = [recommendationId];
      } else {
        contextUpdate.unsuccessfulTreatments = [recommendationId];
      }
      
      await InteractionMemoryService.updateUserContext(contextUpdate);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi:', error);
      return false;
    }
  }
  
  /**
   * Tạo phản hồi dựa trên ý định người dùng
   * @param {string} message - Tin nhắn từ người dùng
   * @param {object} context - Ngữ cảnh
   * @param {object} intent - Ý định đã phân tích từ trước
   * @returns {object} - Phản hồi chi tiết
   * @private
   */
  static async _generateResponse(message, context = {}, intent = null) {
    try {
      if (!intent) {
        intent = this._analyzeUserIntent(message);
      }
      
      // Dựa vào chủ đề chính để tạo nội dung chi tiết
      let response = '';
      let recommendationId = null;
      let responseType = AGENT_TYPES.ADVISOR;
      
      if (intent.topics.includes('disease')) {
        // Phản hồi về bệnh
        const diseaseResult = await this._generateDiseaseResponse(
          intent.specificDisease,
          context
        );
        response = diseaseResult.response;
        recommendationId = diseaseResult.recommendationId;
      } else if (intent.topics.includes('technique')) {
        // Phản hồi về kỹ thuật
        const techniqueResult = await this._generateTechniqueResponse(
          intent.specificTechnique,
          context
        );
        response = techniqueResult.response;
        recommendationId = techniqueResult.recommendationId;
      } else {
        // Phản hồi chung về chăm sóc cây
        response = this._generateGeneralResponse();
      }
      
      return {
        message: response,
        type: responseType,
        recommendationId: recommendationId
      };
    } catch (error) {
      console.error('Lỗi khi tạo phản hồi:', error);
      return {
        message: 'Tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        type: AGENT_TYPES.ERROR
      };
    }
  }
  
  /**
   * Phân tích ý định của người dùng
   * @param {string} message - Tin nhắn từ người dùng
   * @returns {object} - Thông tin về ý định
   * @private
   */
  static _analyzeUserIntent(message) {
    // Chuyển đổi input thành chữ thường để dễ so sánh
    const lowerInput = message.toLowerCase();
    
    // Xác định các chủ đề chính
    const topics = [];
    
    // Tìm chủ đề dữ liệu quét
    if (this._containsAnyKeyword(lowerInput, KEYWORDS.SCAN)) {
      topics.push('scan');
    }
    
    // Tìm chủ đề bệnh
    if (this._containsAnyKeyword(lowerInput, KEYWORDS.RUST) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.MINER) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.PHOMA) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.CERCOSPORA) ||
        lowerInput.includes('bệnh') || 
        lowerInput.includes('disease')) {
      topics.push('disease');
    }
    
    // Tìm chủ đề kỹ thuật
    if (this._containsAnyKeyword(lowerInput, KEYWORDS.WATERING) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.PRUNING) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.FERTILIZER) ||
        this._containsAnyKeyword(lowerInput, KEYWORDS.PREVENT) ||
        lowerInput.includes('kỹ thuật') || 
        lowerInput.includes('technique') ||
        lowerInput.includes('cắt tỉa')) {
      topics.push('technique');
    }
    
    // Nếu không có chủ đề cụ thể, đánh dấu là chủ đề chung
    if (topics.length === 0) {
      topics.push('general');
    }
    
    // Xác định bệnh cụ thể
    let specificDisease = null;
    if (this._containsAnyKeyword(lowerInput, KEYWORDS.RUST)) {
      specificDisease = 'rust';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.MINER)) {
      specificDisease = 'miner';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.PHOMA)) {
      specificDisease = 'phoma';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.CERCOSPORA)) {
      specificDisease = 'cercospora';
    }
    
    // Xác định kỹ thuật cụ thể
    let specificTechnique = null;
    if (this._containsAnyKeyword(lowerInput, KEYWORDS.WATERING)) {
      specificTechnique = 'watering';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.PRUNING) ||
                lowerInput.includes('cắt tỉa')) {
      specificTechnique = 'pruning';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.FERTILIZER)) {
      specificTechnique = 'fertilizer';
    } else if (this._containsAnyKeyword(lowerInput, KEYWORDS.PREVENT)) {
      specificTechnique = 'prevention';
    }
    
    return {
      topics,
      specificDisease,
      specificTechnique,
    };
  }
  
  /**
   * Kiểm tra xem input có chứa từ khóa nào không
   * @param {string} input - Chuỗi cần kiểm tra
   * @param {Array} keywords - Danh sách từ khóa
   * @returns {boolean} - Kết quả kiểm tra
   * @private
   */
  static _containsAnyKeyword(input, keywords) {
    return keywords.some(keyword => input.includes(keyword));
  }
  
  /**
   * Tạo phản hồi về bệnh
   * @param {string} diseaseType - Loại bệnh
   * @param {object} context - Ngữ cảnh
   * @returns {object} - Phản hồi chi tiết và ID đề xuất
   * @private
   */
  static async _generateDiseaseResponse(diseaseType, context = {}) {
    let response = '';
    let recommendationId = null;
    
    // Khai báo các ID đề xuất cho từng bệnh
    const diseaseRecommendationMap = {
      'rust': RECOMMENDATION_IDS.RUST_TREATMENT,
      'miner': RECOMMENDATION_IDS.MINER_TREATMENT,
      'phoma': RECOMMENDATION_IDS.PHOMA_TREATMENT,
      'cercospora': RECOMMENDATION_IDS.CERCOSPORA_TREATMENT,
    };
    
    // Đặt ID đề xuất
    if (diseaseType && diseaseRecommendationMap[diseaseType]) {
      recommendationId = diseaseRecommendationMap[diseaseType];
    }
    
    // Tìm kiếm trong diseaseData để lấy thông tin chi tiết
    const diseaseInfo = this._findDiseaseInfo(diseaseType);
    
    // Xây dựng nội dung phản hồi
    if (diseaseInfo) {
      // Phần mở đầu
      response = `**${diseaseInfo.name}** (${diseaseInfo.scientificName})\n\n`;
      
      // Thêm triệu chứng
      response += "**Triệu chứng:**\n";
      diseaseInfo.symptoms.forEach((symptom, index) => {
        response += `${index + 1}. ${symptom}\n`;
      });
      response += "\n";
      
      // Thêm phương pháp điều trị
      response += "**Phương pháp điều trị:**\n";
      diseaseInfo.treatments.forEach((treatment, index) => {
        response += `${index + 1}. ${treatment}\n`;
      });
      response += "\n";
      
      // Thêm phương pháp phòng ngừa
      response += "**Phòng ngừa:**\n";
      diseaseInfo.prevention.forEach((prevention, index) => {
        response += `${index + 1}. ${prevention}\n`;
      });
      response += "\n";
      
      // Thêm lưu ý
      response += "**Lưu ý quan trọng:**\n";
      response += "Luôn đọc kỹ hướng dẫn sử dụng thuốc trước khi áp dụng. Phun thuốc trong điều kiện thời tiết phù hợp và tuân thủ liều lượng khuyến cáo.";
    } else {
      if (diseaseType) {
        response = `Rất tiếc, tôi không có thông tin chi tiết về bệnh ${diseaseType}. Vui lòng cung cấp thêm thông tin hoặc hỏi về các bệnh phổ biến khác như gỉ sắt, đốm lá, miner hoặc phoma.`;
      } else {
        response = "Các bệnh phổ biến trên cây cà phê bao gồm bệnh gỉ sắt, đốm lá, miner và phoma. Mỗi bệnh có triệu chứng và cách điều trị khác nhau. Vui lòng nêu rõ bệnh cụ thể để tôi có thể cung cấp thông tin chi tiết.";
      }
    }
    
    // Dựa vào dữ liệu quét để thêm thông tin nếu có
    if (context.scanHistory && context.scanHistory.length > 0 && context.historyStats) {
      // Tìm tỷ lệ bệnh hiện tại nếu trùng khớp loại bệnh đang tìm
      const diseaseName = diseaseType === 'rust' ? 'Gỉ sắt' : 
                          diseaseType === 'miner' ? 'Miner' :
                          diseaseType === 'phoma' ? 'Phoma' :
                          diseaseType === 'cercospora' ? 'Cerco' : null;
      
      if (diseaseName && context.historyStats.diseases && context.historyStats.diseases[diseaseName]) {
        const count = context.historyStats.diseases[diseaseName];
        const percentage = Math.round((count / context.scanHistory.length) * 100);
        
        response += `\n\n**Dữ liệu quét của bạn:**\n`;
        response += `Từ ${context.scanHistory.length} mẫu lá bạn đã quét, có ${count} mẫu (${percentage}%) mắc bệnh ${diseaseName}. `;
        
        if (percentage > 30) {
          response += `Đây là tỷ lệ đáng lo ngại và cần điều trị ngay lập tức.`;
        } else if (percentage > 10) {
          response += `Bạn nên có biện pháp xử lý sớm để ngăn bệnh lây lan.`;
        } else {
          response += `Đây là tỷ lệ thấp, nhưng vẫn nên theo dõi và có biện pháp phòng ngừa.`;
        }
      }
    }
    
    return {
      response,
      recommendationId
    };
  }
  
  /**
   * Tạo phản hồi về kỹ thuật
   * @param {string} techniqueType - Loại kỹ thuật
   * @param {object} context - Ngữ cảnh
   * @returns {object} - Phản hồi chi tiết và ID đề xuất
   * @private
   */
  static async _generateTechniqueResponse(techniqueType, context = {}) {
    let response = '';
    let recommendationId = null;
    
    // Khai báo các ID đề xuất cho từng kỹ thuật
    const techniqueRecommendationMap = {
      'watering': RECOMMENDATION_IDS.WATERING_TECHNIQUE,
      'pruning': RECOMMENDATION_IDS.PRUNING_TECHNIQUE,
      'fertilizer': RECOMMENDATION_IDS.FERTILIZER_APPLICATION,
      'prevention': RECOMMENDATION_IDS.PREVENTIVE_MEASURES,
    };
    
    // Đặt ID đề xuất
    if (techniqueType && techniqueRecommendationMap[techniqueType]) {
      recommendationId = techniqueRecommendationMap[techniqueType];
    }
    
    if (techniqueType === 'watering') {
      response = `**Kỹ thuật tưới nước cho cây cà phê**\n\n`;
      response += "Cây cà phê cần được tưới nước đúng cách để phát triển khỏe mạnh và cho năng suất cao. Dưới đây là các khuyến cáo chi tiết:\n\n";
      
      response += "**Nhu cầu nước:**\n";
      response += "1. Cây cà phê cần khoảng 1500-2000mm nước/năm\n";
      response += "2. Trong mùa khô, tưới 15-20 lít nước/cây/lần, 2-3 lần/tháng\n";
      response += "3. Giảm tưới trong thời kỳ cây nghỉ ngơi sau thu hoạch\n";
      response += "4. Tăng cường tưới trong giai đoạn ra hoa và kết quả\n\n";
      
      response += "**Cách tưới hiệu quả:**\n";
      response += "1. Tưới vào sáng sớm hoặc chiều tối, tránh tưới buổi trưa\n";
      response += "2. Tưới gốc, tránh làm ướt lá và cành để giảm nguy cơ bệnh nấm\n";
      response += "3. Sử dụng phương pháp tưới nhỏ giọt sẽ tiết kiệm nước và hiệu quả hơn\n";
      response += "4. Tưới đều quanh gốc với bán kính bằng tán cây\n\n";
      
      response += "**Lưu ý quan trọng:**\n";
      response += "• Không tưới quá nhiều trong mùa mưa để tránh gây bệnh\n";
      response += "• Kiểm tra độ ẩm đất trước khi tưới: lấy một nắm đất ở độ sâu 10cm, nếu vò được thành viên thì độ ẩm đủ\n";
      response += "• Nếu sử dụng hệ thống tưới nhỏ giọt, kiểm tra thường xuyên để tránh tắc nghẽn\n";
      response += "• Điều chỉnh lịch tưới theo điều kiện thời tiết thực tế";
      
    } else if (techniqueType === 'pruning') {
      response = `**Kỹ thuật cắt tỉa cây cà phê**\n\n`;
      response += "Cắt tỉa đúng cách giúp tăng năng suất, giảm bệnh hại và kéo dài tuổi thọ cây cà phê. Chi tiết như sau:\n\n";
      
      response += "**Thời điểm cắt tỉa:**\n";
      response += "1. Thời điểm lý tưởng: sau thu hoạch và trước mùa mưa\n";
      response += "2. Tránh cắt tỉa trong mùa khô nặng hoặc khi cây đang ra hoa\n";
      response += "3. Cắt tỉa nhẹ có thể thực hiện quanh năm khi cần thiết\n\n";
      
      response += "**Các loại cành cần cắt bỏ:**\n";
      response += "1. Cành già cỗi, không còn khả năng sinh trưởng tốt\n";
      response += "2. Cành bị bệnh, bị sâu hại\n";
      response += "3. Cành đan chéo, mọc vào trong tán\n";
      response += "4. Cành vượt, cành thứ cấp quá dài\n";
      response += "5. Cành mọc sát mặt đất\n\n";
      
      response += "**Kỹ thuật cắt tỉa:**\n";
      response += "1. Sử dụng dụng cụ sắc, sạch để tránh lây bệnh\n";
      response += "2. Cắt vát 45 độ, cách chỗ phân nhánh 0.5-1cm\n";
      response += "3. Giữ cành có gốc chữ V (chắc khỏe) và loại bỏ cành chữ U (dễ gãy)\n";
      response += "4. Tỉa ngọn để kiểm soát chiều cao cây, thuận tiện cho thu hái\n\n";
      
      response += "**Sau khi cắt tỉa:**\n";
      response += "• Bôi thuốc bảo vệ vết cắt lớn để tránh nấm bệnh xâm nhập\n";
      response += "• Bón phân bổ sung giúp cây phục hồi nhanh hơn\n";
      response += "• Thu gom và tiêu hủy cành cắt tỉa để tránh lây lan dịch bệnh";
      
    } else if (techniqueType === 'fertilizer') {
      response = `**Kỹ thuật bón phân cho cây cà phê**\n\n`;
      response += "Bón phân đúng cách giúp cây sinh trưởng khỏe mạnh, tăng năng suất và nâng cao chất lượng cà phê. Hướng dẫn chi tiết:\n\n";
      
      response += "**Nhu cầu dinh dưỡng:**\n";
      response += "1. Đạm (N): Cần thiết cho sự phát triển của lá và tăng trưởng\n";
      response += "2. Lân (P): Giúp phát triển rễ và ra hoa\n";
      response += "3. Kali (K): Tăng cường sức đề kháng và chất lượng quả\n";
      response += "4. Canxi, Magie và vi lượng: Thiết yếu cho các quá trình sinh lý\n\n";
      
      response += "**Lịch bón phân theo giai đoạn:**\n";
      response += "1. Thời kỳ sinh trưởng: NPK tỷ lệ 20:10:10, chú trọng đạm\n";
      response += "2. Thời kỳ ra hoa: NPK tỷ lệ 15:15:20, tăng lân\n";
      response += "3. Thời kỳ phát triển quả: NPK tỷ lệ 10:5:25, tăng kali\n";
      response += "4. Sau thu hoạch: Phân hữu cơ + NPK cân đối\n\n";
      
      response += "**Kỹ thuật bón phân:**\n";
      response += "1. Bón vào rãnh xung quanh tán cây, cách gốc 30-50cm\n";
      response += "2. Độ sâu rãnh 5-10cm tùy loại phân\n";
      response += "3. Lấp phân kỹ và tưới đẫm sau khi bón\n";
      response += "4. Chia nhỏ liều lượng thành 2-3 lần/năm\n\n";
      
      response += "**Liều lượng tham khảo (cho cây trưởng thành):**\n";
      response += "• Phân NPK: 0.6-1kg/cây/năm\n";
      response += "• Phân hữu cơ: 5-10kg/cây/năm\n";
      response += "• Vôi bột (nếu đất chua): 0.5-1kg/cây/năm\n\n";
      
      response += "**Lưu ý:**\n";
      response += "• Không bón phân khi đất quá khô hoặc quá ướt\n";
      response += "• Điều chỉnh liều lượng theo tuổi cây và tình trạng đất\n";
      response += "• Kết hợp phân hữu cơ và vô cơ để cân bằng dinh dưỡng";
      
    } else if (techniqueType === 'prevention') {
      response = `**Biện pháp phòng ngừa bệnh cho cây cà phê**\n\n`;
      response += "Phòng bệnh hiệu quả sẽ giúp giảm thiểu chi phí và công sức điều trị. Các biện pháp phòng ngừa toàn diện bao gồm:\n\n";
      
      response += "**Lựa chọn giống và kỹ thuật trồng:**\n";
      response += "1. Trồng giống kháng bệnh phù hợp với điều kiện địa phương\n";
      response += "2. Duy trì khoảng cách trồng thích hợp: 2x2m cho Arabica, 3x3m cho Robusta\n";
      response += "3. Trồng xen cây che bóng hợp lý, không quá dày\n";
      response += "4. Tạo hệ thống thoát nước tốt trong vườn\n\n";
      
      response += "**Chăm sóc thường xuyên:**\n";
      response += "1. Cắt tỉa thông thoáng, loại bỏ cành yếu và bệnh\n";
      response += "2. Bón phân cân đối, tăng cường kali để cây khỏe mạnh\n";
      response += "3. Kiểm soát cỏ dại để giảm độ ẩm và cạnh tranh dinh dưỡng\n";
      response += "4. Tưới nước hợp lý, tránh làm ướt lá quá lâu\n\n";
      
      response += "**Phòng trừ tổng hợp:**\n";
      response += "1. Phun thuốc phòng ngừa trước mùa mưa\n";
      response += "2. Xen canh cây họ đậu để cải thiện đất\n";
      response += "3. Sử dụng bẫy côn trùng và thuốc sinh học\n";
      response += "4. Thả thiên địch kiểm soát sâu bệnh\n\n";
      
      response += "**Giám sát và phát hiện sớm:**\n";
      response += "1. Kiểm tra vườn thường xuyên, 1-2 lần/tuần\n";
      response += "2. Quan sát kỹ lá non và mặt dưới lá\n";
      response += "3. Loại bỏ và tiêu hủy lá bị bệnh\n";
      response += "4. Ghi chép diễn biến để có biện pháp phù hợp\n\n";
      
      response += "**Điều kiện vệ sinh:**\n";
      response += "• Khử trùng dụng cụ cắt tỉa trước khi sử dụng\n";
      response += "• Thu gom và xử lý lá rụng, cành cắt tỉa\n";
      response += "• Tránh di chuyển từ vùng bị bệnh sang vùng khỏe mạnh";
      
    } else {
      response = "Tôi có thể cung cấp thông tin chi tiết về các kỹ thuật chăm sóc cây cà phê như tưới nước, cắt tỉa, bón phân, và phòng ngừa bệnh. Vui lòng cho biết bạn muốn tìm hiểu về kỹ thuật cụ thể nào.";
    }
    
    // Kết hợp với dữ liệu quét nếu liên quan
    if (context.scanHistory && context.scanHistory.length > 0 && context.historyStats && techniqueType === 'prevention') {
      // Thêm thông tin nếu có nhiều cây bệnh
      if (context.historyStats.diseasedTrees > 0) {
        const percentage = Math.round((context.historyStats.diseasedTrees / context.scanHistory.length) * 100);
        
        response += `\n\n**Dựa trên dữ liệu quét của bạn:**\n`;
        response += `Vườn cây của bạn hiện có ${percentage}% lá bị bệnh. `;
        
        if (Object.keys(context.historyStats.diseases || {}).length > 0) {
          // Lấy bệnh phổ biến nhất
          const mostCommonDisease = Object.entries(context.historyStats.diseases)
            .sort((a, b) => b[1] - a[1])[0][0];
          
          response += `Bệnh ${mostCommonDisease} là vấn đề chính, bạn nên ưu tiên các biện pháp phòng ngừa đã đề cập ở trên, đặc biệt là việc cắt tỉa thông thoáng và phun thuốc phòng ngừa.`;
        }
      }
    }
    
    return {
      response,
      recommendationId
    };
  }
  
  /**
   * Tạo phản hồi chung
   * @returns {string} - Phản hồi chung
   * @private
   */
  static _generateGeneralResponse() {
    let response = `**Hướng dẫn chăm sóc cây cà phê**\n\n`;
    
    response += "Cây cà phê cần được chăm sóc toàn diện để cho năng suất và chất lượng tốt. Dưới đây là những điểm chính bạn cần lưu ý:\n\n";
    
    response += "**1. Điều kiện trồng:**\n";
    response += "• Nhiệt độ thích hợp: 18-25°C\n";
    response += "• Lượng mưa: 1500-2000mm/năm, phân bố đều\n";
    response += "• Độ cao: 500-1500m so với mực nước biển\n";
    response += "• Đất tơi xốp, giàu mùn, thoát nước tốt, pH 5.5-6.5\n\n";
    
    response += "**2. Tưới nước:**\n";
    response += "• Tưới đủ nước trong mùa khô\n";
    response += "• Tránh để đất quá ẩm hoặc quá khô\n";
    response += "• Ưu tiên tưới gốc, tránh làm ướt lá\n\n";
    
    response += "**3. Bón phân:**\n";
    response += "• Bón phân hữu cơ làm nền\n";
    response += "• Bổ sung NPK theo tỷ lệ phù hợp với từng giai đoạn\n";
    response += "• Chia nhỏ liều lượng thành nhiều lần bón\n\n";
    
    response += "**4. Cắt tỉa:**\n";
    response += "• Cắt tỉa định kỳ sau thu hoạch\n";
    response += "• Loại bỏ cành yếu, cành bệnh, cành đan chéo\n";
    response += "• Tạo hình cho cây thông thoáng\n\n";
    
    response += "**5. Phòng trừ sâu bệnh:**\n";
    response += "• Kiểm tra vườn thường xuyên\n";
    response += "• Loại bỏ bộ phận bị bệnh\n";
    response += "• Phun thuốc phòng ngừa trước mùa mưa\n";
    response += "• Sử dụng thuốc đúng liều lượng và thời điểm\n\n";
    
    response += "**6. Thu hoạch và bảo quản:**\n";
    response += "• Thu hái quả chín\n";
    response += "• Chế biến đúng cách để đảm bảo chất lượng\n";
    response += "• Bảo quản nơi khô ráo, thoáng mát\n\n";
    
    response += "Nếu bạn cần thông tin chi tiết về một khía cạnh cụ thể, hãy cho tôi biết để tôi có thể giúp bạn hiệu quả hơn.";
    
    return response;
  }
  
  /**
   * Tìm thông tin bệnh từ diseaseData
   * @param {string} diseaseType - Loại bệnh
   * @returns {object|null} - Thông tin bệnh
   * @private
   */
  static _findDiseaseInfo(diseaseType) {
    if (!diseaseType) return null;
    
    // Ánh xạ tên bệnh tiếng Anh sang tên bệnh trong dữ liệu
// Ánh xạ tên bệnh tiếng Anh sang tên bệnh trong dữ liệu
const diseaseMap = {
  'rust': 'Bệnh gỉ sắt',
  'miner': 'Bệnh miner',
  'phoma': 'Bệnh phoma',
  'cercospora': 'Bệnh đốm lá'
};

const diseaseNameToFind = diseaseMap[diseaseType];
if (!diseaseNameToFind) return null;

// Tìm trong dữ liệu diseaseData
return diseaseData.find(disease => 
  disease.name.includes(diseaseNameToFind)
);
}
}

export default AgentService;