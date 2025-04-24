// services/AgentSystem.js
import { InteractionMemoryService, INTERACTION_TYPES, FEEDBACK_LEVELS } from './InteractionMemoryService';
import StorageService from './StorageService';
import diseaseData from '../utils/diseaseData';

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
};

// Định nghĩa từ khóa đối với nội dung
const KEYWORDS = {
  RUST: ['gỉ sắt', 'rust', 'hemileia'],
  MINER: ['miner', 'sâu đục lá', 'đục lá'],
  PHOMA: ['phoma', 'đốm đen', 'phoma leaf'],
  CERCOSPORA: ['cercospora', 'đốm nâu', 'brown eye', 'brown spot', 'đốm lá'],
  WATERING: ['tưới', 'nước', 'water', 'irrigation'],
  PRUNING: ['cắt tỉa', 'tỉa cành', 'pruning'],
  FERTILIZER: ['phân bón', 'bón phân', 'phân', 'fertilizer'],
  PREVENT: ['phòng ngừa', 'ngăn ngừa', 'phòng bệnh', 'prevention'],
  PEST: ['sâu', 'côn trùng', 'pest', 'insect'],
  SOIL: ['đất', 'soil'],
  CLIMATE: ['khí hậu', 'mùa', 'thời tiết', 'climate', 'weather'],
  HARVEST: ['thu hoạch', 'harvest'],
};

// Hệ thống Agent
class AgentSystem {
  /**
   * Điều phối Agent - agent chính để phân tích yêu cầu và điều phối các agent khác
   * @param {string} userInput - Yêu cầu của người dùng
   * @param {object} context - Ngữ cảnh (lịch sử chat, lịch sử quét, etc.)
   * @returns {object} - Phản hồi từ agent phù hợp
   */
  static async coordinateAgents(userInput, context = {}) {
    try {
      // Phân tích yêu cầu của người dùng
      const intent = this._analyzeUserIntent(userInput);
      
      // Dựa vào ý định để chọn agent phù hợp
      let response;
      
      if (intent.requiresSummary) {
        // Sử dụng SummaryAgent cho các yêu cầu tóm tắt
        response = await this.summarizeInformation(userInput, context, intent);
      } else {
        // Sử dụng DetailAgent cho các yêu cầu chi tiết
        response = await this.provideDetailedResponse(userInput, context, intent);
      }
      
      // Lưu tương tác này
      await InteractionMemoryService.saveInteraction({
        type: INTERACTION_TYPES.RECOMMENDATION_GIVEN,
        content: {
          userInput,
          response,
          intent
        },
        context: context
      });
      
      return response;
    } catch (error) {
      console.error('Lỗi khi điều phối agents:', error);
      return {
        message: 'Tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        isError: true,
      };
    }
  }
  
  /**
   * Agent Tóm Tắt - chuyên cung cấp thông tin tóm tắt
   * @param {string} userInput - Yêu cầu của người dùng
   * @param {object} context - Ngữ cảnh
   * @param {object} intent - Ý định đã phân tích từ trước
   * @returns {object} - Phản hồi tóm tắt
   */
  static async summarizeInformation(userInput, context = {}, intent = null) {
    try {
      if (!intent) {
        intent = this._analyzeUserIntent(userInput);
      }
      
      // Lấy ngữ cảnh người dùng để điều chỉnh phản hồi
      const userContext = await InteractionMemoryService.getUserContext();
      
      // Phân tích lịch sử quét nếu có
      let scanSummary = '';
      if (context.scanHistory && context.scanHistory.length > 0) {
        scanSummary = this._generateScanHistorySummary(context.scanHistory);
      }
      
      // Dựa vào chủ đề chính để tạo nội dung tóm tắt
      let summary = '';
      
      if (intent.topics.includes('disease')) {
        // Tóm tắt về bệnh
        summary = this._generateDiseaseSummary(intent.specificDisease);
      } else if (intent.topics.includes('technique')) {
        // Tóm tắt về kỹ thuật
        summary = this._generateTechniqueSummary(intent.specificTechnique);
      } else if (intent.topics.includes('general')) {
        // Tóm tắt chung về chăm sóc cây
        summary = this._generateGeneralSummary();
      } else {
        // Tóm tắt mặc định
        summary = 'Tôi có thể giúp bạn với các vấn đề liên quan đến chăm sóc cây cà phê. Hãy cho tôi biết bạn cần tư vấn về vấn đề gì?';
      }
      
      // Kết hợp với lịch sử quét nếu có
      if (scanSummary) {
        summary = `${summary}\n\n${scanSummary}`;
      }
      
      const response = {
        message: summary,
        type: 'summary',
        intent: intent,
      };
      
      return response;
    } catch (error) {
      console.error('Lỗi khi tạo tóm tắt:', error);
      return {
        message: 'Tôi gặp sự cố khi tạo tóm tắt. Vui lòng thử lại.',
        type: 'summary',
        isError: true,
      };
    }
  }
  
