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
import GeminiService from '../../services/GeminiService';
import COLORS from '../../styles/colors';

// Components
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
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  
  const scrollViewRef = useRef();
  const inputRef = useRef();
  
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);
  
  useEffect(() => {
    loadConversations();
  }, []);
  
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
  
  const loadConversation = async (id) => {
    try {
      const msgs = await SessionStorageService.getConversationMessages(id);
      setMessages(msgs || []);
      setShowHistory(false);
    } catch (error) {
      console.error('Lỗi khi tải hội thoại:', error);
      setMessages([]);
    }
  };
  
  const saveCurrentConversation = async () => {
    if (!currentConversationId || messages.length === 0) return;
    
    try {
      await SessionStorageService.saveConversationMessages(currentConversationId, messages);
      
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
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
  
  const deleteConversation = async (id) => {
    try {
      const success = await SessionStorageService.deleteConversation(id);
      if (success) {
        const updatedConversations = conversations.filter(conv => conv.id !== id);
        setConversations(updatedConversations);
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
  
  const deleteMultipleConversations = async () => {
    if (selectedConversations.length === 0) return;
    
    try {
      for (const id of selectedConversations) {
        await SessionStorageService.deleteConversation(id);
      }
      
      const updatedConversations = conversations.filter(
        conv => !selectedConversations.includes(conv.id)
      );
      setConversations(updatedConversations);
      
      if (selectedConversations.includes(currentConversationId)) {
        setShowHistory(true);
      }
      
      setIsSelectMode(false);
      setSelectedConversations([]);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa nhiều hội thoại:', error);
      return false;
    }
  };
  
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
    
    SessionStorageService.saveConversations(updatedConversations)
      .catch(error => console.error('Lỗi khi lưu danh sách hội thoại:', error));
    
    setCurrentConversationId(newId);
    setMessages([]);
    setShowHistory(false);
  };
  
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

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input.trim();
    if (!messageText) return;

    const userMessage = { 
      id: Date.now().toString(), 
      text: messageText, 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    let tempMessages = [...messages, userMessage];

    if (!currentConversationId) {
      createNewConversation();
      // We need to wait for the state to update before proceeding
      setTimeout(() => setMessages([userMessage]), 0);
    } else {
      setMessages(tempMessages);
    }
    
    setInput('');
    Keyboard.dismiss();
    setIsLoading(true);
    
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 300);
    
    try {
      const context = {
        scanHistory: scanHistory || [],
        historyStats: historyStats || {},
        previousMessages: messages // Pass previous messages for context
      };
      
      const geminiResponse = await GeminiService.generateResponse(messageText, context);
      
      const botMessage = {
        id: Date.now().toString() + '_bot',
        text: geminiResponse.message,
        isUser: false,
        type: geminiResponse.type,
        timestamp: new Date().toISOString()
      };
      
      setMessages(currentMessages => [...currentMessages, botMessage]);
      
      setTimeout(() => {
        saveCurrentConversation();
      }, 500);
      
    } catch (error) {
      console.error('Lỗi khi gọi Gemini API:', error);
      const errorMessage = {
        id: Date.now().toString() + '_error',
        text: 'Xin lỗi, tôi gặp sự cố khi kết nối với chuyên gia AI. Vui lòng thử lại sau.',
        isUser: false,
        type: 'error',
        timestamp: new Date().toISOString()
      };
      
      setMessages(currentMessages => [...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 500);
    }
  };
  
  const handleFeedback = async (messageId, feedback) => {
    // This functionality is now simplified as direct feedback to Gemini is not implemented.
    // We can just update the local state to reflect the user's feedback action.
    try {
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, feedback: feedback };
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      await SessionStorageService.saveConversationMessages(currentConversationId, updatedMessages);
      Alert.alert('Cảm ơn bạn!', 'Cảm ơn bạn đã cung cấp phản hồi.');
      
    } catch (error) {
      console.error('Lỗi khi lưu phản hồi local:', error);
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
    
    const analysisRequestText = "Dựa vào dữ liệu quét của tôi, hãy phân tích tình hình vườn cây và đưa ra các đề xuất chi tiết.";
    
    if (!currentConversationId) {
      createNewConversation();
      setTimeout(() => {
        handleSend(analysisRequestText);
      }, 100);
    } else {
      handleSend(analysisRequestText);
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${selectedConversations.length} hội thoại đã chọn?`,
      [
        { text: 'Hủy', style: 'cancel' },
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
        </View>
      ) : (
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
            >
              {messages.length === 0 && (
                <WelcomeMessage
                  onAnalyzeScan={analyzeScanData}
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
                onSend={() => handleSend()}
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