import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Modal,
  BackHandler,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5, MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CaptureCamera = () => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Ref để quản lý scroll
  const scrollViewRef = useRef(null);

  // Dữ liệu mẫu
  const recentScans = [
    { id: 1, date: '03/04/2025', result: 'Cây khoẻ (không bệnh)', confidence: '95.2%', location: 'Khu A' },
    { id: 2, date: '01/04/2025', result: 'Bệnh gỉ sắt', confidence: '87.6%', location: 'Khu B' },
    { id: 3, date: '28/03/2025', result: 'Bệnh gỉ sắt', confidence: '92.1%', location: 'Khu B' },
  ];
  
  // Dữ liệu thống kê mẫu
  const diseaseStats = [
    { name: 'Khoẻ', value: 65 },
    { name: 'Gỉ sắt', value: 18 },
    { name: 'Phoma', value: 8 },
    { name: 'Miner', value: 6 },
    { name: 'Cerco', value: 3 },
  ];

  // Capture a photo using the device camera
  const takePhoto = async () => {
    setShowImageOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập camera');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3]
    });
    if (!res.canceled) {
      // In the newer API, the result is in res.assets array
      const asset = res.assets ? res.assets[0] : res;
      setImageUri(asset.uri);
      // Không reset kết quả ở đây để người dùng có thể xem lại kết quả trước
      
      // Cuộn xuống ảnh được chụp
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 250,
          animated: true
        });
      }, 100);
    }
  };

  // Pick an image from the library
  const pickImage = async () => {
    setShowImageOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3]
    });
    if (!res.canceled) {
      const asset = res.assets ? res.assets[0] : res;
      setImageUri(asset.uri);
      // Không reset kết quả ở đây để người dùng có thể xem lại kết quả trước
      
      // Cuộn xuống ảnh được chọn
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 250,
          animated: true
        });
      }, 100);
    }
  };

  // Chọn ảnh mới - Reset kết quả và cho phép người dùng chọn lại
  const selectNewImage = () => {
    setShowImageOptions(true);
  };

  // Upload the image to your Flask API for prediction
  const uploadImage = async () => {
    if (!imageUri) return;
    setLoading(true);
    setResult(null);
    
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    });

    try {
      const response = await fetch('http://192.168.1.6:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      setResult(json);
      
      // Cuộn xuống kết quả
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 500,
          animated: true
        });
      }, 300);
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh lên server. Vui lòng kiểm tra kết nối mạng.');
      setResult({
        error: 'Không thể kết nối với server. Vui lòng thử lại sau.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị màu sắc khác nhau dựa vào kết quả
  const getResultColor = () => {
    if (!result) return '#000';
    
    if (result.error) return '#d9534f'; // Đỏ cho lỗi
    
    if (result.predicted_label.includes("Không phải lá")) {
      return '#d9534f'; // Đỏ cho không phải lá cà phê
    }
    
    if (result.warning) {
      return '#f0ad4e'; // Vàng cho cảnh báo
    }
    
    if (result.predicted_label.includes("khoẻ")) {
      return '#5cb85c'; // Xanh lá cho cây khỏe
    }
    
    return '#d9534f'; // Đỏ cho cây bệnh
  };

  // Hiển thị biểu tượng dựa vào kết quả
  const getResultIcon = () => {
    if (!result || result.error) return null;
    
    if (result.predicted_label.includes("Không phải lá")) {
      return "❌";
    }
    
    if (result.warning) {
      return "⚠️";
    }
    
    if (result.predicted_label.includes("khoẻ")) {
      return "✅";
    }
    
    return "🩺";
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'scan':
        return renderScanTab();
      case 'history':
        return renderHistoryTab();
      case 'map':
        return renderMapTab();
      case 'treatment':
        return renderTreatmentTab();
      case 'help':
        return renderHelpTab();
      default:
        return renderScanTab();
    }
  }

  // Render Scan Tab
  const renderScanTab = () => {
    return (
      <View style={styles.contentContainer}>
        <View style={styles.imageSelectionCard}>
          <Text style={styles.sectionTitle}>Phân tích lá cà phê</Text>
          
          {imageUri ? (
            // Hiển thị ảnh đã chọn
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              
              <View style={styles.imageActionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={selectNewImage}
                >
                  <FontAwesome5 name="image" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Đổi ảnh</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonPrimary, loading && styles.disabledButton]}
                  onPress={uploadImage}
                  disabled={loading}
                >
                  <FontAwesome5 name="search" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {loading ? 'Đang xử lý...' : 'Nhận diện'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Hiển thị giao diện chọn ảnh
            <View style={styles.imagePlaceholder}>
              <FontAwesome5 name="leaf" size={48} color="#216520" />
              <Text style={styles.placeholderText}>Chọn hoặc chụp ảnh lá cà phê để phân tích</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={takePhoto}
                >
                  <FontAwesome5 name="camera" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Chụp ảnh</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={pickImage}
                >
                  <FontAwesome5 name="images" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Thư viện</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#216520" />
            <Text style={styles.loadingText}>Đang phân tích ảnh...</Text>
            <Text style={styles.loadingSubtext}>Vui lòng đợi trong giây lát</Text>
          </View>
        )}
        
        {result && (
          <View style={[styles.resultContainer, { borderColor: getResultColor() }]}>
            {result.error ? (
              <View>
                <Text style={styles.errorText}>Lỗi: {result.error}</Text>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonSecondary, styles.retryButton]}
                  onPress={selectNewImage}
                >
                  <Text style={styles.actionButtonText}>Thử lại với ảnh khác</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultTitle, { color: getResultColor() }]}>
                    {getResultIcon()} {result.predicted_label}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.newScanButton}
                    onPress={selectNewImage}
                  >
                    <FontAwesome5 name="sync-alt" size={14} color="#216520" />
                    <Text style={styles.newScanButtonText}>Quét mới</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.confidenceText}>
                  Độ tin cậy: {result.confidence}
                </Text>
                
                {result.warning && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>⚠️ {result.warning}</Text>
                    <Text style={styles.warningSubtext}>
                      Hãy thử chụp hình rõ nét hơn trong điều kiện ánh sáng tốt
                    </Text>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.actionButtonWarning, styles.retryButton]}
                      onPress={selectNewImage}
                    >
                      <Text style={styles.actionButtonText}>Thử lại với ảnh khác</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {result.predicted_label.includes("Bệnh") && !result.warning && (
                  <View style={styles.diseaseAdviceContainer}>
                    <Text style={styles.diseaseAdvice}>
                      Hãy kiểm tra kỹ lá cây và có biện pháp xử lý phù hợp
                    </Text>
                    
                    <View style={styles.treatmentContainer}>
                      <Text style={styles.treatmentTitle}>
                        Gợi ý điều trị:
                      </Text>
                      <Text style={styles.treatmentText}>
                        • Kiểm tra và cô lập các cây bị bệnh
                      </Text>
                      <Text style={styles.treatmentText}>
                        • Loại bỏ các lá bị nhiễm bệnh nặng
                      </Text>
                      <Text style={styles.treatmentText}>
                        • Sử dụng thuốc trừ nấm phù hợp
                      </Text>
                      <Text style={styles.treatmentText}>
                        • Theo dõi sự phát triển của bệnh
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.resultAction}>
                    <FontAwesome5 name="save" size={16} color="#216520" />
                    <Text style={styles.resultActionText}>Lưu</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.resultAction}>
                    <FontAwesome5 name="share-alt" size={16} color="#216520" />
                    <Text style={styles.resultActionText}>Chia sẻ</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.resultAction}>
                    <FontAwesome5 name="print" size={16} color="#216520" />
                    <Text style={styles.resultActionText}>In báo cáo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Scans Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Lần quét gần đây</Text>
          {recentScans.map(scan => (
            <TouchableOpacity 
              key={scan.id} 
              style={[
                styles.scanItem, 
                { 
                  borderLeftColor: scan.result.includes('khoẻ') ? '#5cb85c' : '#d9534f',
                  backgroundColor: scan.result.includes('khoẻ') ? '#f4fff4' : '#fff4f4'
                }
              ]}
            >
              <View style={styles.scanItemHeader}>
                <Text style={styles.scanItemTitle}>{scan.result}</Text>
                <Text style={styles.scanItemDate}>{scan.date}</Text>
              </View>
              <View style={styles.scanItemDetails}>
                <Text style={styles.scanItemDetail}>Độ tin cậy: {scan.confidence}</Text>
                <Text style={styles.scanItemDetail}>{scan.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>Xem tất cả</Text>
            <FontAwesome5 name="chevron-right" size={12} color="#216520" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thống kê trang trại</Text>
          <View style={styles.statsContainer}>
            {diseaseStats.map(stat => (
              <View key={stat.name} style={styles.statItem}>
                <View style={styles.statBarContainer}>
                  <View 
                    style={[
                      styles.statBarFill,
                      {
                        height: `${stat.value}%`,
                        backgroundColor: stat.name === 'Khoẻ' ? '#5cb85c' : '#d9534f'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.statName}>{stat.name}</Text>
                <Text style={styles.statValue}>{stat.value}%</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>Báo cáo chi tiết</Text>
            <FontAwesome5 name="chevron-right" size={12} color="#216520" />
          </TouchableOpacity>
        </View>
          
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>Mẹo chụp ảnh tốt:</Text>
          <Text style={styles.tipText}>• Chụp ở nơi có ánh sáng tự nhiên</Text>
          <Text style={styles.tipText}>• Chụp cận cảnh, lấy nét vào lá</Text>
          <Text style={styles.tipText}>• Giữ camera ổn định, tránh rung lắc</Text>
          <Text style={styles.tipText}>• Đặt lá trên nền đối lập để dễ nhận diện</Text>
        </View>
      </View>
    );
  };

  // Render History Tab
  const renderHistoryTab = () => {
    return (
      <View style={styles.comingSoonContainer}>
        <MaterialIcons name="history" size={48} color="#888" />
        <Text style={styles.comingSoonTitle}>Lịch sử chẩn đoán</Text>
        <Text style={styles.comingSoonText}>
          Tính năng đang được phát triển. Bạn sẽ có thể xem lịch sử các lần chẩn đoán và theo dõi tiến triển của bệnh.
        </Text>
      </View>
    );
  };

  // Render Map Tab
  const renderMapTab = () => {
    return (
      <View style={styles.comingSoonContainer}>
        <FontAwesome5 name="map-marked-alt" size={48} color="#888" />
        <Text style={styles.comingSoonTitle}>Bản đồ trang trại</Text>
        <Text style={styles.comingSoonText}>
          Tính năng đang được phát triển. Bạn sẽ có thể đánh dấu vị trí cây bị bệnh và xem phân bố bệnh trên bản đồ.
        </Text>
      </View>
    );
  };

  // Render Treatment Tab
  const renderTreatmentTab = () => {
    return (
      <View style={styles.comingSoonContainer}>
        <FontAwesome5 name="leaf" size={48} color="#888" />
        <Text style={styles.comingSoonTitle}>Gợi ý điều trị</Text>
        <Text style={styles.comingSoonText}>
          Tính năng đang được phát triển. Bạn sẽ nhận được gợi ý cụ thể về cách điều trị các loại bệnh trên cây cà phê.
        </Text>
      </View>
    );
  };

  // Render Help Tab
  const renderHelpTab = () => {
    return (
      <View style={styles.comingSoonContainer}>
        <FontAwesome5 name="question-circle" size={48} color="#888" />
        <Text style={styles.comingSoonTitle}>Trợ giúp</Text>
        <Text style={styles.comingSoonText}>
          Tính năng đang được phát triển. Bạn sẽ có thể tìm kiếm câu trả lời cho các câu hỏi thường gặp và liên hệ hỗ trợ.
        </Text>
      </View>
    );
  };
  
  // Modal lựa chọn cách lấy ảnh mới
  const renderImageOptionsModal = () => {
    return (
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageOptions(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn ảnh mới</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <FontAwesome5 name="camera" size={24} color="#216520" />
              <Text style={styles.modalOptionText}>Chụp ảnh mới</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <FontAwesome5 name="images" size={24} color="#216520" />
              <Text style={styles.modalOptionText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#216520" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coffee Care</Text>
        <Text style={styles.headerSubtitle}>Hệ thống chẩn đoán bệnh cây cà phê</Text>
      </View>
      
      {/* Main Content */}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        {renderMainContent()}
      </ScrollView>
      
      {/* Modal lựa chọn ảnh */}
      {renderImageOptionsModal()}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('scan')}
        >
          <FontAwesome5 
            name="camera" 
            size={20} 
            color={activeTab === 'scan' ? '#216520' : '#777'} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'scan' ? '#216520' : '#777'}
          ]}>Quét</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('history')}
        >
          <MaterialIcons 
            name="history" 
            size={20} 
            color={activeTab === 'history' ? '#216520' : '#777'} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'history' ? '#216520' : '#777'}
          ]}>Lịch sử</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('map')}
        >
          <FontAwesome5 
            name="map-marked-alt" 
            size={20} 
            color={activeTab === 'map' ? '#216520' : '#777'} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'map' ? '#216520' : '#777'}
          ]}>Bản đồ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('treatment')}
        >
          <FontAwesome5 
            name="leaf" 
            size={20} 
            color={activeTab === 'treatment' ? '#216520' : '#777'} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'treatment' ? '#216520' : '#777'}
          ]}>Điều trị</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('help')}
        >
          <FontAwesome5 
            name="question-circle" 
            size={20} 
            color={activeTab === 'help' ? '#216520' : '#777'} 
          />
          <Text style={[
            styles.navText, 
            {color: activeTab === 'help' ? '#216520' : '#777'}
          ]}>Trợ giúp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#216520',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ddf5dd',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    padding: 15,
  },
  // Các style cho phần chọn ảnh
  imageSelectionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    resizeMode: 'cover',
    marginVertical: 10,
  },
  imageActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonPrimary: {
    backgroundColor: '#216520',
    flex: 2,
    marginLeft: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#3949ab',
    flex: 1,
  },
  actionButtonWarning: {
    backgroundColor: '#f0ad4e',
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  retryButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    elevation: 0,
    opacity: 0.7,
  },
  // Các style cho phần loading
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#216520',
    fontWeight: 'bold',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  // Các style cho phần kết quả
  resultContainer: {
    marginVertical: 15,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderLeftWidth: 8,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  newScanButtonText: {
    fontSize: 12,
    color: '#216520',
    marginLeft: 5,
  },
  confidenceText: {
    fontSize: 15,
    marginBottom: 10,
    color: '#555',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 15,
    color: '#856404',
    fontWeight: 'bold',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
    marginTop: 5,
  },
  diseaseAdviceContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  diseaseAdvice: {
    fontSize: 15,
    color: '#721c24',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  treatmentContainer: {
    backgroundColor: '#e8f4f8',
    padding: 10,
    borderRadius: 5,
  },
  treatmentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 8,
  },
  treatmentText: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    textAlign: 'center',
    marginBottom: 10,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resultAction: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  resultActionText: {
    fontSize: 12,
    color: '#216520',
    marginTop: 5,
  },
  // Các style cho phần Recent Scans
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  scanItem: {
    borderLeftWidth: 4,
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
  },
  scanItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  scanItemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  scanItemDate: {
    fontSize: 12,
    color: '#777',
  },
  scanItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanItemDetail: {
    fontSize: 12,
    color: '#555',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#216520',
    marginRight: 5,
  },
  // Các style cho phần thống kê
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    width: '18%',
  },
  statBarContainer: {
    width: 20,
    height: 120,
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  statBarFill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  statName: {
    fontSize: 12,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Các style cho phần mẹo
  tipContainer: {
    backgroundColor: '#e6f7ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0062cc',
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  // Modal lựa chọn ảnh
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  modalCancelButton: {
    marginTop: 15,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  // Các style cho Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  // Coming Soon screens
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default CaptureCamera;