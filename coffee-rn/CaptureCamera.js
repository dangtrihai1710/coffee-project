import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
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
      const response = await fetch('http://192.168.1.7:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const json = await response.json();
      setResult(json);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh lên server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chụp hoặc chọn ảnh để dự đoán</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Chụp Ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Chọn Ảnh</Text>
        </TouchableOpacity>
      </View>
      {imageUri && (
        <>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.predictButton} onPress={uploadImage}>
            <Text style={styles.predictButtonText}>Dự đoán ảnh</Text>
          </TouchableOpacity>
        </>
      )}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {result && (
        <View style={styles.resultContainer}>
          {result.error ? (
            <Text style={styles.errorText}>Lỗi: {result.error}</Text>
          ) : (
            <Text style={styles.resultText}>
              Dự đoán: <Text style={styles.highlight}>{result.predicted_label}</Text>{"\n"}
              Độ tin cậy: {result.confidence}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4287f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  previewImage: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  predictButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 8,
  },
  predictButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    textAlign: 'center',
  },
  highlight: {
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});

export default CaptureCamera;
