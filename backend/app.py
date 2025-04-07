import io
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import os
import cv2  # Đảm bảo đã cài đặt OpenCV bằng lệnh: pip install opencv-python

app = Flask(__name__)
CORS(app)

# ============ Định nghĩa các model ============

# 1) Model 1: Phân biệt coffee vs not_coffee
MODEL_COFFEE_PATH = "coffee_vs_notcoffee.keras"
try:
    model_coffee = tf.keras.models.load_model(MODEL_COFFEE_PATH)
    print("Model 1 (coffee vs not_coffee) đã được tải thành công.")
except Exception as e:
    print(f"Lỗi khi tải model_coffee: {e}")

# 2) Model 2: Phân loại bệnh lá cà phê
MODEL_DISEASE_PATH = "coffee_resnet50_model_final.h5"
LABELS_DISEASE = [
    "Cây khoẻ (không bệnh)",
    "Bệnh miner",
    "Bệnh gỉ sắt",
    "Bệnh phoma",
    "Bệnh cercospora"
]
try:
    model_disease = tf.keras.models.load_model(MODEL_DISEASE_PATH)
    print("Model 2 (bệnh lá cà phê) đã được tải thành công.")
except Exception as e:
    print(f"Lỗi khi tải model_disease: {e}")

# ============ Hàm tiền xử lý ảnh ============

IMG_SIZE = (224, 224)

def preprocess_image(image, target_size=IMG_SIZE, is_coffee_model=True):
    """
    Tiền xử lý ảnh cho các model với các yêu cầu khác nhau
    
    Args:
    - image: PIL Image object
    - target_size: Kích thước ảnh đầu ra
    - is_coffee_model: Kiểm tra model coffee hay disease
    
    Returns:
    - Numpy array ảnh đã được chuẩn hóa
    """
    # Thay đổi kích thước ảnh
    image = image.resize(target_size)
    
    # Chuyển sang numpy array
    image_array = np.array(image)
    
    # Đảm bảo 3 kênh màu
    if image_array.shape[-1] == 4:
        image_array = image_array[..., :3]
    
    # Chuyển đổi kiểu dữ liệu
    image_array = image_array.astype("float32")
    
    # Preprocessing khác nhau cho từng model
    if is_coffee_model:
        # Model coffee vs not_coffee: normalize về [0, 1]
        image_array = image_array / 255.0
    else:
        # Model bệnh lá: sử dụng preprocess_input của ResNet50
        # Thêm batch dimension trước khi preprocess
        image_array = np.expand_dims(image_array, axis=0)
        image_array = tf.keras.applications.resnet50.preprocess_input(image_array)
        # Trả về batch dimension đã được thêm
        return image_array
    
    # Thêm batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array

# ============ Bộ lọc đầu vào xét cả màu sắc và hình dạng ============

