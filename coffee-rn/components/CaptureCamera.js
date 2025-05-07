// components/CaptureCamera.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  SafeAreaView, 
  StatusBar,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// Tabs
import ScanTab from './tabs/ScanTab';
import HistoryTab from './tabs/HistoryTab';
import MapTab from './tabs/MapTab';
import TreatmentTab from './tabs/TreatmentTab';
import HelpTab from './tabs/HelpTab';
import ProfileScreen from '../screens/ProfileScreen';
import AdvisorTab from './tabs/AdvisorTab'; // Import tab mới

// Services
import StorageService from '../services/StorageService';
import AuthService from '../services/AuthService';

// Styles
import COLORS from '../styles/colors';

const { width, height } = Dimensions.get('window');

const CaptureCamera = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanHistory, setScanHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState({
    totalScans: 0,
    healthyTrees: 0,
    diseasedTrees: 0,
    diseases: {}
  });
  const [userName, setUserName] = useState('');
  
  // Lấy thông tin người dùng khi component mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userData = await AuthService.getUserData();
        if (userData && userData.fullName) {
          setUserName(userData.fullName);
        } else {
          // Nếu không có userData hoặc fullName, đặt tên mặc định
          setUserName('User');
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        setUserName('User'); // Đặt tên mặc định nếu có lỗi
      }
    };
    
    getUserInfo();
  }, []);
  
  // UseEffect để tải lịch sử quét khi component mount và khi chuyển tab
  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'advisor') {
      loadScanHistory();
    }
  }, [activeTab]);

  // Hàm lấy lịch sử quét
  const loadScanHistory = async () => {
    try {
      const history = await StorageService.getScanHistory();
      setScanHistory(history || []);
      updateHistoryStats(history || []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử quét:', error);
      setScanHistory([]);
      updateHistoryStats([]);
    }
  };

// Hàm cập nhật thống kê (khoảng dòng 140)
const updateHistoryStats = (history) => {
  if (!history || history.length === 0) {
    setHistoryStats({
      totalScans: 0,
      healthyTrees: 0,
      diseasedTrees: 0,
      notCoffeeTrees: 0, // Thêm dòng này
      diseases: {}
    });
    return;
  }

  const totalScans = history.length;
  const healthyTrees = history.filter(scan => scan.result && scan.result.includes('khoẻ')).length;
  const notCoffeeTrees = history.filter(scan => scan.result && scan.result.includes('Không phải lá')).length; // Thêm dòng này
  const diseasedTrees = totalScans - healthyTrees - notCoffeeTrees; // Sửa dòng này

  // Thống kê các loại bệnh
  const diseases = history.reduce((acc, scan) => {
    if (scan.result && !scan.result.includes('khoẻ') && !scan.result.includes('Không phải lá')) { // Sửa điều kiện này
      // Lấy tên bệnh từ kết quả
      const diseaseName = scan.result.includes('gỉ sắt') ? 'Gỉ sắt' :
                        scan.result.includes('phoma') ? 'Phoma' :
                        scan.result.includes('miner') ? 'Miner' :
                        scan.result.includes('cercospora') ? 'Cerco' : 'Khác';
      acc[diseaseName] = (acc[diseaseName] || 0) + 1;
    }
    return acc;
  }, {});

  setHistoryStats({
    totalScans,
    healthyTrees,
    diseasedTrees,
    notCoffeeTrees, // Thêm dòng này
    diseases
  });
};

  // Hàm thêm kết quả quét mới vào lịch sử
  const addScanToHistory = async (scanResult, imageUri) => {
    try {
      // Tạo đối tượng lưu trữ lịch sử quét
      const newScan = {
        id: Date.now().toString(), // Dùng timestamp làm ID
        date: new Date().toLocaleDateString('vi-VN'), // Format ngày tháng theo tiếng Việt
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        result: scanResult.predicted_label,
        confidence: scanResult.confidence,
        location: 'Vị trí hiện tại', // Có thể cập nhật để lấy vị trí thực tế nếu cần
        image: imageUri, // Lưu URI của ảnh đã quét
        warning: scanResult.warning || null
      };

      const updatedHistory = await StorageService.addScanToHistory(newScan);
      if (updatedHistory) {
        setScanHistory(updatedHistory);
        updateHistoryStats(updatedHistory);
      }
    } catch (error) {
      console.error('Lỗi khi thêm kết quả quét vào lịch sử:', error);
    }
  };

  // Hàm xóa một mục trong lịch sử
  const deleteHistoryItem = async (id) => {
    try {
      const updatedHistory = await StorageService.removeScanFromHistory(id);
      if (updatedHistory) {
        setScanHistory(updatedHistory);
        updateHistoryStats(updatedHistory);
      }
    } catch (error) {
      console.error('Lỗi khi xóa mục lịch sử:', error);
    }
  };

  // Hàm xóa toàn bộ lịch sử
  const clearAllHistory = async () => {
    try {
      const success = await StorageService.clearScanHistory();
      if (success) {
        setScanHistory([]);
        updateHistoryStats([]);
      }
      return success;
    } catch (error) {
      console.error('Lỗi khi xóa toàn bộ lịch sử:', error);
      return false;
    }
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      console.error('onLogout không phải là hàm');
    }
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'scan':
        return (
          <ScanTab 
            scanHistory={scanHistory} 
            historyStats={historyStats}
            onScanComplete={addScanToHistory}
            onViewAllHistory={() => setActiveTab('history')}
          />
        );
      case 'history':
        return (
          <HistoryTab 
            scanHistory={scanHistory} 
            historyStats={historyStats}
            onDeleteItem={deleteHistoryItem}
            onDeleteAll={clearAllHistory}
            onViewScan={(item) => {
              // Logic để xem lại kết quả quét
              setActiveTab('scan');
              // Có thể truyền dữ liệu để hiển thị lại kết quả quét này
            }}
          />
        );
      case 'map':
        return <MapTab />;
      case 'treatment':
        return <TreatmentTab />;
      case 'advisor':
        return (
          <AdvisorTab 
            scanHistory={scanHistory}
            historyStats={historyStats}
          />
        );
      case 'profile':
        // Đảm bảo onLogout luôn là một hàm
        return <ProfileScreen onLogout={handleLogout} />;
      case 'help':
        return <HelpTab />;
      default:
        return <ScanTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Coffee Care</Text>
            <Text style={styles.headerSubtitle}>Hệ thống chẩn đoán bệnh cây cà phê</Text>
          </View>
          <TouchableOpacity 
            style={styles.userButton}
            onPress={() => setActiveTab('profile')}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Main Content - Không còn bọc trong ScrollView */}
      <View style={styles.mainContent}>
        {renderMainContent()}
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('scan')}
        >
          <FontAwesome5 
            name="camera" 
            size={20} 
            color={activeTab === 'scan' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'scan' ? COLORS.primary : COLORS.textMuted}
          ]}>Quét</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('history')}
        >
          <MaterialIcons 
            name="history" 
            size={20} 
            color={activeTab === 'history' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'history' ? COLORS.primary : COLORS.textMuted}
          ]}>Lịch sử</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('advisor')}
        >
          <FontAwesome5 
            name="robot" 
            size={20} 
            color={activeTab === 'advisor' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'advisor' ? COLORS.primary : COLORS.textMuted}
          ]}>Tư vấn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('treatment')}
        >
          <FontAwesome5 
            name="leaf" 
            size={20} 
            color={activeTab === 'treatment' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'treatment' ? COLORS.primary : COLORS.textMuted}
          ]}>Điều trị</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('profile')}
        >
          <FontAwesome5 
            name="user" 
            size={20} 
            color={activeTab === 'profile' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'profile' ? COLORS.primary : COLORS.textMuted}
          ]}>Hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ddf5dd',
  },
  userButton: {
    padding: 4,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1, // Chiếm toàn bộ không gian còn lại
  },
  // Các style cho Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayMedium,
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default CaptureCamera;