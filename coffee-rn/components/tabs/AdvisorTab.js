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
  summary: 'chart-pie',
  detailed: 'book-open',
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
  const [userContext, setUserContext] = useState(null);
  
  const scrollViewRef = useRef();
  
  // Load hội thoại hiện tại khi ID thay đổi
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);
  
  // Load danh sách hội thoại khi mở tab
  useEffect(() => {
    loadConversations();
    loadUserContext();
  }, []);
  
  // Load ngữ cảnh người dùng
  const loadUserContext = async () => {
    try {
      const context = await InteractionMemoryService.getUserContext();
      setUserContext(context);
    } catch (error) {
      console.error('Lỗi khi tải ngữ cảnh người dùng:', error);
    }
  };
  
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
  
  // Xóa hội thoại
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
      
      Alert.alert('Thành công', 'Đã xóa hội thoại');
    } catch (error) {
      console.error('Lỗi khi xóa hội thoại:', error);
      Alert.alert('Lỗi', 'Không thể xóa hội thoại. Vui lòng thử lại sau.');
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
    
    // Tự động tạo hội thoại mới nếu chưa có
    if (!currentConversationId) {
      createNewConversation();
      // Đợi một chút để đảm bảo hội thoại mới được tạo
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Thêm tin nhắn người dùng
    const userMessage = { 
      id: Date.now().toString(), 
      text: input.trim(), 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
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
      const agentResponse = await AgentSystem.coordinateAgents(input.trim(), context);
      
      // Tạo tin nhắn từ AI
      const botMessage = {
        id: Date.now().toString(),
        text: agentResponse.message,
        isUser: false,
        type: agentResponse.type,
        intent: agentResponse.intent,
        recommendationId: agentResponse.recommendationId,
        timestamp: new Date().toISOString()
      };
      
      // Thêm tin nhắn bot
      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      
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
      
      setMessages([...updatedMessages, errorMessage]);
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
      
      // Làm mới ngữ cảnh người dùng
      loadUserContext();
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
  
  // Cập nhật sở thích người dùng
  const updatePreference = async (detailLevel) => {
    try {
      await AgentSystem.updateUserPreference(detailLevel);
      loadUserContext();
      Alert.alert('Thành công', `Đã cập nhật sở thích của bạn sang mức độ chi tiết: ${detailLevel}`);
    } catch (error) {
      console.error('Lỗi khi cập nhật sở thích:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật sở thích. Vui lòng thử lại sau.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      {showHistory ? (
        // Danh sách hội thoại
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Tư vấn chăm sóc cây</Text>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={createNewConversation}
            >
              <FontAwesome5 name="plus" size={14} color={COLORS.white} />
              <Text style={styles.newChatButtonText}>Hội thoại mới</Text>
            </TouchableOpacity>
          </View>
          
          {userContext && (
            <View style={styles.preferencesBar}>
              <Text style={styles.preferencesLabel}>Mức độ chi tiết:</Text>
              <View style={styles.preferencesButtons}>
                <TouchableOpacity 
                  style={[
                    styles.preferenceButton, 
                    userContext.preferredDetailLevel === 'low' && styles.activePreferenceButton
                  ]}
                  onPress={() => updatePreference('low')}
                >
                  <Text style={[
                    styles.preferenceButtonText,
                    userContext.preferredDetailLevel === 'low' && styles.activePreferenceButtonText
                  ]}>Đơn giản</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.preferenceButton, 
                    userContext.preferredDetailLevel === 'medium' && styles.activePreferenceButton
                  ]}
                  onPress={() => updatePreference('medium')}
                >
                  <Text style={[
                    styles.preferenceButtonText,
                    userContext.preferredDetailLevel === 'medium' && styles.activePreferenceButtonText
                  ]}>Cân bằng</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.preferenceButton, 
                    userContext.preferredDetailLevel === 'high' && styles.activePreferenceButton
                  ]}
                  onPress={() => updatePreference('high')}
                >
                  <Text style={[
                    styles.preferenceButtonText,
                    userContext.preferredDetailLevel === 'high' && styles.activePreferenceButtonText
                  ]}>Chi tiết</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <ScrollView style={styles.conversationsList}>
            {conversations.map(conversation => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationItem}
                onPress={() => setCurrentConversationId(conversation.id)}
                onLongPress={() => {
                  Alert.alert(
                    'Xác nhận xóa',
                    'Bạn có chắc chắn muốn xóa hội thoại này?',
                    [
                      {
                        text: 'Hủy',
                        style: 'cancel'
                      },
                      {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => deleteConversation(conversation.id)
                      }
                    ]
                  );
                }}
              >
                <View style={styles.conversationIcon}>
                  <FontAwesome5 name="comment" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.conversationContent}>
                  <Text style={styles.conversationTitle}>{conversation.title}</Text>
                  <Text style={styles.conversationPreview}>{conversation.lastMessage}</Text>
                </View>
                <Text style={styles.conversationTime}>{conversation.time}</Text>
              </TouchableOpacity>
            ))}
            
            {conversations.length === 0 && (
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
            <TouchableOpacity
              style={styles.userPreferencesButton}
              onPress={() => {
                Alert.alert(
                  'Sở thích người dùng',
                  'Chọn mức độ chi tiết bạn muốn nhận:',
                  [
                    {
                      text: 'Đơn giản',
                      onPress: () => updatePreference('low')
                    },
                    {
                      text: 'Cân bằng',
                      onPress: () => updatePreference('medium')
                    },
                    {
                      text: 'Chi tiết',
                      onPress: () => updatePreference('high')
                    },
                    {
                      text: 'Hủy',
                      style: 'cancel'
                    }
                  ]
                );
              }}
            >
              <FontAwesome5 name="sliders-h" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <View style={styles.agentIconContainer}>
                  <FontAwesome5 name="user-md" size={30} color={COLORS.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Xin chào, tôi là trợ lý AI chăm sóc cây cà phê</Text>
                <Text style={styles.welcomeText}>
                  Tôi có hai chế độ tư vấn:
                </Text>
                
                <View style={styles.agentInfoContainer}>
                  <View style={styles.agentInfo}>
                    <FontAwesome5 name={AGENT_ICONS.summary} size={24} color={COLORS.primary} style={styles.agentInfoIcon} />
                    <View style={styles.agentInfoContent}>
                      <Text style={styles.agentInfoTitle}>Agent Tóm Tắt</Text>
                      <Text style={styles.agentInfoDesc}>Cung cấp thông tin ngắn gọn, dễ hiểu</Text>
                    </View>
                  </View>
                  
                  <View style={styles.agentInfo}>
                    <FontAwesome5 name={AGENT_ICONS.detailed} size={24} color={COLORS.secondary} style={styles.agentInfoIcon} />
                    <View style={styles.agentInfoContent}>
                      <Text style={styles.agentInfoTitle}>Agent Chi Tiết</Text>
                      <Text style={styles.agentInfoDesc}>Cung cấp thông tin chuyên sâu, đầy đủ</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.welcomeText}>
                  Tôi sẽ tự động chọn agent phù hợp với yêu cầu của bạn, hoặc bạn có thể chỉ định rõ mong muốn "tóm tắt" hoặc "chi tiết" trong câu hỏi.
                </Text>
                
                <View style={styles.suggestionsContainer}>
                  <TouchableOpacity 
                    style={styles.suggestionButton}
                    onPress={() => {
                      setInput('Tóm tắt cách xử lý bệnh gỉ sắt');
                      setTimeout(() => handleSend(), 100);
                    }}
                  >
                    <Text style={styles.suggestionText}>Tóm tắt về bệnh gỉ sắt</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.suggestionButton}
                    onPress={() => {
                      setInput('Chi tiết về kỹ thuật tưới nước');
                      setTimeout(() => handleSend(), 100);
                    }}
                  >
                    <Text style={styles.suggestionText}>Chi tiết về tưới nước</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.suggestionButton}
                    onPress={() => {
                      setInput('Làm thế nào để cắt tỉa cây cà phê?');
                      setTimeout(() => handleSend(), 100);
                    }}
                  >
                    <Text style={styles.suggestionText}>Kỹ thuật cắt tỉa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Message bubbles */}
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
                      color={message.type === 'summary' ? COLORS.primary : COLORS.secondary} 
                    />
                    <Text style={[
                      styles.agentTypeText,
                      { color: message.type === 'summary' ? COLORS.primary : COLORS.secondary }
                    ]}>
                      {message.type === 'summary' ? 'Agent Tóm Tắt' : 
                       message.type === 'detailed' ? 'Agent Chi Tiết' : 
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
                          { level: FEEDBACK_LEVELS.NEUTRAL }
                        )}
                      >
                        <FontAwesome5 name="meh" size={14} color={COLORS.gray} />
                        <Text style={styles.feedbackButtonText}>Bình thường</Text>
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
                    <Text style={styles.feedbackGivenText}>
                      <FontAwesome5 
                        name={
                          message.feedback.level === FEEDBACK_LEVELS.POSITIVE ? 'thumbs-up' :
                          message.feedback.level === FEEDBACK_LEVELS.NEGATIVE ? 'thumbs-down' : 'meh'
                        } 
                        size={12} 
                        color={
                          message.feedback.level === FEEDBACK_LEVELS.POSITIVE ? COLORS.success :
                          message.feedback.level === FEEDBACK_LEVELS.NEGATIVE ? COLORS.danger : COLORS.gray
                        } 
                      /> Bạn đã đánh giá đề xuất này
                    </Text>
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
          </ScrollView>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Hỏi về chăm sóc cây cà phê..."
              value={input}
              onChangeText={setInput}
              multiline
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
  },
  preferencesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.grayLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  preferencesLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 10,
  },
  preferencesButtons: {
    flexDirection: 'row',
  },
  preferenceButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginHorizontal: 5,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  activePreferenceButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  preferenceButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activePreferenceButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
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
  userPreferencesButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 30,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: COLORS.grayLight,
  },
  feedbackButtonText: {
    fontSize: 11,
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
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
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