// components/tabs/ScanTab.js
import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet,
  ScrollView,
  TouchableOpacity, 
  Alert,
  FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { FontAwesome5 } from '@expo/vector-icons';

// Components
import LoadingIndicator from '../common/LoadingIndicator';
import ResultDisplay from '../common/ResultDisplay';
import ImagePickerModal from '../modals/ImagePickerModal';
import CropOptionsModal from '../modals/CropOptionsModal';

// Services
import ApiService from '../../services/ApiService';

// Styles
import COLORS from '../../styles/colors';
import commonStyles from '../../styles/commonStyles';

const ScanTab = ({ scanHistory = [], historyStats = {}, onScanComplete, onViewAllHistory }) => {
  const [imageUris, setImageUris] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [originalImageUri, setOriginalImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingQueue, setProcessingQueue] = useState([]); // Hàng đợi xử lý ảnh
  const [processingIndex, setProcessingIndex] = useState(-1); // Chỉ số ảnh đang xử lý
  const [results, setResults] = useState([]); // Mảng kết quả cho nhiều ảnh
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showCropOptions, setShowCropOptions] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  
  // Ref cho ScrollView
  const scrollViewRef = useRef(null);

  // Chọn ảnh mới - Reset kết quả và hiển thị modal chọn ảnh
  const selectNewImage = () => {
    setShowImageOptions(true);
    setResults([]);
    setImageUris([]);
  };

  // Capture a photo using the device camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập camera');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      aspect: [4, 3]
    });
    if (!res.canceled) {
      const asset = res.assets ? res.assets[0] : res;
      
      // Lưu ảnh gốc
      setOriginalImageUri(asset.uri);
      
      // Hiển thị tùy chọn cắt ảnh
      setImageUris([asset.uri]);
      setSelectedImageIndex(0);
      setShowCropOptions(true);
      
      // Cuộn xuống ảnh được chụp
      setTimeout(() => {
        scrollViewRef?.current?.scrollTo({
          y: 250,
          animated: true
        });
      }, 100);
    }
  };

  // Pick a single image from the library
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      aspect: [4, 3]
    });
    if (!res.canceled) {
      const asset = res.assets ? res.assets[0] : res;
      
      // Lưu ảnh gốc
      setOriginalImageUri(asset.uri);
      
      // Hiển thị tùy chọn cắt ảnh
      setImageUris([asset.uri]);
      setSelectedImageIndex(0);
      setShowCropOptions(true);
      
      // Cuộn xuống ảnh được chọn
      setTimeout(() => {
        scrollViewRef?.current?.scrollTo({
          y: 250,
          animated: true
        });
      }, 100);
    }
  };
  
  // Pick multiple images from the library
  const pickMultipleImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10 // Giới hạn số lượng ảnh có thể chọn
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      // Lấy danh sách URI từ các ảnh đã chọn
      const uris = res.assets.map(asset => asset.uri);
      
      // Cập nhật state
      setImageUris(uris);
      setSelectedImageIndex(0);
      setOriginalImageUri(uris[0]);
      
      // Hiển thị tùy chọn cắt ảnh cho ảnh đầu tiên
      setShowCropOptions(true);
      
      // Cuộn xuống ảnh được chọn
      setTimeout(() => {
        scrollViewRef?.current?.scrollTo({
          y: 250,
          animated: true
        });
      }, 100);
    }
  };

  // Xử lý cắt ảnh
  const handleCropImage = async (mode) => {
    if (!imageUris || imageUris.length === 0) return;
    
    setIsCropping(true);
    
    try {
      const currentImageUri = imageUris[selectedImageIndex];
      let processedImageUri;
      
      if (mode === 'full') {
        // Sử dụng ảnh gốc không cắt
        processedImageUri = currentImageUri;
      } 
      else {
        // Custom crop - sử dụng ImageManipulator bên trong ứng dụng
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
          uri: currentImageUri
        });
        
        if (!result.canceled) {
          const asset = result.assets ? result.assets[0] : result;
          processedImageUri = asset.uri;
        } else {
          // Nếu người dùng hủy, giữ lại ảnh gốc
          processedImageUri = currentImageUri;
        }
      }
      
      // Cập nhật URI của ảnh hiện tại trong mảng
      const newImageUris = [...imageUris];
      newImageUris[selectedImageIndex] = processedImageUri;
      setImageUris(newImageUris);
      
      // Nếu đây là ảnh cuối cùng trong chuỗi, thêm tất cả vào hàng đợi xử lý
      if (selectedImageIndex === imageUris.length - 1) {
        // Thêm tất cả ảnh vào hàng đợi xử lý
        setProcessingQueue(newImageUris);
        setProcessingIndex(0); // Bắt đầu xử lý từ ảnh đầu tiên
      } else {
        // Nếu không phải ảnh cuối, chuyển sang ảnh tiếp theo
        setSelectedImageIndex(selectedImageIndex + 1);
        setOriginalImageUri(imageUris[selectedImageIndex + 1]);
        setShowCropOptions(true); // Hiển thị lại modal cắt cho ảnh tiếp theo
      }
    } catch (error) {
      console.error('Lỗi khi cắt ảnh:', error);
      Alert.alert('Lỗi', 'Không thể cắt ảnh. Vui lòng thử lại.');
    } finally {
      setIsCropping(false);
      setShowCropOptions(false);
    }
  };

  // Xử lý hàng đợi ảnh khi processingIndex hoặc processingQueue thay đổi
  React.useEffect(() => {
    const processImages = async () => {
      if (processingQueue.length > 0 && processingIndex >= 0 && processingIndex < processingQueue.length) {
        // Có ảnh cần xử lý
        if (!loading) {
          // Nếu không đang tải, bắt đầu xử lý ảnh hiện tại
          await uploadImage(processingQueue[processingIndex], processingIndex);
        }
      }
    };
    
    processImages();
  }, [processingIndex, processingQueue]);

  // Upload the image to API for prediction
  const uploadImage = async (imageUri, index) => {
    if (!imageUri) return;
    
    setLoading(true);
    
    try {
      const json = await ApiService.analyzeLeafImage(imageUri);
      
      // Cập nhật kết quả cho ảnh hiện tại
      const newResults = [...results];
      newResults[index] = { ...json, imageUri };
      setResults(newResults);
      
      // Thêm kết quả vào lịch sử nếu không có lỗi
      if (!json.error && onScanComplete) {
        onScanComplete(json, imageUri);
      }
      
      // Kiểm tra xem còn ảnh nào cần xử lý không
      if (index < processingQueue.length - 1) {
        // Chuyển sang ảnh tiếp theo
        setProcessingIndex(index + 1);
      } else {
        // Đã xử lý xong tất cả ảnh
        setProcessingIndex(-1);
        setProcessingQueue([]);
        
        // Cuộn xuống kết quả
        setTimeout(() => {
          scrollViewRef?.current?.scrollTo({
            y: 500,
            animated: true
          });
        }, 300);
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Không thể gửi ảnh lên server. Vui lòng kiểm tra kết nối mạng.';
      
      // Kiểm tra lỗi kết nối cụ thể
      if (error.message && error.message.includes('Network request failed')) {
        errorMessage = 'Không thể kết nối đến server. Kiểm tra xem server có đang hoạt động không.';
      } else if (!ApiService.isInitialized) {
        errorMessage = 'Chưa tìm thấy server. Hãy đảm bảo điện thoại và máy tính kết nối cùng mạng.';
      }
      
      // Cập nhật kết quả lỗi cho ảnh hiện tại
      const newResults = [...results];
      newResults[index] = { error: errorMessage, imageUri };
      setResults(newResults);
      
      // Kiểm tra xem còn ảnh nào cần xử lý không
      if (index < processingQueue.length - 1) {
        // Chuyển sang ảnh tiếp theo
        setProcessingIndex(index + 1);
      } else {
        // Đã xử lý xong tất cả ảnh
        setProcessingIndex(-1);
        setProcessingQueue([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Xử lý các action của kết quả
  const handleSaveResult = (result) => {
    Alert.alert('Thông báo', 'Kết quả đã được lưu vào lịch sử.');
  };

  const handleShareResult = (result) => {
    Alert.alert('Thông báo', 'Tính năng chia sẻ sẽ được phát triển trong phiên bản tiếp theo.');
  };

  const handlePrintReport = (result) => {
    Alert.alert('Thông báo', 'Tính năng in báo cáo sẽ được phát triển trong phiên bản tiếp theo.');
  };

  // Render item cho FlatList hiển thị ảnh đã chọn
  const renderImageItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.imageItem,
        selectedImageIndex === index && styles.selectedImageItem
      ]}
      onPress={() => setSelectedImageIndex(index)}
    >
      <Image source={{ uri: item }} style={styles.thumbnailImage} />
      <View style={styles.imageNumberContainer}>
        <Text style={styles.imageNumberText}>{index + 1}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.imageSelectionCard}>
        <Text style={styles.sectionTitle}>Phân tích lá cà phê</Text>
        
        {imageUris.length > 0 ? (
          // Hiển thị ảnh đã chọn
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUris[selectedImageIndex] }} 
              style={styles.previewImage} 
            />
            
            {/* Hiển thị danh sách thumbnail nếu có nhiều ảnh */}
            {imageUris.length > 1 && (
              <FlatList
                data={imageUris}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailsContainer}
              />
            )}
            
            <View style={styles.imageActionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={selectNewImage}
              >
                <FontAwesome5 name="image" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Đổi ảnh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.actionButtonPrimary, 
                  (loading || processingIndex >= 0) && styles.disabledButton
                ]}
                onPress={() => {
                  // Thêm tất cả ảnh vào hàng đợi xử lý
                  setProcessingQueue(imageUris);
                  setProcessingIndex(0);
                  // Reset kết quả hiện tại
                  setResults([]);
                }}
                disabled={loading || processingIndex >= 0}
              >
                <FontAwesome5 name="search" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>
                  {loading || processingIndex >= 0 ? 'Đang xử lý...' : 'Nhận diện'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Hiển thị giao diện chọn ảnh
          <View style={styles.imagePlaceholder}>
            <FontAwesome5 name="leaf" size={48} color={COLORS.primary} />
            <Text style={styles.placeholderText}>Chọn hoặc chụp ảnh lá cà phê để phân tích</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={takePhoto}
              >
                <FontAwesome5 name="camera" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => setShowImageOptions(true)}
              >
                <FontAwesome5 name="images" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Thư viện</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {(loading || processingIndex >= 0) && (
        <LoadingIndicator 
          message={`Đang phân tích ảnh ${processingIndex + 1}/${processingQueue.length}...`} 
        />
      )}
      
      {/* Hiển thị kết quả cho tất cả ảnh */}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Kết quả phân tích ({results.length} ảnh)</Text>
          
          {results.map((result, index) => (
            <View key={index} style={styles.resultItemContainer}>
              <Text style={styles.resultItemTitle}>Ảnh {index + 1}</Text>
              <Image 
                source={{ uri: result.imageUri }} 
                style={styles.resultItemImage} 
              />
              <ResultDisplay 
                result={result} 
                onNewScan={selectNewImage}
                onSave={() => handleSaveResult(result)}
                onShare={() => handleShareResult(result)}
                onPrint={() => handlePrintReport(result)}
              />
            </View>
          ))}
        </View>
      )}

      {scanHistory && scanHistory.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Lần quét gần đây</Text>
          {scanHistory.slice(0, 3).map(scan => (
            <TouchableOpacity 
              key={scan.id} 
              style={[
                styles.scanItem, 
                { 
                  borderLeftColor: scan.result.includes('khoẻ') ? COLORS.success : COLORS.danger,
                  backgroundColor: scan.result.includes('khoẻ') ? COLORS.successLight : COLORS.dangerLight
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
          
          <TouchableOpacity 
            style={styles.viewMoreButton}
            onPress={onViewAllHistory}
          >
            <Text style={styles.viewMoreText}>Xem tất cả</Text>
            <FontAwesome5 name="chevron-right" size={12} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Section - Thống kê từ dữ liệu thực tế */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Thống kê trang trại</Text>
        
        {scanHistory && scanHistory.length > 0 ? (
  <View style={styles.statsContainer}>
    <View style={styles.statItem}>
      <View style={styles.statBarContainer}>
        <View 
          style={[
            styles.statBarFill,
            {
              height: `${historyStats.healthyTrees / historyStats.totalScans * 100}%`,
              backgroundColor: COLORS.success
            }
          ]}
        />
      </View>
      <Text style={styles.statName}>Khoẻ</Text>
      <Text style={styles.statValue}>{Math.round(historyStats.healthyTrees / historyStats.totalScans * 100)}%</Text>
    </View>
    
    {/* Thêm phần hiển thị cho Không phải lá cà phê */}
    {historyStats.notCoffeeTrees > 0 && (
      <View style={styles.statItem}>
        <View style={styles.statBarContainer}>
          <View 
            style={[
              styles.statBarFill,
              {
                height: `${historyStats.notCoffeeTrees / historyStats.totalScans * 100}%`,
                backgroundColor: COLORS.warning
              }
            ]}
          />
        </View>
        <Text style={styles.statName}>Không phải</Text>
        <Text style={styles.statValue}>
          {Math.round(historyStats.notCoffeeTrees / historyStats.totalScans * 100)}%
        </Text>
      </View>
    )}
    
    {/* Phần cho các loại bệnh - Tính toán từ dữ liệu thực */}
    {Object.entries(historyStats.diseases || {}).map(([name, count], index) => (
      <View key={index} style={styles.statItem}>
        <View style={styles.statBarContainer}>
          <View 
            style={[
              styles.statBarFill,
              {
                height: `${count / historyStats.totalScans * 100}%`,
                backgroundColor: COLORS.danger
              }
            ]}
          />
        </View>
        <Text style={styles.statName}>{name}</Text>
        <Text style={styles.statValue}>{Math.round(count / historyStats.totalScans * 100)}%</Text>
      </View>
    ))}
  </View>
) : (
  <View style={styles.noStatsContainer}>
    <Text style={styles.noStatsText}>Chưa có đủ dữ liệu để hiển thị thống kê</Text>
    <Text style={styles.noStatsSubtext}>Quét thêm lá cây để xem thống kê chi tiết</Text>
  </View>
)}
        
        <TouchableOpacity 
          style={styles.viewMoreButton}
          onPress={onViewAllHistory}
        >
          <Text style={styles.viewMoreText}>Báo cáo chi tiết</Text>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
          
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>Mẹo chụp ảnh tốt:</Text>
        <Text style={styles.tipText}>• Chụp ở nơi có ánh sáng tự nhiên</Text>
        <Text style={styles.tipText}>• Chụp cận cảnh, lấy nét vào lá</Text>
        <Text style={styles.tipText}>• Giữ camera ổn định, tránh rung lắc</Text>
        <Text style={styles.tipText}>• Đặt lá trên nền đối lập để dễ nhận diện</Text>
      </View>

      {/* Modals */}
      <ImagePickerModal
        visible={showImageOptions}
        onClose={() => setShowImageOptions(false)}
        onTakePhoto={takePhoto}
        onPickImage={pickImage}
        onPickMultipleImages={pickMultipleImages}
      />
      
      <CropOptionsModal
        visible={showCropOptions}
        onClose={() => setShowCropOptions(false)}
        onCropImage={handleCropImage}
        isCropping={isCropping}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  imageSelectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    padding: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  thumbnailsContainer: {
    marginVertical: 10,
    height: 70,
    width: '100%',
  },
  imageItem: {
    marginRight: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedImageItem: {
    borderColor: COLORS.primary,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  imageNumberContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 5,
    padding: 3,
  },
  imageNumberText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
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
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    flex: 2,
    marginLeft: 8,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.secondary,
    flex: 1,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
    elevation: 0,
    opacity: 0.7,
  },
  resultsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text,
  },
  resultItemContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
    paddingBottom: 15,
  },
  resultItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  resultItemImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  sectionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    elevation: 2,
    shadowColor: COLORS.black,
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
    color: COLORS.textMuted,
  },
  scanItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanItemDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    color: COLORS.primary,
    marginRight: 5,
  },
  // Styles cho phần thống kê
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
    backgroundColor: COLORS.grayMedium,
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
  noStatsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noStatsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noStatsSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Các style cho phần mẹo
  tipContainer: {
    backgroundColor: COLORS.infoLight,
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.info,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 5,
  },})
  export default ScanTab;