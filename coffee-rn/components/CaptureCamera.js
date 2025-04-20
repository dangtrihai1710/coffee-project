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

// Services
import StorageService from '../services/StorageService';

// Styles
import COLORS from '../styles/colors';

const { width, height } = Dimensions.get('window');

const CaptureCamera = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanHistory, setScanHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState({
    totalScans: 0,
    healthyTrees: 0,
    diseasedTrees: 0,
    diseases: {}
  });
  
  // UseEffect để tải lịch sử quét khi component mount và khi chuyển tab
  useEffect(() => {
    if (activeTab === 'history') {
      loadScanHistory();
    }
  }, [activeTab]);

  // Hàm lấy lịch sử quét
  const loadScanHistory = async () => {
    const history = await StorageService.getScanHistory();
    setScanHistory(history);
    updateHistoryStats(history);
  };

  // Hàm cập nhật thống kê
  const updateHistoryStats = (history) => {
    if (!history || history.length === 0) {
      setHistoryStats({
        totalScans: 0,
        healthyTrees: 0,
        diseasedTrees: 0,
        diseases: {}
      });
      return;
    }

    const totalScans = history.length;
    const healthyTrees = history.filter(scan => scan.result.includes('khoẻ')).length;
    const diseasedTrees = totalScans - healthyTrees;

    // Thống kê các loại bệnh
    const diseases = history.reduce((acc, scan) => {
      if (!scan.result.includes('khoẻ') && !scan.result.includes('Không phải lá')) {
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
      diseases
    });
  };

  // Hàm thêm kết quả quét mới vào lịch sử
  const addScanToHistory = async (scanResult, imageUri) => {
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
  };

  // Hàm xóa một mục trong lịch sử
  const deleteHistoryItem = async (id) => {
    const updatedHistory = await StorageService.removeScanFromHistory(id);
    if (updatedHistory) {
      setScanHistory(updatedHistory);
      updateHistoryStats(updatedHistory);
    }
  };

  // Hàm xóa toàn bộ lịch sử
  const clearAllHistory = async () => {
    const success = await StorageService.clearScanHistory();
    if (success) {
      setScanHistory([]);
      updateHistoryStats([]);
    }
    return success;
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
        <Text style={styles.headerTitle}>Coffee Care</Text>
        <Text style={styles.headerSubtitle}>Hệ thống chẩn đoán bệnh cây cà phê</Text>
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
          onPress={() => setActiveTab('map')}
        >
          <FontAwesome5 
            name="map-marked-alt" 
            size={20} 
            color={activeTab === 'map' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'map' ? COLORS.primary : COLORS.textMuted}
          ]}>Bản đồ</Text>
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
          onPress={() => setActiveTab('help')}
        >
          <FontAwesome5 
            name="question-circle" 
            size={20} 
            color={activeTab === 'help' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'help' ? COLORS.primary : COLORS.textMuted}
          ]}>Trợ giúp</Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ddf5dd',
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