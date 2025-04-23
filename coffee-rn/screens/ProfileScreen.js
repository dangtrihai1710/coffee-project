// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import COLORS from '../styles/colors';

const ProfileScreen = ({ onLogout }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AuthService.getUserData();
      if (data) {
        setUserData(data);
        setEditedData(data);
      } else {
        // Thêm hồ sơ mặc định nếu không có dữ liệu
        const defaultData = {
          fullName: 'Người dùng',
          email: 'user@example.com',
          phone: '',
          createdAt: new Date().toISOString()
        };
        setUserData(defaultData);
        setEditedData(defaultData);
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin người dùng:', error);
      // Tạo dữ liệu mặc định nếu có lỗi
      const defaultData = {
        fullName: 'Người dùng',
        email: 'user@example.com',
        phone: '',
        createdAt: new Date().toISOString()
      };
      setUserData(defaultData);
      setEditedData(defaultData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);

    try {
      // Kiểm tra email
      if (editedData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editedData.email)) {
          Alert.alert('Lỗi', 'Email không đúng định dạng');
          setIsLoading(false);
          return;
        }
      }
      
      // Kiểm tra số điện thoại
      if (editedData.phone) {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(editedData.phone)) {
          Alert.alert('Lỗi', 'Số điện thoại không đúng định dạng');
          setIsLoading(false);
          return;
        }
      }

      try {
        const result = await AuthService.updateUserData(editedData);
        setUserData(result.user);
        setIsEditing(false);
        Alert.alert('Thành công', 'Thông tin đã được cập nhật');
      } catch (error) {
        console.error('Lỗi cập nhật:', error);
        // Vẫn cập nhật giao diện người dùng trong trường hợp offline
        setUserData(editedData);
        setIsEditing(false);
        Alert.alert('Thành công', 'Thông tin đã được cập nhật (chế độ offline)');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedData(userData);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoading(true);
    
    try {
      await AuthService.logout();
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        console.error('onLogout không phải là hàm');
        Alert.alert('Lỗi', 'Không thể đăng xuất do lỗi hệ thống. Vui lòng thử lại.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        {!isEditing && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <FontAwesome5 name="edit" size={16} color={COLORS.white} />
            <Text style={styles.editButtonText}>Sửa</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{userData?.fullName || 'Người dùng'}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoLabel}>
              <FontAwesome5 name="envelope" size={16} color={COLORS.primary} />
              <Text style={styles.infoLabelText}>Email</Text>
            </View>
            
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editedData.email}
                onChangeText={(text) => setEditedData({...editedData, email: text})}
                placeholder="Nhập email"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.infoValue}>{userData?.email || 'Chưa cập nhật'}</Text>
            )}
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoLabel}>
              <FontAwesome5 name="phone-alt" size={16} color={COLORS.primary} />
              <Text style={styles.infoLabelText}>Điện thoại</Text>
            </View>
            
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editedData.phone}
                onChangeText={(text) => setEditedData({...editedData, phone: text})}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{userData?.phone || 'Chưa cập nhật'}</Text>
            )}
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoLabel}>
              <FontAwesome5 name="calendar-alt" size={16} color={COLORS.primary} />
              <Text style={styles.infoLabelText}>Ngày tham gia</Text>
            </View>
            
            <Text style={styles.infoValue}>
              {userData?.createdAt 
                ? new Date(userData.createdAt).toLocaleDateString('vi-VN') 
                : 'Không xác định'}
            </Text>
          </View>
        </View>

        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveChanges}
            >
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isEditing && (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bảo mật</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 name="lock" size={16} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 name="shield-alt" size={16} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Cài đặt riêng tư</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cài đặt ứng dụng</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 name="bell" size={16} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Thông báo</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 name="language" size={16} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Ngôn ngữ</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 name="question-circle" size={16} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Trợ giúp & Hỗ trợ</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutConfirm(true)}
          >
            <FontAwesome5 name="sign-out-alt" size={16} color={COLORS.white} />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
          
          <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
        </>
      )}

      {/* Modal xác nhận đăng xuất */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.modalText}>Bạn có chắc chắn muốn đăng xuất?</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.modalCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleLogout}
              >
                <Text style={styles.modalConfirmButtonText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    marginBottom: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoLabelText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    paddingLeft: 24,
  },
  editInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 24,
    color: COLORS.text,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.grayLight,
    marginRight: 10,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  modalText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  modalCancelButton: {
    backgroundColor: COLORS.grayLight,
  },
  modalCancelButtonText: {
    color: COLORS.textSecondary,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  modalConfirmButtonText: {
    color: COLORS.white,
  },
});