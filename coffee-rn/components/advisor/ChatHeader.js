
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const ChatHeader = ({ title, onBack }) => {
  return (
    <View style={styles.chatHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <FontAwesome5 name="arrow-left" size={18} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.chatTitle}>
        {title || 'Tư vấn'}
      </Text>
      <View style={{width: 30}}>
        {/* Để cân bằng header - đảm bảo không có text trực tiếp ở đây */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default ChatHeader;