  /**
   * Agent Chi Tiết - chuyên cung cấp thông tin chi tiết và đề xuất
   * @param {string} userInput - Yêu cầu của người dùng
   * @param {object} context - Ngữ cảnh
   * @param {object} intent - Ý định đã phân tích từ trước
   * @returns {object} - Phản hồi chi tiết
   */
  static async provideDetailedResponse(userInput, context = {}, intent = null) {
    try {
      if (!intent) {
        intent = this._analyzeUserIntent(userInput);
      }
      
      // Lấy ngữ cảnh người dùng
      const userContext = await InteractionMemoryService.getUserContext();
      
      // Lấy phản hồi trước đây về các đề xuất
      const previousFeedback = await InteractionMemoryService.getRecommendationFeedback();
      
      // Xác định phong cách phản hồi dựa trên ngữ cảnh người dùng
      const responseStyle = userContext.preferredDetailLevel || 'medium';
      
      // Tạo phản hồi chi tiết
      let detailedResponse = '';
      let recommendationId = null;
      
      // Dựa vào chủ đề chính để tạo nội dung chi tiết
      if (intent.topics.includes('disease')) {
        // Phản hồi về bệnh
        const diseaseResult = await this._generateDiseaseDetailedResponse(
          intent.specificDisease,
          userContext,
          previousFeedback,
          responseStyle
        );
        detailedResponse = diseaseResult.response;
        recommendationId = diseaseResult.recommendationId;
      } else if (intent.topics.includes('technique')) {
        // Phản hồi về kỹ thuật
        const techniqueResult = await this._generateTechniqueDetailedResponse(
          intent.specificTechnique,
          userContext,
          previousFeedback,
          responseStyle
        );
        detailedResponse = techniqueResult.response;
        recommendationId = techniqueResult.recommendationId;
      } else if (intent.topics.includes('general')) {
        // Phản hồi chung về chăm sóc cây
        detailedResponse = this._generateGeneralDetailedResponse(responseStyle);
      } else {
        // Phản hồi mặc định
        detailedResponse = 'Tôi có thể cung cấp thông tin chi tiết về bệnh cây cà phê, kỹ thuật chăm sóc, và các vấn đề khác. Hãy cho tôi biết bạn cần tư vấn cụ thể về vấn đề gì?';
      }
      
      const response = {
        message: detailedResponse,
        type: 'detailed',
        intent: intent,
        recommendationId: recommendationId,
      };
      
      return response;
    } catch (error) {
      console.error('Lỗi khi tạo phản hồi chi tiết:', error);
      return {
        message: 'Tôi gặp sự cố khi tạo phản hồi chi tiết. Vui lòng thử lại.',
        type: 'detailed',
        isError: true,
      };
    }
  }
  
