// components/advisor/MessageBubble.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import COLORS from '../../styles/colors';
import { FEEDBACK_LEVELS } from '../../services/InteractionMemoryService';

// Biểu tượng cho các agents
const AGENT_ICONS = {
  analysis: 'chart-pie',
  treatment: 'book-medical',
  system: 'robot',
  error: 'exclamation-triangle'
};

const MessageBubble = ({ message, onGiveFeedback }) => {
  return (
    <View 
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
      
      {message.isUser ? (
        <Text style={[
          styles.messageText,
          styles.userMessageText
        ]}>
          {message.text}
        </Text>
      ) : (
        <Markdown style={{
          body: styles.messageText,
          text: styles.botMessageText,
          heading1: styles.botMessageText,
          heading2: styles.botMessageText,
          heading3: styles.botMessageText,
          heading4: styles.botMessageText,
          heading5: styles.botMessageText,
          heading6: styles.botMessageText,
          paragraph: styles.botMessageText,
          list: styles.botMessageText,
          listItem: styles.botMessageText,
          bullet: styles.botMessageText,
        }}>
          {message.text}
        </Markdown>
      )}
      
      {/* Feedback buttons for recommendations */}
      {!message.isUser && message.recommendationId && !message.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackQuestion}>Đề xuất này có hữu ích không?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity 
              style={styles.feedbackButton}
              onPress={() => onGiveFeedback(
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
              onPress={() => onGiveFeedback(
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
  );
};

const styles = StyleSheet.create({
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
});

export default MessageBubble;