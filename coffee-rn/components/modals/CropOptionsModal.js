// components/modals/CropOptionsModal.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import COLORS from '../../styles/colors';

const CropOptionsModal = ({ visible, onClose, onCropImage, isCropping }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Nếu đang trong quá trình cắt, không cho phép đóng modal
        if (!isCropping) onClose();
      }}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => {
          // Nếu đang trong quá trình cắt, không cho phép đóng modal
          if (!isCropping) onClose();
        }}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn kiểu cắt ảnh</Text>
          
          {isCropping ? (
            <View style={styles.cropLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.cropLoadingText}>Đang xử lý ảnh...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.cropOptionCard} 
                onPress={() => onCropImage('auto')}
              >
                <View style={styles.cropOptionIcon}>
                  <FontAwesome5 name="crop-alt" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.cropOptionContent}>
                  <Text style={styles.cropOptionTitle}>Cắt tự động</Text>
                  <Text style={styles.cropOptionDesc}>Cắt ảnh với tỷ lệ chuẩn 4:3 cho nhận diện tốt nhất</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cropOptionCard} 
                onPress={() => onCropImage('custom')}
              >
                <View style={styles.cropOptionIcon}>
                  <FontAwesome5 name="edit" size={24} color={COLORS.secondary} />
                </View>
                <View style={styles.cropOptionContent}>
                  <Text style={styles.cropOptionTitle}>Cắt tùy chỉnh</Text>
                  <Text style={styles.cropOptionDesc}>Tự chọn vùng cần phân tích trên ảnh</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cropOptionCard} 
                onPress={() => onCropImage('full')}
              >
                <View style={styles.cropOptionIcon}>
                  <FontAwesome5 name="expand" size={24} color={COLORS.gray} />
                </View>
                <View style={styles.cropOptionContent}>
                  <Text style={styles.cropOptionTitle}>Sử dụng ảnh gốc</Text>
                  <Text style={styles.cropOptionDesc}>Dùng toàn bộ ảnh mà không cắt</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={onClose}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
            </>
          )}
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
  cropOptionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
  },
  cropOptionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cropOptionContent: {
    flex: 1,
  },
  cropOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  cropOptionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cropLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cropLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
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

export default CropOptionsModal;