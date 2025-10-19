
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const WelcomeMessage = ({ onAnalyzeScan }) => {
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
            <Text style={styles.agentInfoTitle}>Tư vấn chuyên sâu</Text>
            <Text style={styles.agentInfoDesc}>Hỏi đáp về mọi vấn đề của cây cà phê</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.welcomeText}>
        Bắt đầu bằng cách hỏi tôi một câu hỏi, hoặc yêu cầu phân tích dữ liệu đã quét.
      </Text>
      
      <View style={styles.suggestionsContainer}>
        <TouchableOpacity 
          style={styles.suggestionButton}
          onPress={onAnalyzeScan}
        >
          <Text style={styles.suggestionText}>Phân tích dữ liệu quét của tôi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default WelcomeMessage;