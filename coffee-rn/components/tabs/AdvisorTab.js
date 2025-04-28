// components/tabs/AdvisorTab.js
// components/tabs/AdvisorTab.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Services & Utils
import AgentSystem from '../../services/AgentSystem';
import { 
  InteractionMemoryService, 
  INTERACTION_TYPES, 
  FEEDBACK_LEVELS 
} from '../../services/InteractionMemoryService';
import COLORS from '../../styles/colors';
import StorageService from '../../services/StorageService';

// Lưu trữ hội thoại
const STORAGE_KEY = 'advisor_conversations';

// Biểu tượng cho các agents
const AGENT_ICONS = {
  analysis: 'chart-pie',
  treatment: 'book-medical',
  system: 'robot',
  error: 'exclamation-triangle'
};

const AdvisorTab = ({ scanHistory = [], historyStats = {} }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  
  const scrollViewRef = useRef();
  const inputRef = useRef();
  
  // Load hội thoại hiện tại khi ID thay đổi
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);
  
  // Load danh sách hội thoại khi mở tab
  useEffect(() => {
    loadConversations();
    
    // Theo dõi sự kiện bàn phím
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Cuộn đến cuối khi bàn phím hiển thị
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    
    // Dọn dẹp lắng nghe sự kiện
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Load danh sách hội thoại từ AsyncStorage
  const loadConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedConversations = JSON.parse(stored);
        if (savedConversations.length > 0) {
          setConversations(savedConversations);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách hội thoại:', error);
    }
  };
  
  // Load một hội thoại cụ thể
  const loadConversation = async (id) => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
      setShowHistory(false);
    } catch (error) {
      console.error('Lỗi khi tải hội thoại:', error);
      setMessages([]);
    }
  };
  // Lưu hội thoại hiện tại
  const saveCurrentConversation = async () => {
    if (!currentConversationId || messages.length === 0) return;
    
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY}_${currentConversationId}`, JSON.stringify(messages));
      
      // Cập nhật danh sách hội thoại
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
          // Lấy tin nhắn cuối cùng từ người dùng để làm title nếu chưa có
          let lastUserMessage = '';
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].isUser) {
              lastUserMessage = messages[i].text;
              break;
            }
          }
          
          const userMessage = lastUserMessage.length > 30 
            ? lastUserMessage.substring(0, 27) + '...' 
            : lastUserMessage;
            
          // Lấy tin nhắn cuối cùng để làm preview
          const lastMessage = messages.length > 0 
            ? messages[messages.length - 1].text.substring(0, 30) + '...'
            : 'Không có tin nhắn';
          
          return {
            ...conv,
            title: conv.title === 'Hội thoại mới' && userMessage ? userMessage : conv.title,
            lastMessage: lastMessage,
            time: 'Vừa xong'
          };
        }
        return conv;
      });
      
      setConversations(updatedConversations);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('Lỗi khi lưu hội thoại:', error);
    }
  };
  
  // Xóa một hội thoại
  const deleteConversation = async (id) => {
    try {
      // Xóa tin nhắn của hội thoại
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${id}`);
      
      // Cập nhật danh sách hội thoại
      const updatedConversations = conversations.filter(conv => conv.id !== id);
      setConversations(updatedConversations);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
      
      // Nếu đang ở hội thoại bị xóa, quay lại danh sách
      if (currentConversationId === id) {
        setShowHistory(true);
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa hội thoại:', error);
      return false;
    }
  };
  
  // Xóa nhiều hội thoại
  const deleteMultipleConversations = async () => {
    if (selectedConversations.length === 0) return;
    
    try {
      // Xóa tin nhắn của các hội thoại đã chọn
      for (const id of selectedConversations) {
        await AsyncStorage.removeItem(`${STORAGE_KEY}_${id}`);
      }
      
      // Cập nhật danh sách hội thoại
      const updatedConversations = conversations.filter(
        conv => !selectedConversations.includes(conv.id)
      );
      
      setConversations(updatedConversations);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
      
      // Nếu đang ở hội thoại bị xóa, quay lại danh sách
      if (selectedConversations.includes(currentConversationId)) {
        setShowHistory(true);
      }
      
      // Reset chế độ chọn
      setIsSelectMode(false);
      setSelectedConversations([]);
      
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa nhiều hội thoại:', error);
      return false;
    }
  };
  
  // Xử lý chọn/bỏ chọn hội thoại
  const toggleSelectConversation = (id) => {
    if (selectedConversations.includes(id)) {
      setSelectedConversations(selectedConversations.filter(convId => convId !== id));
    } else {
      setSelectedConversations([...selectedConversations, id]);
    }
  };
  
  // Tạo hội thoại mới
  const createNewConversation = () => {
    const newId = 'conv_' + Date.now().toString();
    const newConversation = {
      id: newId,
      title: 'Hội thoại mới',
      lastMessage: 'Chưa có tin nhắn',
      time: 'Vừa tạo'
    };
    
    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    
    // Lưu vào AsyncStorage
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations))
      .catch(error => console.error('Lỗi khi lưu danh sách hội thoại:', error));
    
    // Đặt hội thoại hiện tại
    setCurrentConversationId(newId);
    setMessages([]);
    setShowHistory(false);
  };
  
  // Xử lý gửi tin nhắn
  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Thêm tin nhắn người dùng
    const userMessage = { 
      id: Date.now().toString(), 
      text: input.trim(), 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    // Tự động tạo hội thoại mới nếu chưa có
    if (!currentConversationId) {
      createNewConversation();
      // Đợi một chút để đảm bảo hội thoại mới được tạo
      await new Promise(resolve => setTimeout(resolve, 300));
      setMessages([userMessage]);
    } else {
      setMessages([...messages, userMessage]);
    }
    
    setInput('');
    Keyboard.dismiss();
    
    // Hiển thị trạng thái đang gõ
    setIsLoading(true);
    
    // Cuộn xuống tin nhắn mới
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Chuẩn bị ngữ cảnh cho agent
      const context = {
        scanHistory: scanHistory || [],
        historyStats: historyStats || {},
        previousMessages: messages
      };
      
      // Phân tích yêu cầu người dùng
      const agentResponse = await AgentSystem.coordinateAgents(userMessage.text, context);
      
      // Tạo tin nhắn từ AI
      const botMessage = {
        id: Date.now().toString(),
        text: agentResponse.message,
        isUser: false,
        type: agentResponse.type || 'treatment',
        intent: agentResponse.intent,
        recommendationId: agentResponse.recommendationId,
        timestamp: new Date().toISOString()
      };
      
      // Thêm tin nhắn bot
      setMessages(currentMessages => [...currentMessages, botMessage]);
      
      // Lưu hội thoại
      setTimeout(() => {
        saveCurrentConversation();
      }, 500);
      
    } catch (error) {
      console.error('Lỗi khi xử lý tin nhắn:', error);
      // Thêm tin nhắn lỗi
      const errorMessage = {
        id: Date.now().toString(),
        text: 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        isUser: false,
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      setMessages(currentMessages => [...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Cuộn xuống tin nhắn mới
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  // Cập nhật phản hồi về đề xuất
  const handleFeedback = async (messageId, recommendationId, feedback) => {
    if (!recommendationId) return;
    
    try {
      // Lưu phản hồi
      await AgentSystem.saveFeedback(recommendationId, feedback);
      
      // Cập nhật tin nhắn để hiển thị phản hồi
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            feedback: feedback
          };
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      
      // Lưu hội thoại
      await AsyncStorage.setItem(`${STORAGE_KEY}_${currentConversationId}`, JSON.stringify(updatedMessages));
      
      // Thông báo
      Alert.alert('Cảm ơn bạn!', 'Phản hồi của bạn giúp tôi cải thiện đề xuất trong tương lai.');
      
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi:', error);
      Alert.alert('Lỗi', 'Không thể lưu phản hồi. Vui lòng thử lại sau.');
    }
  };
  
  // Quay lại lịch sử hội thoại
  const backToHistory = () => {
    setShowHistory(true);
    loadConversations();
  };

  // Phân tích dữ liệu quét lá
  const analyzeScanData = () => {
    if (!scanHistory || scanHistory.length === 0) {
      Alert.alert('Thông báo', 'Chưa có dữ liệu quét để phân tích. Vui lòng quét một số lá cây trước.');
      return;
    }
    
    const userMessage = { 
      id: Date.now().toString(), 
      text: "Phân tích dữ liệu quét của tôi và đưa ra đề xuất", 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    if (!currentConversationId) {
      createNewConversation();
      setTimeout(() => {
        setMessages([userMessage]);
        handleScanDataAnalysis();
      }, 300);
    } else {
      setMessages(currentMessages => [...currentMessages, userMessage]);
      handleScanDataAnalysis();
    }
  };
  
  // Xử lý phân tích dữ liệu quét
  const handleScanDataAnalysis = async () => {
    setIsLoading(true);
    // Cuộn xuống tin nhắn mới
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    try {
      // Tạo phân tích dữ liệu quét
      let analysisText = "**Phân tích dữ liệu quét lá cà phê của bạn**\n\n";
      
      // Tổng quan
      analysisText += `Tôi đã phân tích ${scanHistory.length} mẫu lá cà phê từ dữ liệu quét của bạn.\n\n`;
      analysisText += `📊 **Tổng quan sức khỏe vườn cây:**\n`;
      analysisText += `• Cây khỏe mạnh: ${historyStats.healthyTrees} mẫu (${Math.round(historyStats.healthyTrees/scanHistory.length*100)}%)\n`;
      analysisText += `• Cây có bệnh: ${historyStats.diseasedTrees} mẫu (${Math.round(historyStats.diseasedTrees/scanHistory.length*100)}%)\n\n`;
      
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
      
      // Tạo tin nhắn phân tích
      const botMessage = {
        id: Date.now().toString(),
        text: analysisText,
        isUser: false,
        type: 'analysis',
        timestamp: new Date().toISOString(),
        recommendationId: 'scan_analysis'
      };
      
      // Thêm tin nhắn bot
      setMessages(currentMessages => [...currentMessages, botMessage]);
      
      // Lưu hội thoại
      setTimeout(() => {
        saveCurrentConversation();
      }, 500);
      
    } catch (error) {
      console.error('Lỗi khi phân tích dữ liệu quét:', error);
      // Thêm tin nhắn lỗi
      const errorMessage = {
        id: Date.now().toString(),
        text: 'Xin lỗi, tôi gặp sự cố khi phân tích dữ liệu quét. Vui lòng thử lại sau.',
        isUser: false,
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      setMessages(currentMessages => [...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Cuộn xuống tin nhắn mới
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  const renderMessages = () => {
    if (!messages || messages.length === 0) return null;
    
    return (
      <>
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.botBubble
            ]}
          >
            {!message.isUser && message.type && (
              <View style={styles.agentTypeTag}>
                <FontAwesome5 
                  name={AGENT_ICONS[message.type] || 'robot'} 
                  size={12} 
                  color={message.type === 'analysis' ? COLORS.primary : COLORS.secondary} 
                />
                <Text style={[
                  styles.agentTypeText,
                  { color: message.type === 'analysis' ? COLORS.primary : COLORS.secondary }
                ]}>
                  {message.type === 'analysis' ? 'Phân tích dữ liệu' : 
                   message.type === 'treatment' ? 'Tư vấn điều trị' : 
                   'Hệ thống'}
                </Text>
              </View>
            )}
            
            <Text style={[
              styles.messageText,
              message.isUser ? styles.userMessageText : styles.botMessageText
            ]}>
              {message.text}
            </Text>
            
            {/* Feedback buttons for recommendations */}
            {!message.isUser && message.recommendationId && !message.feedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackQuestion}>Đề xuất này có hữu ích không?</Text>
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity 
                    style={styles.feedbackButton}
                    onPress={() => handleFeedback(
                      message.id, 
                      message.recommendationId,
                      { level: FEEDBACK_LEVELS.POSITIVE, success: true }
                    )}
                  >
                    <FontAwesome5 name="thumbs-up" size={14} color={COLORS.success} />
                    <Text style={styles.feedbackButtonText}>Có, rất hữu ích</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.feedbackButton}
                    onPress={() => handleFeedback(
                      message.id, 
                      message.recommendationId,
                      { level: FEEDBACK_LEVELS.NEGATIVE, success: false }
                    )}
                  >
                    <FontAwesome5 name="thumbs-down" size={14} color={COLORS.danger} />
                    <Text style={styles.feedbackButtonText}>Không hữu ích</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Show feedback if already given */}
            {!message.isUser && message.feedback && (
              <View style={styles.feedbackGiven}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <FontAwesome5 
                    name={
                      message.feedback.level === FEEDBACK_LEVELS.POSITIVE ? 'thumbs-up' : 'thumbs-down'
                    } 
                    size={12} 
                    color={
                      message.feedback.level === FEEDBACK_LEVELS.POSITIVE ? COLORS.success : COLORS.danger
                    } 
                  />
                  <Text style={styles.feedbackGivenText}> Bạn đã đánh giá đề xuất này</Text>
                </View>
              </View>
            )}
          </View>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang soạn tin nhắn...</Text>
          </View>
        )}
      </>
    );
  };

  // Render message chào mừng khi không có tin nhắn
  const renderWelcomeMessage = () => {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.agentIconContainer}>
          <FontAwesome5 name="user-md" size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Xin chào, tôi là trợ lý AI chăm sóc cây cà phê</Text>
        <Text style={styles.welcomeText}>
          Tôi có thể giúp bạn phân tích kết quả quét và đưa ra các đề xuất điều trị phù hợp.
        </Text>
        
        <View style={styles.agentInfoContainer}>
          <View style={styles.agentInfo}>
            <FontAwesome5 name="leaf" size={24} color={COLORS.primary} style={styles.agentInfoIcon} />
            <View style={styles.agentInfoContent}>
              <Text style={styles.agentInfoTitle}>Phân tích dữ liệu quét</Text>
              <Text style={styles.agentInfoDesc}>Cung cấp thông tin từ kết quả quét lá của bạn</Text>
            </View>
          </View>
          
          <View style={styles.agentInfo}>
            <FontAwesome5 name="book-open" size={24} color={COLORS.secondary} style={styles.agentInfoIcon} />
            <View style={styles.agentInfoContent}>
              <Text style={styles.agentInfoTitle}>Tư vấn điều trị</Text>
              <Text style={styles.agentInfoDesc}>Đề xuất phương pháp điều trị phù hợp</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.welcomeText}>
          Bạn có thể hỏi tôi về cách xử lý bệnh hoặc yêu cầu phân tích dữ liệu từ các lá cây bạn đã quét.
        </Text>
        
        <View style={styles.suggestionsContainer}>
          <TouchableOpacity 
            style={styles.suggestionButton}
            onPress={analyzeScanData}
          >
            <Text style={styles.suggestionText}>Phân tích dữ liệu quét của tôi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.suggestionButton}
            onPress={() => {
              setInput('Cách xử lý bệnh gỉ sắt');
              setTimeout(() => handleSend(), 100);
            }}
          >
            <Text style={styles.suggestionText}>Cách xử lý bệnh gỉ sắt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.suggestionButton}
            onPress={() => {
              setInput('Kỹ thuật cắt tỉa cây cà phê');
              setTimeout(() => handleSend(), 100);
            }}
          >
            <Text style={styles.suggestionText}>Kỹ thuật cắt tỉa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
