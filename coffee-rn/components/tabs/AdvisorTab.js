// components/tabs/AdvisorTab.js (Updated)
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Platform,
  Keyboard,
  Alert,
  StyleSheet
} from 'react-native';
// Import SessionStorageService thay vì AsyncStorage
import SessionStorageService from '../../services/SessionStorageService';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Services & Utils
import AgentSystem from '../../services/AgentSystem';
import { FEEDBACK_LEVELS } from '../../services/InteractionMemoryService';
import { createScanAnalysis } from '../../utils/advisorUtils';
import COLORS from '../../styles/colors';

// Components (giữ nguyên import)
import MessageBubble from '../advisor/MessageBubble';
import LoadingBubble from '../advisor/LoadingBubble';
import WelcomeMessage from '../advisor/WelcomeMessage';
import ChatInput from '../advisor/ChatInput';
import ConversationList from '../advisor/ConversationList';
import HistoryHeader from '../advisor/HistoryHeader';
import ChatHeader from '../advisor/ChatHeader';

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
    
    // Theo dõi sự kiện bàn phím (giữ nguyên)
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // THAY ĐỔI: Sử dụng SessionStorageService
  const loadConversations = async () => {
    try {
      const savedConversations = await SessionStorageService.getConversations();
      if (savedConversations.length > 0) {
        setConversations(savedConversations);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách hội thoại:', error);
    }
  };
  
  // THAY ĐỔI: Sử dụng SessionStorageService
  const loadConversation = async (id) => {
    try {
      const messages = await SessionStorageService.getConversationMessages(id);
      setMessages(messages || []);
      setShowHistory(false);
    } catch (error) {
      console.error('Lỗi khi tải hội thoại:', error);
      setMessages([]);
    }
  };
  
  // THAY ĐỔI: Sử dụng SessionStorageService
  const saveCurrentConversation = async () => {
    if (!currentConversationId || messages.length === 0) return;
    
    try {
      // Lưu tin nhắn
      await SessionStorageService.saveConversationMessages(currentConversationId, messages);
      
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
      await SessionStorageService.saveConversations(updatedConversations);
    } catch (error) {
      console.error('Lỗi khi lưu hội thoại:', error);
    }
  };
  
  // THAY ĐỔI: Sử dụng SessionStorageService
  const deleteConversation = async (id) => {
    try {
      const success = await SessionStorageService.deleteConversation(id);
      
      if (success) {
        // Cập nhật state local
        const updatedConversations = conversations.filter(conv => conv.id !== id);
        setConversations(updatedConversations);
        
        // Nếu đang ở hội thoại bị xóa, quay lại danh sách
        if (currentConversationId === id) {
          setShowHistory(true);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Lỗi khi xóa hội thoại:', error);
      return false;
    }
  };
  
  // THAY ĐỔI: Xóa nhiều hội thoại sử dụng SessionStorageService
  const deleteMultipleConversations = async () => {
    if (selectedConversations.length === 0) return;
    
    try {
      // Xóa từng hội thoại
      for (const id of selectedConversations) {
        await SessionStorageService.deleteConversation(id);
      }
      
      // Cập nhật danh sách hội thoại local
      const updatedConversations = conversations.filter(
        conv => !selectedConversations.includes(conv.id)
      );
      
      setConversations(updatedConversations);
      
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
  
  // Tạo hội thoại mới (giữ nguyên logic)
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
    
    // Lưu vào SessionStorage
    SessionStorageService.saveConversations(updatedConversations)
      .catch(error => console.error('Lỗi khi lưu danh sách hội thoại:', error));
    
    setCurrentConversationId(newId);
    setMessages([]);
    setShowHistory(false);
  };
  
  // Các phương thức khác giữ nguyên logic cũ...
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

  // Phần còn lại của component giữ nguyên...
  // (handleSend, handleQuickQuestion, handleFeedback, etc...)
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { 
      id: Date.now().toString(), 
      text: input.trim(), 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    if (!currentConversationId) {
      createNewConversation();
      await new Promise(resolve => setTimeout(resolve, 300));
      setMessages([userMessage]);
    } else {
      setMessages([...messages, userMessage]);
    }
    
    setInput('');
    Keyboard.dismiss();
    setIsLoading(true);
    
    setTimeout(() => {
      if (scrollViewRef.current && scrollViewRef.current.scrollToEnd) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 500);
    
    try {
      const context = {
        scanHistory: scanHistory || [],
        historyStats: historyStats || {},
        previousMessages: messages
      };
      
      const agentResponse = await AgentSystem.coordinateAgents(userMessage.text, context);
      
      const botMessage = {
        id: Date.now().toString(),
        text: agentResponse.message,
        isUser: false,
        type: agentResponse.type || 'treatment',
        intent: agentResponse.intent,
        recommendationId: agentResponse.recommendationId,
        timestamp: new Date().toISOString()
      };
      
      setMessages(currentMessages => [...currentMessages, botMessage]);
      
      setTimeout(() => {
        saveCurrentConversation();
      }, 500);
      
    } catch (error) {
      console.error('Lỗi khi xử lý tin nhắn:', error);
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
      
      setTimeout(() => {
        if (scrollViewRef.current && scrollViewRef.current.scrollToEnd) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 500);
    }
  };

  // Các method khác giữ nguyên...
  const handleQuickQuestion = (question) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };
  
  const handleFeedback = async (messageId, recommendationId, feedback) => {
    if (!recommendationId) return;
    
    try {
      await AgentSystem.saveFeedback(recommendationId, feedback);
      
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
      
      await SessionStorageService.saveConversationMessages(currentConversationId, updatedMessages);
      
      Alert.alert('Cảm ơn bạn!', 'Phản hồi của bạn giúp tôi cải thiện đề xuất trong tương lai.');
      
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi:', error);
      Alert.alert('Lỗi', 'Không thể lưu phản hồi. Vui lòng thử lại sau.');
    }
  };
  
  const backToHistory = () => {
    setShowHistory(true);
    loadConversations();
  };

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
  
  const handleScanDataAnalysis = async () => {
    setIsLoading(true);
    setTimeout(() => {
      if (scrollViewRef.current && scrollViewRef.current.scrollToEnd) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 300);
    
    try {
      const analysisResult = createScanAnalysis(scanHistory, historyStats);
      
      const botMessage = {
        id: Date.now().toString(),
        text: analysisResult.message,
        isUser: false,
        type: 'analysis',
        timestamp: new Date().toISOString(),
        recommendationId: analysisResult.recommendationId
      };
      
      setMessages(currentMessages => [...currentMessages, botMessage]);
      
      setTimeout(() => {
        saveCurrentConversation();
      }, 500);
      
    } catch (error) {
      console.error('Lỗi khi phân tích dữ liệu quét:', error);
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
      
      setTimeout(() => {
        if (scrollViewRef.current && scrollViewRef.current.scrollToEnd) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 500);
    }
  };

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

  // Render component chính
  return (
    <View style={styles.container}>
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
        // Giao diện chat sử dụng KeyboardAwareScrollView
        <View style={styles.chatContainer}>
          <ChatHeader
            title={conversations.find(c => c.id === currentConversationId)?.title || 'Tư vấn'}
            onBack={backToHistory}
          />
          
          <View style={styles.chatContentContainer}>
            <KeyboardAwareScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              enableOnAndroid={true}
              enableAutomaticScroll={true}
              extraScrollHeight={150}
              extraHeight={100}
              keyboardOpeningTime={0}
            >
              {messages.length === 0 && (
                <WelcomeMessage
                  onAnalyzeScan={analyzeScanData}
                  onQuickQuestion={handleQuickQuestion}
                />
              )}
              
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onGiveFeedback={handleFeedback}
                />
              ))}
              
              {isLoading && <LoadingBubble />}
              
              <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>
            
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
    </View>
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
    display: 'flex',
    flexDirection: 'column',
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
    paddingBottom: 20,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    width: '100%',
    zIndex: 999,
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