def has_extreme_non_leaf_features(image):
    """
    Phát hiện các đặc điểm cực đoan rõ ràng không phải lá cây
    Xét cả màu sắc và hình dạng để xác định
    """
    # Chuyển đổi ảnh sang array
    image_np = np.array(image)
    
    # --- Kiểm tra màu sắc ---
    # Kiểm tra tỷ lệ màu xanh lá cây
    g_channel = image_np[:, :, 1].astype(float)
    r_channel = image_np[:, :, 0].astype(float)
    b_channel = image_np[:, :, 2].astype(float)
    
    # Tính tỷ lệ màu xanh lá trong ảnh
    green_pixels = np.sum((g_channel > r_channel*1.1) & (g_channel > b_channel*1.1))
    total_pixels = image_np.shape[0] * image_np.shape[1]
    green_ratio = green_pixels / total_pixels
    
    # Kiểm tra tỷ lệ màu nâu (đặc trưng của lá bị bệnh)
    brown_pixels = np.sum((r_channel > 100) & (g_channel < 100) & (b_channel < 100))
    brown_ratio = brown_pixels / total_pixels
    
    # Kiểm tra độ sáng
    brightness = np.mean(image_np) / 255.0
    
    # Kiểm tra độ lệch chuẩn màu
    color_std = np.std(image_np, axis=(0, 1))
    
    # --- Kiểm tra hình dạng ---
    # Chuyển ảnh sang grayscale để phát hiện cạnh
    gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    
    # Phát hiện cạnh bằng Canny Edge Detection
    edges = cv2.Canny(gray_image, 100, 200)
    
    # Tìm các đường viền (contours)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Nếu không tìm thấy đường viền nào, có thể không phải lá
    if len(contours) == 0:
        return True
    
    # Lấy đường viền lớn nhất (giả định là viền của lá)
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Tính diện tích và chu vi của đường viền
    area = cv2.contourArea(largest_contour)
    perimeter = cv2.arcLength(largest_contour, True)
    
    # Kiểm tra độ phức tạp của đường viền (compactness)
    # compactness = perimeter^2 / area (giá trị thấp hơn nghĩa là hình dạng đơn giản hơn)
    if area > 0:  # Tránh chia cho 0
        compactness = (perimeter ** 2) / area
    else:
        compactness = float('inf')
    
    # Tính tỷ lệ chiều dài/chiều rộng
    x, y, w, h = cv2.boundingRect(largest_contour)
    aspect_ratio = float(w) / h if h > 0 else float('inf')
    
    # --- Kết hợp các tiêu chí ---
    # 1. Kiểm tra màu sắc: Nếu không có màu xanh và không có màu nâu
    color_condition = green_ratio < 0.2 and brown_ratio < 0.1
    
    # 2. Kiểm tra độ sáng: Nếu ảnh quá tối hoặc quá sáng
    brightness_condition = brightness < 0.03 or brightness > 0.97
    
    # 3. Kiểm tra độ lệch chuẩn màu: Nếu ảnh gần như trắng đen
    color_std_condition = np.all(color_std < 15)
    
    # 4. Kiểm tra hình dạng:
    # - Lá cà phê thường có tỷ lệ chiều dài/chiều rộng từ 1.5 đến 3
    # - Lá có hình dạng tương đối đơn giản (compactness thấp, thường < 20)
    shape_condition = not (1.5 <= aspect_ratio <= 3.0 and compactness < 20)
    
    # Nếu ảnh không có màu sắc đặc trưng của lá (xanh hoặc nâu)
    # và không có hình dạng giống lá, thì coi là không phải lá
    if color_condition and shape_condition:
        # Kết hợp thêm các điều kiện độ sáng và độ lệch chuẩn màu
        if brightness_condition or color_std_condition:
            return True
    
    return False

# ============ Route mặc định ============

@app.route("/")
def home():
    return "API Cascade: model1 (coffee vs not_coffee) => model2 (disease)!"

# ============ Route predict ============

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Không có file được gửi lên"}), 400
    
    file = request.files["file"]
    try:
        # Đọc ảnh từ file gửi lên
        image = Image.open(io.BytesIO(file.read()))
        
        # BƯỚC 0: Tiền lọc - Kiểm tra các trường hợp cực đoan rõ ràng
        if has_extreme_non_leaf_features(image):
            return jsonify({
                "predicted_label": "Không phải lá cây",
                "confidence": "99.00%", 
                "is_leaf": False
            })
        
        # Tiền xử lý ảnh cho model coffee vs not_coffee
        processed_coffee = preprocess_image(image, is_coffee_model=True)

        # ====== Bước 1: Model coffee vs not_coffee ======
        preds_coffee = model_coffee.predict(processed_coffee)
        
        # Xác định xác suất not_coffee
        prob_not_coffee = float(preds_coffee[0][0])
        
        # Ngưỡng để phân loại not_coffee
        if prob_not_coffee > 0.85:
            return jsonify({
                "predicted_label": "Không phải lá cà phê",
                "confidence": f"{prob_not_coffee * 100:.2f}%",
                "is_leaf": True
            })
        else:
            # ====== Bước 2: Model phân loại bệnh lá cà phê ======
            # Tiền xử lý ảnh cho model bệnh lá (chú ý khác với model coffee)
            processed_disease = preprocess_image(image, is_coffee_model=False)
            
            # Dự đoán bệnh với model categorical
            preds_disease = model_disease.predict(processed_disease)
            
            # Chuyển về index của lớp có xác suất cao nhất
            class_id = int(np.argmax(preds_disease, axis=1)[0])
            predicted_label = LABELS_DISEASE[class_id]
            confidence = float(np.max(preds_disease) * 100.0)
            
            # Nếu nằm ở vùng không chắc chắn (0.75-0.85), đưa ra cảnh báo
            if prob_not_coffee > 0.75 and prob_not_coffee <= 0.85:
                coffee_confidence = (1 - prob_not_coffee) * 100
                return jsonify({
                    "predicted_label": predicted_label,
                    "confidence": f"{coffee_confidence:.2f}%",
                    "warning": "Cây có thể không phải cà phê, hãy kiểm tra lại",
                    "is_leaf": True
                })
            
            return jsonify({
                "predicted_label": predicted_label,
                "confidence": f"{confidence:.2f}%",
                "is_leaf": True
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Chạy app ============

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)