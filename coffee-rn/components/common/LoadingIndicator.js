
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import COLORS from '../../styles/colors';

const LoadingIndicator = ({ message = 'Đang xử lý...', subMessage = 'Vui lòng đợi trong giây lát' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.message}>{message}</Text>
      {subMessage && <Text style={styles.subMessage}>{subMessage}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    margin: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  subMessage: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default LoadingIndicator;