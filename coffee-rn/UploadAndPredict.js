import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function UploadAndPredict() {
  const [imageUri, setImageUri] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hàm chọn ảnh từ thư viện
  const pickImage = async () => {
    try {
      // Yêu cầu quyền truy cập thư viện ảnh
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Bạn cần cấp quyền truy cập thư viện ảnh.');
        return;
      }
      // Mở thư viện ảnh (sử dụng thuộc tính cũ nếu cần)
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      console.log("Kết quả chọn ảnh:", pickerResult);
      if (!pickerResult.canceled) {
        const asset = pickerResult.assets[0];
        setImageUri(asset.uri);
        console.log("Ảnh đã chọn:", asset.uri);
      } else {
        console.log("Người dùng đã hủy chọn ảnh.");
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
    }
  };

  // Hàm gọi Flask API để dự đoán
  const handlePredict = async () => {
    if (!imageUri) {
      Alert.alert("Thông báo", "Hãy chọn ảnh trước khi dự đoán!");
      return;
    }
    setLoading(true);
    try {
      let filename = imageUri.split('/').pop();
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : 'image';

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      });

      // Gọi API Flask; hãy điều chỉnh URL cho phù hợp với môi trường triển khai
      const response = await fetch('http://192.168.1.7:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Lỗi khi dự đoán:", error);
      setResult({ error: "Có lỗi xảy ra khi dự đoán" });
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload ảnh để dự đoán</Text>
      <Button title="Chọn ảnh từ thư viện" onPress={pickImage} />
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
      )}
      <Button
        title={loading ? "Đang dự đoán..." : "Dự đoán"}
        onPress={handlePredict}
        disabled={loading}
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {result && (
        <View style={styles.resultContainer}>
          {result.error ? (
            <Text style={styles.errorText}>Lỗi: {result.error}</Text>
          ) : (
            <Text style={styles.resultText}>
              Kết quả dự đoán: <Text style={styles.highlight}>{result.predicted_label}</Text> (xác suất {result.confidence})
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  imagePreview: {
    width: 300,
    height: 300,
    marginVertical: 20,
    resizeMode: 'contain',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
  },
  highlight: {
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});
