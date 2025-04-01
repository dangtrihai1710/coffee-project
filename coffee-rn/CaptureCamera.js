import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const CaptureCamera = () => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
    });
    if (!res.cancelled) {
      // In the newer API, the result is in res.assets array
      const asset = res.assets ? res.assets[0] : res;
      setImageUri(asset.uri);
      setResult(null);
    }
  };

  // Pick an image from the library
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập thư viện ảnh');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.cancelled) {
      const asset = res.assets ? res.assets[0] : res;
      setImageUri(asset.uri);
      setResult(null);
    }
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
      const response = await fetch('http://192.168.1.11:5000/predict', {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Sử dụng ScrollView để cuộn nội dung khi cần */}
      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Nhận diện lá cà phê</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Chụp Ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Chọn Ảnh</Text>
          </TouchableOpacity>
        </View>
        
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity 
              style={[styles.predictButton, loading && styles.disabledButton]}
              onPress={uploadImage}
              disabled={loading}
            >
              <Text style={styles.predictButtonText}>
                {loading ? 'Đang xử lý...' : 'Nhận diện'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4287f5" />
            <Text style={styles.loadingText}>Đang phân tích ảnh...</Text>
          </View>
        )}
        
        {result && (
          <View style={[styles.resultContainer, { borderColor: getResultColor() }]}>
            {result.error ? (
              <Text style={styles.errorText}>Lỗi: {result.error}</Text>
            ) : (
              <View>
                <Text style={[styles.resultTitle, { color: getResultColor() }]}>
                  {getResultIcon()} {result.predicted_label}
                </Text>
                
                <Text style={styles.confidenceText}>
                  Độ tin cậy: {result.confidence}
                </Text>
                
                {result.warning && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>⚠️ {result.warning}</Text>
                    <Text style={styles.warningSubtext}>
                      Hãy thử chụp hình rõ nét hơn trong điều kiện ánh sáng tốt
                    </Text>
                  </View>
                )}
                
                {result.predicted_label.includes("Bệnh") && !result.warning && (
                  <Text style={styles.diseaseAdvice}>
                    Hãy kiểm tra kỹ lá cây và có biện pháp xử lý phù hợp
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
        
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>Mẹo chụp ảnh tốt:</Text>
          <Text style={styles.tipText}>• Chụp ở nơi có ánh sáng tốt</Text>
          <Text style={styles.tipText}>• Chụp cận cảnh, lấy nét vào lá</Text>
          <Text style={styles.tipText}>• Giữ camera ổn định, tránh rung lắc</Text>
          <Text style={styles.tipText}>• Đặt lá trên nền đối lập để dễ nhận diện</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: StatusBar.currentHeight || 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30, // Thêm padding dưới để đảm bảo cuộn hết nội dung
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4287f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: 280,
    height: 280,
    marginVertical: 15,
    borderRadius: 10,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  predictButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 3,
    width: '80%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    elevation: 0,
  },
  predictButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4287f5',
  },
  resultContainer: {
    marginVertical: 15,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderLeftWidth: 8,
    width: '100%',
    elevation: 3,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  confidenceText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#555',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  warningText: {
    fontSize: 16,
    color: '#856404',
    fontWeight: 'bold',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
    marginTop: 5,
  },
  diseaseAdvice: {
    fontSize: 15,
    color: '#721c24',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    textAlign: 'center',
  },
  tipContainer: {
    backgroundColor: '#e6f7ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    width: '100%',
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
});

export default CaptureCamera;