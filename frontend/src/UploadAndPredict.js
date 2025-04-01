// src/UploadAndPredict.js
import React, { useState, useRef } from 'react';
import axios from 'axios';

const UploadAndPredict = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const imagePreviewRef = useRef(null);

  // Xử lý chọn file ảnh, hiển thị preview
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        imagePreviewRef.current.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Gửi file ảnh lên backend để dự đoán
  const handlePredict = async () => {
    if (!fileInputRef.current.files[0]) {
      alert("Hãy chọn ảnh để dự đoán!");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", fileInputRef.current.files[0]);
    
    try {
      // Gọi API /predict của Flask (địa chỉ backend có thể là http://127.0.0.1:5000)
      const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error("Lỗi khi dự đoán:", error);
      setResult({ error: "Có lỗi xảy ra khi dự đoán" });
    }
    setLoading(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Upload ảnh để dự đoán</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} />
      <br /><br />
      <img 
        ref={imagePreviewRef} 
        alt="preview" 
        style={{ maxWidth: '300px', margin: '20px 0' }} 
      />
      <br />
      <button onClick={handlePredict} disabled={loading}>
        {loading ? "Đang dự đoán..." : "Dự đoán"}
      </button>
      {result && (
        <div style={{ marginTop: '20px', fontSize: '1.2rem' }}>
          {result.error ? (
            <p>Lỗi: {result.error}</p>
          ) : (
            <p>
              Kết quả dự đoán: <strong>{result.predicted_label}</strong> (xác suất {result.confidence})
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadAndPredict;