  /**
   * Lưu phản hồi của người dùng về đề xuất
   * @param {string} recommendationId - ID của đề xuất
   * @param {object} feedback - Phản hồi của người dùng
   * @returns {boolean} - Kết quả lưu
   */
  static async saveFeedback(recommendationId, feedback) {
    try {
      // Lưu phản hồi
      await InteractionMemoryService.saveRecommendationFeedback(recommendationId, feedback);
      
      // Lưu tương tác
      const interactionType = feedback.success
        ? INTERACTION_TYPES.USER_REPORTED_SUCCESS
        : feedback.level === FEEDBACK_LEVELS.NEGATIVE || feedback.level === FEEDBACK_LEVELS.VERY_NEGATIVE
          ? INTERACTION_TYPES.USER_REPORTED_FAILURE
          : INTERACTION_TYPES.RECOMMENDATION_ACCEPTED;
          
      await InteractionMemoryService.saveInteraction({
        type: interactionType,
        content: {
          recommendationId,
          feedback
        }
      });
      
      // Cập nhật ngữ cảnh người dùng
      const contextUpdate = {};
      
      if (feedback.success) {
        contextUpdate.successfulTreatments = [recommendationId];
      } else if (feedback.level === FEEDBACK_LEVELS.NEGATIVE || feedback.level === FEEDBACK_LEVELS.VERY_NEGATIVE) {
        contextUpdate.unsuccessfulTreatments = [recommendationId];
      }
      
      if (Object.keys(contextUpdate).length > 0) {
        await InteractionMemoryService.updateUserContext(contextUpdate);
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi:', error);
      return false;
    }
  }
  
  /**
   * Cập nhật sở thích người dùng
   * @param {string} detailLevel - Mức độ chi tiết ưa thích (low, medium, high)
   * @returns {boolean} - Kết quả cập nhật
   */
  static async updateUserPreference(detailLevel) {
    try {
      await InteractionMemoryService.updateUserContext({
        preferredDetailLevel: detailLevel
      });
      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật sở thích người dùng:', error);
      return false;
    }
  }
  
  /**
   * Phân tích ý định của người dùng
   * @param {string} userInput - Yêu cầu của người dùng
   * @returns {object} - Thông tin về ý định
   * @private
   */
  static _analyzeUserIntent(userInput) {
    // Chuyển đổi input thành chữ thường để dễ so sánh
    const lowerInput = userInput.toLowerCase();
    
    // Xác định xem người dùng yêu cầu tóm tắt hay chi tiết
    const summaryKeywords = ['tóm tắt', 'tóm lược', 'tổng quan', 'tổng quát', 'ngắn gọn', 'summary'];
    const detailKeywords = ['chi tiết', 'cụ thể', 'đầy đủ', 'detailed'];
    
    const requiresSummary = summaryKeywords.some(keyword => lowerInput.includes(keyword));
    
    // Xác định các chủ đề chính
    const topics = [];
    
    // Tìm chủ đề bệnh
    if (Object.values(KEYWORDS.RUST).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.MINER).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.PHOMA).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.CERCOSPORA).some(k => lowerInput.includes(k)) ||
        lowerInput.includes('bệnh') || lowerInput.includes('disease')) {
      topics.push('disease');
    }
    
    // Tìm chủ đề kỹ thuật
    if (Object.values(KEYWORDS.WATERING).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.PRUNING).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.FERTILIZER).some(k => lowerInput.includes(k)) ||
        Object.values(KEYWORDS.PREVENT).some(k => lowerInput.includes(k)) ||
        lowerInput.includes('kỹ thuật') || lowerInput.includes('technique')) {
      topics.push('technique');
    }
    
    // Nếu không có chủ đề cụ thể, đánh dấu là chủ đề chung
    if (topics.length === 0) {
      topics.push('general');
    }
    
    // Xác định bệnh cụ thể
    let specificDisease = null;
    if (Object.values(KEYWORDS.RUST).some(k => lowerInput.includes(k))) {
      specificDisease = 'rust';
    } else if (Object.values(KEYWORDS.MINER).some(k => lowerInput.includes(k))) {
      specificDisease = 'miner';
    } else if (Object.values(KEYWORDS.PHOMA).some(k => lowerInput.includes(k))) {
      specificDisease = 'phoma';
    } else if (Object.values(KEYWORDS.CERCOSPORA).some(k => lowerInput.includes(k))) {
      specificDisease = 'cercospora';
    }
    
    // Xác định kỹ thuật cụ thể
    let specificTechnique = null;
    if (Object.values(KEYWORDS.WATERING).some(k => lowerInput.includes(k))) {
      specificTechnique = 'watering';
    } else if (Object.values(KEYWORDS.PRUNING).some(k => lowerInput.includes(k))) {
      specificTechnique = 'pruning';
    } else if (Object.values(KEYWORDS.FERTILIZER).some(k => lowerInput.includes(k))) {
      specificTechnique = 'fertilizer';
    } else if (Object.values(KEYWORDS.PREVENT).some(k => lowerInput.includes(k))) {
      specificTechnique = 'prevention';
    }
    
    return {
      requiresSummary,
      topics,
      specificDisease,
      specificTechnique,
    };
  }
  
  /**
   * Tạo tóm tắt về bệnh
   * @param {string} diseaseType - Loại bệnh
   * @returns {string} - Tóm tắt
   * @private
   */
  static _generateDiseaseSummary(diseaseType) {
    let summary = '';
    
    // Dựa vào loại bệnh để tạo tóm tắt
    if (diseaseType === 'rust') {
      summary = 'Bệnh gỉ sắt (Coffee Rust) do nấm Hemileia vastatrix gây ra, tạo các đốm màu vàng cam ở mặt dưới lá. Cần phun thuốc fungicide chứa đồng, kiểm soát độ ẩm và cắt tỉa thông thoáng. Đây là một trong những bệnh phổ biến nhất trên cây cà phê.';
    } else if (diseaseType === 'miner') {
      summary = 'Bệnh đục lá (Coffee Leaf Miner) do sâu Leucoptera coffeella gây ra, tạo các đường hầm mỏng trong lá. Xử lý bằng thuốc trừ sâu hệ thống hoặc sinh học, thả thiên địch. Cần phát hiện sớm để kiểm soát hiệu quả.';
    } else if (diseaseType === 'phoma') {
      summary = 'Bệnh đốm đen (Phoma Leaf Spot) gây ra các đốm màu nâu đến xám không đều trên lá. Kiểm soát bằng thuốc trừ nấm có đồng hoặc azoxystrobin, cắt tỉa và cải thiện thoát nước.';
    } else if (diseaseType === 'cercospora') {
      summary = 'Bệnh đốm nâu (Brown Eye Spot) do nấm Cercospora gây ra với đặc trưng là các đốm tròn màu nâu với viền vàng. Xử lý bằng thuốc trừ nấm, cải thiện dinh dưỡng và thoát nước. Thường gặp ở vùng có độ ẩm cao.';
    } else {
      // Tóm tắt chung về các bệnh
      summary = 'Các bệnh phổ biến trên cây cà phê bao gồm bệnh gỉ sắt, đốm lá, miner, và phoma. Mỗi bệnh có triệu chứng và cách xử lý riêng. Chẩn đoán chính xác là bước quan trọng đầu tiên để điều trị hiệu quả.';
    }
    
    return summary;
  }
  
  /**
   * Tạo tóm tắt về kỹ thuật
   * @param {string} techniqueType - Loại kỹ thuật
   * @returns {string} - Tóm tắt
   * @private
   */
  static _generateTechniqueSummary(techniqueType) {
    let summary = '';
    
    // Dựa vào loại kỹ thuật để tạo tóm tắt
    if (techniqueType === 'watering') {
      summary = 'Cây cà phê cần khoảng 1500-2000mm nước/năm. Trong mùa khô, nên tưới 15-20 lít/cây, 2-3 lần/tháng. Tưới vào sáng sớm hoặc chiều tối, tránh làm ướt lá quá nhiều để giảm nguy cơ bệnh nấm.';
    } else if (techniqueType === 'pruning') {
      summary = 'Cắt tỉa giúp không khí lưu thông, giảm bệnh và tăng năng suất. Thời điểm lý tưởng là sau thu hoạch. Cắt bỏ cành già, bệnh, đan chéo, giới hạn chiều cao để thuận tiện chăm sóc.';
    } else if (techniqueType === 'fertilizer') {
      summary = 'Phân bón cần cân đối NPK. Cà phê cần nhiều kali khi ra hoa và kết quả. Bón phân hữu cơ giúp cải thiện đất. Chia nhỏ liều lượng phân bón thành 2-3 lần/năm để tăng hiệu quả.';
    } else if (techniqueType === 'prevention') {
      summary = 'Phòng bệnh hiệu quả cần kết hợp nhiều biện pháp: trồng giống kháng bệnh, duy trì khoảng cách phù hợp giữa các cây, cắt tỉa thông thoáng, và phun thuốc phòng ngừa định kỳ trong mùa mưa.';
    } else {
      // Tóm tắt chung về kỹ thuật
      summary = 'Chăm sóc cây cà phê đòi hỏi kỹ thuật tưới nước, cắt tỉa, bón phân và phòng bệnh đúng cách. Áp dụng các kỹ thuật phù hợp với điều kiện địa phương và giai đoạn phát triển của cây.';
    }
    
    return summary;
  }
  
  /**
   * Tạo tóm tắt chung
   * @returns {string} - Tóm tắt
   * @private
   */
  static _generateGeneralSummary() {
    return 'Cây cà phê cần chăm sóc toàn diện từ kỹ thuật canh tác, dinh dưỡng đến phòng trị bệnh. Các yếu tố quan trọng bao gồm tưới nước đủ, bón phân cân đối, cắt tỉa hợp lý và theo dõi bệnh hại. Kiểm soát độ ẩm là chìa khóa để giảm nhiều loại bệnh nấm.';
  }
  
  /**
   * Tạo tóm tắt dựa trên lịch sử quét
   * @param {Array} scanHistory - Lịch sử quét
   * @returns {string} - Tóm tắt
   * @private
   */
  static _generateScanHistorySummary(scanHistory) {
    // Phân tích lịch sử quét
    const totalScans = scanHistory.length;
    const healthyScans = scanHistory.filter(scan => scan.result && scan.result.includes('khoẻ')).length;
    const diseasedScans = totalScans - healthyScans;
    
    // Nhóm theo loại bệnh
    const diseaseGroups = scanHistory.reduce((acc, scan) => {
      if (scan.result && !scan.result.includes('khoẻ')) {
        // Xác định loại bệnh từ kết quả
        let diseaseType = 'Không xác định';
        
        if (scan.result.includes('gỉ sắt')) diseaseType = 'Gỉ sắt';
        else if (scan.result.includes('miner')) diseaseType = 'Miner';
        else if (scan.result.includes('phoma')) diseaseType = 'Phoma';
        else if (scan.result.includes('cercospora') || scan.result.includes('đốm lá')) diseaseType = 'Đốm lá';
        
        acc[diseaseType] = (acc[diseaseType] || 0) + 1;
      }
      return acc;
    }, {});
    
    // Tạo tóm tắt
    let summary = `Dựa trên ${totalScans} lần quét của bạn, có ${healthyScans} mẫu khỏe mạnh và ${diseasedScans} mẫu có dấu hiệu bệnh. `;
    
    // Thêm thông tin về các bệnh nếu có
    if (diseasedScans > 0) {
      summary += 'Các bệnh được phát hiện bao gồm: ';
      
      const diseaseEntries = Object.entries(diseaseGroups);
      diseaseEntries.forEach(([disease, count], index) => {
        summary += `${disease} (${count} mẫu)`;
        
        if (index < diseaseEntries.length - 1) {
          summary += ', ';
        }
      });
      
      // Thêm đề xuất dựa trên bệnh phổ biến nhất
      if (diseaseEntries.length > 0) {
        const mostCommonDisease = diseaseEntries.sort((a, b) => b[1] - a[1])[0][0];
        summary += `. Bạn nên tập trung kiểm soát bệnh ${mostCommonDisease} vì đây là vấn đề phổ biến nhất.`;
      }
    }
    
    return summary;
  }
  
  /**
   * Tạo phản hồi chi tiết về bệnh
   * @param {string} diseaseType - Loại bệnh
   * @param {object} userContext - Ngữ cảnh người dùng
   * @param {object} previousFeedback - Phản hồi trước đây
   * @param {string} responseStyle - Phong cách phản hồi
   * @returns {object} - Phản hồi chi tiết và ID đề xuất
   * @private
   */
  static async _generateDiseaseDetailedResponse(diseaseType, userContext, previousFeedback, responseStyle) {
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
    
    // Xây dựng nội dung phản hồi dựa trên ngữ cảnh người dùng
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
      
      // Điều chỉnh phản hồi dựa trên phản hồi trước đây nếu có
      if (recommendationId && previousFeedback[recommendationId]) {
        const feedback = previousFeedback[recommendationId];
        
        // Nếu đã từng thành công với đề xuất này
        if (feedback.successRate > 0.7) {
          response += "\n\n**Ghi chú:** Phương pháp này đã có hiệu quả với bạn trước đây. Tiếp tục áp dụng!";
        } 
        // Nếu đã từng thất bại với đề xuất này
        else if (feedback.successRate < 0.3 && feedback.usageCount > 1) {
          response += "\n\n**Ghi chú:** Phương pháp này có vẻ không hiệu quả lắm với điều kiện của bạn. Hãy tham khảo thêm ý kiến chuyên gia.";
        }
      }
      
      // Điều chỉnh độ chi tiết dựa trên sở thích người dùng
      if (responseStyle === 'low') {
        // Phiên bản đơn giản hơn
        response = this._simplifyResponse(response);
      } else if (responseStyle === 'high') {
        // Phiên bản chuyên sâu hơn
        response = this._enhanceResponse(response, diseaseType);
      }
    } else {
      if (diseaseType) {
        response = `Tôi không có thông tin chi tiết về bệnh ${diseaseType}. Vui lòng cung cấp thêm thông tin hoặc tham khảo các bệnh phổ biến khác trên cây cà phê.`;
      } else {
        response = "Có nhiều loại bệnh phổ biến trên cây cà phê như gỉ sắt, đốm lá, miner và phoma. Mỗi bệnh có triệu chứng và cách điều trị khác nhau. Vui lòng nêu rõ bệnh cụ thể để tôi có thể cung cấp thông tin chi tiết.";
      }
    }
    
    return {
      response,
      recommendationId
    };
  }
  
  /**
   * Tạo phản hồi chi tiết về kỹ thuật
   * @param {string} techniqueType - Loại kỹ thuật
   * @param {object} userContext - Ngữ cảnh người dùng
   * @param {object} previousFeedback - Phản hồi trước đây
   * @param {string} responseStyle - Phong cách phản hồi
   * @returns {object} - Phản hồi chi tiết và ID đề xuất
   * @private
   */
  static async _generateTechniqueDetailedResponse(techniqueType, userContext, previousFeedback, responseStyle) {
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
    
    // Điều chỉnh phản hồi dựa trên phản hồi trước đây nếu có
    if (recommendationId && previousFeedback[recommendationId]) {
      const feedback = previousFeedback[recommendationId];
      
      // Nếu đã từng thành công với đề xuất này
      if (feedback.successRate > 0.7) {
        response += "\n\n**Ghi chú:** Kỹ thuật này đã có hiệu quả với vườn cây của bạn trước đây.";
      } 
      // Nếu đã từng thất bại với đề xuất này
      else if (feedback.successRate < 0.3 && feedback.usageCount > 1) {
        response += "\n\n**Ghi chú:** Kỹ thuật này có vẻ chưa phù hợp với điều kiện vườn cây của bạn. Có thể bạn cần điều chỉnh cho phù hợp hơn với địa phương.";
      }
    }
    
    // Điều chỉnh độ chi tiết dựa trên sở thích người dùng
    if (responseStyle === 'low') {
      // Phiên bản đơn giản hơn
      response = this._simplifyResponse(response);
    } else if (responseStyle === 'high') {
      // Phiên bản chuyên sâu hơn
      response = this._enhanceResponse(response, null, techniqueType);
    }
    
    return {
      response,
      recommendationId
    };
  }
  
  /**
   * Tạo phản hồi chi tiết chung
   * @param {string} responseStyle - Phong cách phản hồi
   * @returns {string} - Phản hồi chi tiết
   * @private
   */
  static _generateGeneralDetailedResponse(responseStyle) {
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
    
    // Điều chỉnh độ chi tiết dựa trên sở thích người dùng
    if (responseStyle === 'low') {
      // Phiên bản đơn giản hơn
      response = this._simplifyResponse(response);
    } else if (responseStyle === 'high') {
      // Phiên bản chuyên sâu hơn
      response = this._enhanceResponse(response);
    }
    
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
  
  /**
   * Đơn giản hóa phản hồi
   * @param {string} response - Phản hồi đầy đủ
   * @returns {string} - Phản hồi đơn giản hóa
   * @private
   */
  static _simplifyResponse(response) {
    // Loại bỏ các thuật ngữ khoa học
    let simplified = response.replace(/\([^)]*\)/g, '');
    
    // Loại bỏ các thông tin quá chi tiết
    simplified = simplified.replace(/\b\d+(\.\d+)?(%|mm|cm|kg|g\/cây|m)/g, '');
    
    // Làm ngắn gọn các danh sách dài
    const lines = simplified.split('\n');
    const simplifiedLines = [];
    let itemCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Đếm và giới hạn số lượng mục trong một danh sách
      if (/^\d+\.\s/.test(line)) {
        itemCount++;
        if (itemCount <= 3) {
          simplifiedLines.push(line);
        } else if (itemCount === 4) {
          simplifiedLines.push("• Và một số biện pháp khác.");
        }
      } else {
        itemCount = 0;
        simplifiedLines.push(line);
      }
    }
    
    return simplifiedLines.join('\n');
  }
  
  /**
   * Tăng cường chi tiết cho phản hồi
   * @param {string} response - Phản hồi cơ bản
   * @param {string} diseaseType - Loại bệnh (nếu có)
   * @param {string} techniqueType - Loại kỹ thuật (nếu có)
   * @returns {string} - Phản hồi chi tiết hơn
   * @private
   */
  static _enhanceResponse(response, diseaseType = null, techniqueType = null) {
    // Các thông tin bổ sung về bệnh
    const diseaseExtraInfo = {
      'rust': `\n\n**Thông tin chuyên sâu:**\nBệnh gỉ sắt (Hemileia vastatrix) đã phá hủy ngành cà phê của Sri Lanka vào thế kỷ 19. Nấm phát triển mạnh ở nhiệt độ 21-25°C và độ ẩm trên 85%. Bào tử có thể di chuyển đến 1km nhờ gió. Phun thuốc fungicide với dung dịch 0.3-0.5% đồng oxychloride, 2-3 lần/tháng trong mùa mưa. Bệnh có thể làm giảm năng suất 30-80% nếu không kiểm soát.`,
      
      'miner': `\n\n**Thông tin chuyên sâu:**\nBệnh miner (Leucoptera coffeella) là loài côn trùng cánh vảy với chu kỳ sống 30-40 ngày. Sâu non đào đường hầm ăn mô lá, tạo nên những vết loét nâu. Ong ký sinh Eulophidae là thiên địch tự nhiên, có thể kiểm soát đến 60% sâu non trong điều kiện thuận lợi. Nhiệt độ cao (>30°C) và độ ẩm thấp (<60%) làm tăng mức độ phát triển của sâu. Sử dụng thuốc Imidacloprid với liều 0.5ml/lít nước hoặc Thiamethoxam 0.2g/lít.`,
      
      'phoma': `\n\n**Thông tin chuyên sâu:**\nBệnh phoma (Phoma costarricensis) thường xuất hiện ở các vùng cao >1000m, nhiệt độ thấp và nhiều sương mù. Nấm xâm nhập qua khí khổng hoặc vết thương, phát triển mạnh trong điều kiện nhiệt độ 15-20°C. Azoxystrobin 0.1% kết hợp với 0.3% copper là hỗn hợp hiệu quả để kiểm soát. Bệnh có thể lây lan nhanh sau 7-10 ngày nhiễm trong điều kiện thuận lợi và có thể ảnh hưởng đến 40% diện tích lá.`,
      
      'cercospora': `\n\n**Thông tin chuyên sâu:**\nBệnh đốm lá (Cercospora coffeicola) phát triển mạnh trong điều kiện thiếu dinh dưỡng, đặc biệt là thiếu nitơ và kali. Triệu chứng nặng hơn ở cây cà phê Arabica so với Robusta. Nấm tạo ra độc tố cercosporin gây chết tế bào. Phun thuốc mancozeb 80% WP với nồng độ 2.5g/lít hoặc chlorothalonil 75% WP với nồng độ 2g/lít, 10-14 ngày/lần. Cây con dưới 2 tuổi có nguy cơ chết cao hơn nếu nhiễm nặng.`
    };
    
    // Các thông tin bổ sung về kỹ thuật
    const techniqueExtraInfo = {
      'watering': `\n\n**Thông tin chuyên sâu:**\nHệ số cây trồng (Kc) của cà phê thay đổi theo giai đoạn sinh trưởng: 0.9-1.0 trong giai đoạn sinh trưởng, 1.1-1.2 trong giai đoạn ra hoa, và 1.0-1.1 trong giai đoạn quả chín. Lượng nước bốc thoát hơi tiềm năng (ETo) trung bình hàng ngày trong mùa khô khoảng 4-5mm. Vì vậy, nhu cầu nước hàng ngày = ETo × Kc, khoảng 3.6-6.0mm/ngày. Với mật độ trồng 1.100 cây/ha (3m × 3m), mỗi cây cần khoảng 10-16 lít nước/ngày trong thời kỳ khô hạn cao điểm.`,
      
      'pruning': `\n\n**Thông tin chuyên sâu:**\nCà phê ra quả trên cành thứ cấp, phát triển từ cành sơ cấp. Mỗi mắt lá chỉ ra hoa và kết quả một lần, vì vậy cần thúc đẩy sự phát triển của cành mới. Hệ thống cắt tỉa "4T" bao gồm Topping (cắt ngọn), Thinning (tỉa thưa), Tailing (cắt tỉa các cành dưới thấp), và Tipping (cắt ngọn cành sơ cấp). Hạ thấp chiều cao cây xuống 1.7-2.0m sẽ tăng năng suất 15-20% và giảm chi phí thu hái. Giữ 3-4 thân chính/gốc đối với hệ thống nhiều thân.`,
      
      'fertilizer': `\n\n**Thông tin chuyên sâu:**\nCà phê hấp thụ dinh dưỡng với tỷ lệ N:P₂O₅:K₂O:CaO:MgO = 100:19:116:52:19 mỗi năm. Để sản xuất 1 tấn cà phê nhân, cây cần khoảng 33kg N, 6kg P₂O₅, 38kg K₂O, 17kg CaO và 6kg MgO. Thiếu magiê (Mg) gây vàng lá giữa gân, thiếu kali (K) gây vàng mép lá và hoại tử, thiếu đạm (N) gây vàng toàn lá. Bón kali sulfate thay vì kali chloride sẽ cải thiện chất lượng cà phê. Bón lót với lân nung chảy (P) giúp phát triển rễ ban đầu. Bổ sung vi lượng như Bo (B) và Kẽm (Zn) trong giai đoạn ra hoa.`,
      
      'prevention': `\n\n**Thông tin chuyên sâu:**\nHệ thống quản lý dịch hại tổng hợp (IPM) kết hợp 4 phương pháp: sinh học, canh tác, vật lý và hóa học. Sử dụng Beauveria bassiana hoặc Metarhizium anisopliae (nấm ký sinh) để kiểm soát rệp và sâu non. Bẫy pheromone có thể thu hút và giảm 60-70% số lượng côn trùng trưởng thành. Vùng đệm thực vật như cây húng quế hoặc cúc vạn thọ sẽ thu hút thiên địch. Chu kỳ bệnh gỉ sắt 30-35 ngày, nên phun thuốc mỗi 4 tuần trong mùa mưa. Luân phiên sử dụng các nhóm thuốc khác nhau để tránh kháng thuốc.`
    };
    
    // Thêm thông tin bổ sung dựa vào loại bệnh hoặc kỹ thuật
    if (diseaseType && diseaseExtraInfo[diseaseType]) {
      response += diseaseExtraInfo[diseaseType];
    } else if (techniqueType && techniqueExtraInfo[techniqueType]) {
      response += techniqueExtraInfo[techniqueType];
    } else {
      // Thêm thông tin chuyên sâu chung
      response += `\n\n**Thông tin chuyên sâu:**\nCà phê là cây thân gỗ nhỏ, thuộc họ Rubiaceae, chi Coffea. Hai loài thương mại chính là C. arabica (Arabica) và C. canephora (Robusta). Arabica chiếm 60-70% sản lượng toàn cầu, phát triển tốt ở độ cao 1000-2000m, chứa 0.8-1.4% caffeine. Robusta chịu được điều kiện khắc nghiệt hơn, phát triển ở độ cao 200-800m, chứa 1.7-4.0% caffeine. Giá trị thương mại của cà phê phụ thuộc vào đặc tính cảm quan bao gồm hương vị, mùi thơm, độ chua, vị đắng và thân (body). Quản lý tổng hợp từ canh tác đến thu hoạch và chế biến đều ảnh hưởng đến chất lượng cuối cùng.`;
    }
    
    return response;
  }
}

export default AgentSystem;