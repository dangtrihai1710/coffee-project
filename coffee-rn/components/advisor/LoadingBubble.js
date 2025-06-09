
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import COLORS from '../../styles/colors';

const LoadingBubble = () => {
  return (
    <View style={styles.loadingBubble}>
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text style={styles.loadingText}>Đang soạn tin nhắn...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default LoadingBubble;