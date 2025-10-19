import { GEMINI_API_KEY } from '@env';

const API_KEY = GEMINI_API_KEY;

// ✅ Dòng đã được thay đổi để sử dụng model gemini-2.5-flash
// Model cũ: gemini-1.5-pro-latest
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

class GeminiService {
  static async generateResponse(userInput, context) {
    if (!API_KEY) {
        throw new Error("Gemini API key is missing. Please check your .env file.");
    }
    
    const { previousMessages, scanHistory, historyStats } = context;

    const prompt = this.buildPrompt(userInput, previousMessages, scanHistory, historyStats);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        })
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('Gemini API Error Body:', errorBody);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        const botMessage = data.candidates[0].content.parts[0].text;
        return {
          message: botMessage,
          type: 'gemini_response', 
        };
      } else {
        const blockReason = data.promptFeedback?.blockReason;
        console.warn('Gemini response blocked or empty', { blockReason });
        let errorMessage = 'Tôi không thể đưa ra câu trả lời cho yêu cầu này.';
        if (blockReason === 'SAFETY') {
            errorMessage = 'Câu trả lời đã bị chặn vì lý do an toàn. Vui lòng điều chỉnh câu hỏi của bạn.';
        }
        return {
            message: errorMessage,
            type: 'error',
        };
      }

    } catch (error) {
      console.error('Failed to fetch response from Gemini:', error);
      throw error; 
    }
  }

  static buildPrompt(userInput, previousMessages = [], scanHistory = [], historyStats = {}) {
    let prompt = `Bạn là một chuyên gia AI tư vấn về bệnh và kỹ thuật trồng cây cà phê. Hãy trả lời câu hỏi của người dùng một cách ngắn gọn, chính xác, chuyên nghiệp và hữu ích. Sử dụng markdown để định dạng câu trả lời nếu cần (in đậm, danh sách). Dưới đây là ngữ cảnh cuộc trò chuyện và dữ liệu của người dùng:

`;

    if (scanHistory && scanHistory.length > 0) {
        prompt += "--- Dữ liệu quét lá cây gần đây ---\\n";
        prompt += `Tổng quan: ${historyStats.healthyTrees} cây khỏe, ${historyStats.diseasedTrees} cây bệnh.\n`;
        if(historyStats.diseases){
            Object.entries(historyStats.diseases).forEach(([disease, count]) => {
                prompt += `- ${disease}: ${count} lần xuất hiện.\n`;
            });
        }
        prompt += "---\\n\\n";
    }

    if (previousMessages && previousMessages.length > 0) {
        prompt += "--- Lịch sử trò chuyện gần đây (tối đa 5 tin nhắn) ---\\n";
        previousMessages.slice(-5).forEach(msg => {
            const prefix = msg.isUser ? "Người dùng" : "Chuyên gia";
            prompt += `${prefix}: ${msg.text}\n`;
        });
        prompt += "---\\n\\n";
    }

    prompt += `Câu hỏi hoặc yêu cầu hiện tại của người dùng: "${userInput}"\n
`;
    prompt += `Hãy đưa ra câu trả lời của bạn với tư cách là một chuyên gia cà phê:\n`;

    return prompt;
  }
}

export default GeminiService;