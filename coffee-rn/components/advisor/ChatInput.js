// components/advisor/ChatInput.js
import React, { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const ChatInput = forwardRef(({ value, onChangeText, onSend, isLoading }, ref) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        ref={ref}
        style={styles.input}
        placeholder="Hỏi về chăm sóc cây cà phê..."
        value={value}
        onChangeText={onChangeText}
        multiline
        maxHeight={80}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          !value.trim() && styles.disabledButton
        ]}
        onPress={onSend}
        disabled={!value.trim() || isLoading}
      >
        <FontAwesome5 
          name="paper-plane" 
          size={18} 
          color={value.trim() ? COLORS.white : COLORS.grayMedium} 
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    alignItems: 'flex-end',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: COLORS.grayMedium,
  },
});

export default ChatInput;