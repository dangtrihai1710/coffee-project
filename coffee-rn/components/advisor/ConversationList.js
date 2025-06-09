
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const ConversationList = ({ 
  conversations, 
  scanHistory, 
  historyStats, 
  isSelectMode, 
  selectedConversations,
  onSelectConversation,
  onOpenConversation,
  onAnalyzeScan
}) => {
  return (
    <ScrollView style={styles.conversationsList}>
      {scanHistory && scanHistory.length > 0 && (
        <TouchableOpacity
          style={styles.scanAnalysisButton}
          onPress={onAnalyzeScan}
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
              onSelectConversation(conversation.id);
            } else {
              onOpenConversation(conversation.id);
            }
          }}
          onLongPress={() => {
            if (!isSelectMode) {
              onSelectConversation(conversation.id, true); // true for starting select mode
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
  );
};

const styles = StyleSheet.create({
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
});

export default ConversationList;