// Sửa phần return trong component để sử dụng renderMessages
return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.container}
    keyboardVerticalOffset={90}
  >
    {showHistory ? (
      // Danh sách hội thoại
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Tư vấn</Text>
          <View style={styles.headerButtons}>
            {isSelectMode ? (
              <>
                <TouchableOpacity
                  style={[styles.headerButton, styles.cancelButton]}
                  onPress={() => {
                    setIsSelectMode(false);
                    setSelectedConversations([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                
                {selectedConversations.length > 0 && (
                  <TouchableOpacity
                    style={[styles.headerButton, styles.deleteButton]}
                    onPress={() => {
                      Alert.alert(
                        'Xác nhận xóa',
                        `Bạn có chắc chắn muốn xóa ${selectedConversations.length} hội thoại đã chọn?`,
                        [
                          {
                            text: 'Hủy',
                            style: 'cancel'
                          },
                          {
                            text: 'Xóa',
                            style: 'destructive',
                            onPress: async () => {
                              const success = await deleteMultipleConversations();
                              if (success) {
                                Alert.alert('Thành công', 'Đã xóa các hội thoại đã chọn.');
                              } else {
                                Alert.alert('Lỗi', 'Không thể xóa hội thoại. Vui lòng thử lại sau.');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <FontAwesome5 name="trash" size={14} color={COLORS.white} />
                    <Text style={styles.deleteButtonText}>Xóa ({selectedConversations.length})</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {conversations.length > 1 && (
                  <TouchableOpacity
                    style={[styles.headerButton, styles.selectButton]}
                    onPress={() => setIsSelectMode(true)}
                  >
                    <FontAwesome5 name="check-square" size={14} color={COLORS.white} />
                    <Text style={styles.selectButtonText}>Chọn</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.headerButton, styles.newChatButton]}
                  onPress={createNewConversation}
                >
                  <FontAwesome5 name="plus" size={14} color={COLORS.white} />
                  <Text style={styles.newChatButtonText}>Mới</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        <ScrollView style={styles.conversationsList}>
          {scanHistory && scanHistory.length > 0 && (
            <TouchableOpacity
              style={styles.scanAnalysisButton}
              onPress={analyzeScanData}
              disabled={isSelectMode}
            >
              <View style={styles.scanAnalysisIcon}>
                <FontAwesome5 name="leaf" size={20} color={COLORS.white} />
              </View>
              <View style={styles.scanAnalysisContent}>
                <Text style={styles.scanAnalysisTitle}>Phân tích dữ liệu quét</Text>
                <Text style={styles.scanAnalysisSubtitle}>
                  {scanHistory.length} mẫu lá • {historyStats.healthyTrees || 0} khoẻ • {historyStats.diseasedTrees || 0} bệnh
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {conversations.map(conversation => (
            <TouchableOpacity
              key={conversation.id}
              style={[
                styles.conversationItem,
                selectedConversations.includes(conversation.id) && styles.selectedConversationItem
              ]}
              onPress={() => {
                if (isSelectMode) {
                  toggleSelectConversation(conversation.id);
                } else {
                  setCurrentConversationId(conversation.id);
                }
              }}
              onLongPress={() => {
                if (!isSelectMode) {
                  setIsSelectMode(true);
                  setSelectedConversations([conversation.id]);
                }
              }}
            >
              {isSelectMode ? (
                <View style={styles.checkboxContainer}>
                  <View 
                    style={[
                      styles.checkbox,
                      selectedConversations.includes(conversation.id) && styles.checkboxSelected
                    ]}
                  >
                    {selectedConversations.includes(conversation.id) && (
                      <FontAwesome5 name="check" size={12} color={COLORS.white} />
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.conversationIcon}>
                  <FontAwesome5 name="comment" size={20} color={COLORS.primary} />
                </View>
              )}
              
              <View style={styles.conversationContent}>
                <Text style={styles.conversationTitle}>{conversation.title}</Text>
                <Text style={styles.conversationPreview}>{conversation.lastMessage}</Text>
              </View>
              
              {!isSelectMode && (
                <Text style={styles.conversationTime}>{conversation.time}</Text>
              )}
            </TouchableOpacity>
          ))}
          
          {conversations.length === 0 && !scanHistory.length && (
            <View style={styles.emptyState}>
              <FontAwesome5 name="comments" size={40} color={COLORS.grayMedium} />
              <Text style={styles.emptyStateText}>Chưa có hội thoại nào</Text>
              <Text style={styles.emptyStateSubtext}>Bắt đầu một cuộc trò chuyện mới để nhận tư vấn</Text>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>
            Gợi ý: Hỏi về cách xử lý bệnh gỉ sắt, phân bón, hay kỹ thuật cắt tỉa
          </Text>
        </View>
      </View>
    ) : (
      // Giao diện chat
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={backToHistory}
          >
            <FontAwesome5 name="arrow-left" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.chatTitle}>
            {conversations.find(c => c.id === currentConversationId)?.title || 'Tư vấn'}
          </Text>
          <View style={{width: 30}} /> {/* Để cân bằng header */}
        </View>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 90 }
          ]}
        >
          {/* Welcome message if no messages */}
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.agentIconContainer}>
                <FontAwesome5 name="user-md" size={30} color={COLORS.primary} />
              </View>
              <Text style={styles.welcomeTitle}>Xin chào, tôi là trợ lý AI chăm sóc cây cà phê</Text>
              <Text style={styles.welcomeText}>
                Tôi có thể giúp bạn phân tích kết quả quét và đưa ra các đề xuất điều trị phù hợp.
              </Text>
              
              <View style={styles.agentInfoContainer}>
                <View style={styles.agentInfo}>
                  <FontAwesome5 name="leaf" size={24} color={COLORS.primary} style={styles.agentInfoIcon} />
                  <View style={styles.agentInfoContent}>
                    <Text style={styles.agentInfoTitle}>Phân tích dữ liệu quét</Text>
                    <Text style={styles.agentInfoDesc}>Cung cấp thông tin từ kết quả quét lá của bạn</Text>
                  </View>
                </View>
                
                <View style={styles.agentInfo}>
                  <FontAwesome5 name="book-open" size={24} color={COLORS.secondary} style={styles.agentInfoIcon} />
                  <View style={styles.agentInfoContent}>
                    <Text style={styles.agentInfoTitle}>Tư vấn điều trị</Text>
                    <Text style={styles.agentInfoDesc}>Đề xuất phương pháp điều trị phù hợp</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.welcomeText}>
                Bạn có thể hỏi tôi về cách xử lý bệnh hoặc yêu cầu phân tích dữ liệu từ các lá cây bạn đã quét.
              </Text>
              
              <View style={styles.suggestionsContainer}>
                <TouchableOpacity 
                  style={styles.suggestionButton}
                  onPress={analyzeScanData}
                >
                  <Text style={styles.suggestionText}>Phân tích dữ liệu quét của tôi</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.suggestionButton}
                  onPress={() => {
                    setInput('Cách xử lý bệnh gỉ sắt');
                    setTimeout(() => handleSend(), 100);
                  }}
                >
                  <Text style={styles.suggestionText}>Cách xử lý bệnh gỉ sắt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.suggestionButton}
                  onPress={() => {
                    setInput('Kỹ thuật cắt tỉa cây cà phê');
                    setTimeout(() => handleSend(), 100);
                  }}
                >
                  <Text style={styles.suggestionText}>Kỹ thuật cắt tỉa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Message bubbles */}
          {renderMessages()}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Hỏi về chăm sóc cây cà phê..."
            value={input}
            onChangeText={setInput}
            multiline
            maxHeight={80}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !input.trim() && styles.disabledButton
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <FontAwesome5 
              name="paper-plane" 
              size={18} 
              color={input.trim() ? COLORS.white : COLORS.grayMedium} 
            />
          </TouchableOpacity>
        </View>
      </View>
    )}
  </KeyboardAvoidingView>
);
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  // History styles
  historyContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  newChatButton: {
    backgroundColor: COLORS.primary,
  },
  newChatButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
  },
  selectButton: {
    backgroundColor: COLORS.secondary,
  },
  selectButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: COLORS.grayMedium,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  deleteButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
  },
  conversationsList: {
    flex: 1,
  },
  scanAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  scanAnalysisIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scanAnalysisContent: {
    flex: 1,
  },
  scanAnalysisTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 3,
  },
  scanAnalysisSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  selectedConversationItem: {
    backgroundColor: COLORS.primaryLight,
  },
  checkboxContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 5,
  },
  conversationPreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  bottomInfo: {
    padding: 15,
    backgroundColor: COLORS.grayLight,
  },
  bottomInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Chat styles
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
    backgroundColor: COLORS.white,
    zIndex: 10,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 90,
  },
  welcomeContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  agentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  agentInfoContainer: {
    marginVertical: 15,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  agentInfoIcon: {
    marginRight: 10,
  },
  agentInfoContent: {
    flex: 1,
  },
  agentInfoTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  agentInfoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  suggestionText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: COLORS.white,
  },
  botMessageText: {
    color: COLORS.text,
  },
  agentTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentTypeText: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  feedbackContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    paddingTop: 10,
  },
  feedbackQuestion: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: COLORS.grayLight,
    marginRight: 8,
  },
  feedbackButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 5,
  },
  feedbackGiven: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
  },
  feedbackGivenText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    alignItems: 'flex-end',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: COLORS.grayMedium,
  },
});
export default AdvisorTab;         