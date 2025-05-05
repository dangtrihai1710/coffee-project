// components/advisor/HistoryHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const HistoryHeader = ({ 
  isSelectMode, 
  selectedConversations, 
  onCreateNewConversation,
  onToggleSelectMode,
  onCancelSelect,
  onDeleteSelected
}) => {
  return (
    <View style={styles.historyHeader}>
      <Text style={styles.historyTitle}>Tư vấn</Text>
      <View style={styles.headerButtons}>
        {isSelectMode ? (
          <>
            <TouchableOpacity
              style={[styles.headerButton, styles.cancelButton]}
              onPress={onCancelSelect}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            
            {selectedConversations.length > 0 && (
              <TouchableOpacity
                style={[styles.headerButton, styles.deleteButton]}
                onPress={onDeleteSelected}
              >
                <FontAwesome5 name="trash" size={14} color={COLORS.white} />
                <Text style={styles.deleteButtonText}>Xóa ({selectedConversations.length})</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.headerButton, styles.selectButton]}
              onPress={onToggleSelectMode}
            >
              <FontAwesome5 name="check-square" size={14} color={COLORS.white} />
              <Text style={styles.selectButtonText}>Chọn</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerButton, styles.newChatButton]}
              onPress={onCreateNewConversation}
            >
              <FontAwesome5 name="plus" size={14} color={COLORS.white} />
              <Text style={styles.newChatButtonText}>Mới</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default HistoryHeader;