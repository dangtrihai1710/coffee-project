// components/tabs/AdvisorTab.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Services & Utils
import AgentSystem from '../../services/AgentSystem';
import { FEEDBACK_LEVELS } from '../../services/InteractionMemoryService';
import { createScanAnalysis } from '../../utils/advisorUtils';
import COLORS from '../../styles/colors';

// Components
import MessageBubble from '../advisor/MessageBubble';
import LoadingBubble from '../advisor/LoadingBubble';
import WelcomeMessage from '../advisor/WelcomeMessage';
import ChatInput from '../advisor/ChatInput';
import ConversationList from '../advisor/ConversationList';
import HistoryHeader from '../advisor/HistoryHeader';
import ChatHeader from '../advisor/ChatHeader';

// Lưu trữ hội thoại
const STORAGE_KEY = 'advisor_conversations';

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
  
  // Focus vào input khi cần
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Load hội thoại hiện tại khi ID thay đổi
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);
  
  // Khi mở chat (không phải màn hình lịch sử)
  useEffect(() => {
    if (!showHistory && currentConversationId) {
      // Đợi một chút cho UI render xong
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 500);
    }
  }, [showHistory, currentConversationId]);
  
  // Load danh sách hội thoại khi mở tab
  useEffect(() => {
    loadConversations();
    
    // Theo dõi sự kiện bàn phím
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        console.log('Bàn phím hiện - chiều cao:', event.endCoordinates.height);
        setKeyboardHeight(event.endCoordinates.height);
        // Cuộn đến cuối khi bàn phím hiển thị với độ trễ lớn hơn
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        console.log('Bàn phím ẩn');
        setKeyboardHeight(0);
        // Khi bàn phím ẩn cũng cuộn xuống để đảm bảo vùng nhìn đúng
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
  const toggleSelectConversation = (id, startSelectMode = false) => {
    if (startSelectMode) {
      setIsSelectMode(true);
      setSelectedConversations([id]);
      return;
    }
    
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
    }, 300);
    
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
      }, 300);
    }
  };
  
  // Xử lý cho các câu hỏi gợi ý
  const handleQuickQuestion = (question) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
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
  const analyzeScanData = async () => {
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
    }, 300);
    
    try {
      // Sử dụng utils để tạo phân tích
      const analysisResult = createScanAnalysis(scanHistory, historyStats);
      
      // Tạo tin nhắn phân tích
      const botMessage = {
        id: Date.now().toString(),
        text: analysisResult.message,
        isUser: false,
        type: 'analysis',
        timestamp: new Date().toISOString(),
        recommendationId: analysisResult.recommendationId
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
      }, 300);
    }
  };

  // Xử lý xác nhận xóa nhiều hội thoại
  const handleDeleteSelected = () => {
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
  };

  // Khả năng hiển thị nút chọn
  const canShowSelectButton = () => {
    return conversations.length > 1;
  };

  // Render component chính
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // Chỉ sử dụng padding cho iOS
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {showHistory ? (
        // Danh sách hội thoại
        <View style={styles.historyContainer}>
          <HistoryHeader
            isSelectMode={isSelectMode}
            selectedConversations={selectedConversations}
            onCreateNewConversation={createNewConversation}
            onToggleSelectMode={() => setIsSelectMode(true)}
            onCancelSelect={() => {
              setIsSelectMode(false);
              setSelectedConversations([]);
            }}
            onDeleteSelected={handleDeleteSelected}
          />
          
          <ConversationList
            conversations={conversations}
            scanHistory={scanHistory}
            historyStats={historyStats}
            isSelectMode={isSelectMode}
            selectedConversations={selectedConversations}
            onSelectConversation={toggleSelectConversation}
            onOpenConversation={(id) => setCurrentConversationId(id)}
            onAnalyzeScan={analyzeScanData}
          />
          
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>
              Gợi ý: Hỏi về cách xử lý bệnh gỉ sắt, phân bón, hay kỹ thuật cắt tỉa
            </Text>
          </View>
        </View>
      ) : (
        // Giao diện chat - Sử dụng cấu trúc mới
        <View style={styles.chatContainer}>
          <ChatHeader
            title={conversations.find(c => c.id === currentConversationId)?.title || 'Tư vấn'}
            onBack={backToHistory}
          />
          
          <View style={styles.chatContentContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={[
                styles.messagesContent,
                { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 60 : 90 } 
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Welcome message if no messages */}
              {messages.length === 0 && (
                <WelcomeMessage
                  onAnalyzeScan={analyzeScanData}
                  onQuickQuestion={handleQuickQuestion}
                />
              )}
              
              {/* Messages */}
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onGiveFeedback={handleFeedback}
                />
              ))}
              
              {/* Loading indicator */}
              {isLoading && <LoadingBubble />}
            </ScrollView>
            
            {/* Đảm bảo input luôn ở dưới cùng */}
            <View style={styles.inputContainer}>
              <ChatInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSend={handleSend}
                isLoading={isLoading}
              />
            </View>
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
  historyContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  chatContentContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 90, // Đảm bảo khoảng cách đủ để hiển thị ô input
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    zIndex: 999, // Đảm bảo hiển thị trên cùng
    elevation: 5, // Thêm shadow cho Android
    shadowColor: COLORS.black, // Shadow cho iOS
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
});

export default AdvisorTab;