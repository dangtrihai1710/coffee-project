// components/modals/ImagePickerModal.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const ImagePickerModal = ({ visible, onClose, onTakePhoto, onPickImage, onPickMultipleImages }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn ảnh mới</Text>
          
          <TouchableOpacity 
            style={styles.modalOption} 
            onPress={() => {
              onClose();
              onTakePhoto();
            }}
          >
            <FontAwesome5 name="camera" size={24} color={COLORS.primary} />
            <Text style={styles.modalOptionText}>Chụp ảnh mới</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption} 
            onPress={() => {
              onClose();
              onPickImage();
            }}
          >
            <FontAwesome5 name="image" size={24} color={COLORS.primary} />
            <Text style={styles.modalOptionText}>Chọn 1 ảnh từ thư viện</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalOption} 
            onPress={() => {
              onClose();
              onPickMultipleImages();
            }}
          >
            <FontAwesome5 name="images" size={24} color={COLORS.primary} />
            <Text style={styles.modalOptionText}>Chọn nhiều ảnh từ thư viện</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 15,
    color: COLORS.text,
  },
  modalCancelButton: {
    marginTop: 15,
    padding: 15,
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 5,
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default ImagePickerModal;