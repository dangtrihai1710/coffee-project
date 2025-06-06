import io
import numpy as np
import uuid
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import os
import cv2  # Đảm bảo đã cài đặt OpenCV bằng lệnh: pip install opencv-python

app = Flask(__name__)
CORS(app)

# ============ Định nghĩa các model ============

# 1) Model 1: Phân biệt coffee vs not_coffee (giữ nguyên như cũ)
MODEL_COFFEE_PATH = "coffee_vs_notcoffee.keras"
try:
    model_coffee = tf.keras.models.load_model(MODEL_COFFEE_PATH)
    print("Model 1 (coffee vs not_coffee) đã được tải thành công.")
except Exception as e:
    print(f"Lỗi khi tải model_coffee: {e}")
    model_coffee = None

# 2) Model 2: Phân loại bệnh lá cà phê (CẬP NHẬT)
MODEL_DISEASE_PATH = "coffee_resnet50_model_final.h5"
# Cập nhật lại labels theo thứ tự mới từ training code
LABELS_DISEASE = [
    "Bệnh cercospora",      # Cercospora
    "Cây khoẻ (không bệnh)", # Healthy
    "Bệnh miner",           # Miner
    "Bệnh phoma",           # Phoma
    "Bệnh gỉ sắt"           # Rust
]

try:
    model_disease = tf.keras.models.load_model(MODEL_DISEASE_PATH)
    print("Model 2 (bệnh lá cà phê) đã được tải thành công.")
    print(f"Input shape của model: {model_disease.input_shape}")
    print(f"Output shape của model: {model_disease.output_shape}")
    print(f"Số lớp dự đoán: {len(LABELS_DISEASE)}")
except Exception as e:
    print(f"Lỗi khi tải model_disease: {e}")
    model_disease = None

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
    if len(image_array.shape) == 2:  # Grayscale
        image_array = np.stack([image_array] * 3, axis=-1)
    elif image_array.shape[-1] == 4:  # RGBA
        image_array = image_array[..., :3]
    
    # Chuyển đổi kiểu dữ liệu
    image_array = image_array.astype("float32")
    
    # Preprocessing khác nhau cho từng model
    if is_coffee_model:
        # Model coffee vs not_coffee: normalize về [0, 1]
        image_array = image_array / 255.0
        # Thêm batch dimension
        image_array = np.expand_dims(image_array, axis=0)
    else:
        # Model bệnh lá: sử dụng preprocess_input của ResNet50
        # Thêm batch dimension trước khi preprocess
        image_array = np.expand_dims(image_array, axis=0)
        # Sử dụng preprocess_input của ResNet50 (chuẩn hóa theo ImageNet)
        image_array = tf.keras.applications.resnet50.preprocess_input(image_array)
        return image_array
    
    return image_array

# ============ Bộ lọc đầu vào xét cả màu sắc và hình dạng ============

def has_extreme_non_leaf_features(image):
    """
    Phát hiện các đặc điểm cực đoan rõ ràng không phải lá cây
    Xét cả màu sắc và hình dạng để xác định
    """
    # Chuyển đổi ảnh sang array
    image_np = np.array(image)
    
    # Đảm bảo ảnh có 3 kênh
    if len(image_np.shape) == 2:
        image_np = np.stack([image_np] * 3, axis=-1)
    elif len(image_np.shape) == 3 and image_np.shape[-1] == 4:
        image_np = image_np[..., :3]
    
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
    gray_image = cv2.cvtColor(image_np.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    
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
    return "API Cascade: model1 (coffee vs not_coffee) => model2 (disease classification)!"

# ============ Routes xác thực ============

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    
    # Demo đơn giản: kiểm tra nếu email/pass là demo
    if data.get('email') == 'demo@example.com' and data.get('password') == 'password':
        return jsonify({
            "success": True,
            "token": "demo_token_12345",
            "user": {
                "id": "12345",
                "fullName": "Người Dùng Demo",
                "email": "demo@example.com",
                "phone": "0123456789",
                "createdAt": datetime.now().isoformat()
            }
        })
    
    return jsonify({"success": False, "message": "Email hoặc mật khẩu không đúng"}), 401

@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    
    # Kiểm tra email đã tồn tại
    if data.get('email') == 'demo@example.com':
        return jsonify({"success": False, "message": "Email đã được sử dụng"}), 400
    
    # Tạo user mới
    user = {
        "id": str(uuid.uuid4()),
        "fullName": data.get('fullName', ''),
        "email": data.get('email', ''),
        "phone": data.get('phone', ''),
        "createdAt": datetime.now().isoformat()
    }
    
    return jsonify({
        "success": True,
        "token": f"token_{user['id']}",
        "user": user
    })

@app.route("/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    
    # Demo chỉ trả về thành công
    return jsonify({
        "success": True,
        "message": "Đã gửi email đặt lại mật khẩu."
    })

@app.route("/auth/update-profile", methods=["PUT"])
def update_profile():
    data = request.get_json()
    
    # Demo trả về thành công với dữ liệu đã cập nhật
    updated_user = {
        "id": "12345",
        "fullName": data.get('fullName', 'Người Dùng Demo'),
        "email": data.get('email', 'demo@example.com'),
        "phone": data.get('phone', '0123456789'),
        "createdAt": "2023-01-01T00:00:00"
    }
    
    return jsonify({
        "success": True,
        "user": updated_user
    })

# ============ Route predict ============

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Không có file được gửi lên"}), 400
    
    file = request.files["file"]
    try:
        # Đọc ảnh từ file gửi lên
        image = Image.open(io.BytesIO(file.read()))
        
        # Chuyển sang RGB nếu cần
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # BƯỚC 0: Tiền lọc - Kiểm tra các trường hợp cực đoan rõ ràng
        if has_extreme_non_leaf_features(image):
            return jsonify({
                "predicted_label": "Không phải lá cây",
                "confidence": "99.00%", 
                "is_leaf": False
            })
        
        # Kiểm tra model coffee có tồn tại không
        if model_coffee is None:
            # Nếu không có model coffee, bỏ qua bước 1 và đi thẳng đến bước 2
            print("[SKIP] Model coffee không khả dụng, bỏ qua kiểm tra coffee vs not_coffee")
            
            # Kiểm tra model disease
            if model_disease is None:
                return jsonify({"error": "Không có model nào khả dụng"}), 500
            
            # Tiền xử lý ảnh cho model bệnh lá
            processed_disease = preprocess_image(image, is_coffee_model=False)
            
            # Dự đoán bệnh với model categorical
            preds_disease = model_disease.predict(processed_disease)
            
            # Chuyển về index của lớp có xác suất cao nhất
            class_id = int(np.argmax(preds_disease, axis=1)[0])
            predicted_label = LABELS_DISEASE[class_id]
            confidence = float(np.max(preds_disease) * 100.0)
            
            return jsonify({
                "predicted_label": predicted_label,
                "confidence": f"{confidence:.2f}%",
                "is_leaf": True,
                "note": "Bỏ qua kiểm tra coffee vs not_coffee do model không khả dụng"
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
            # Kiểm tra model disease có tồn tại không
            if model_disease is None:
                return jsonify({"error": "Model phân loại bệnh không khả dụng"}), 500
            
            # Tiền xử lý ảnh cho model bệnh lá (khác với model coffee)
            processed_disease = preprocess_image(image, is_coffee_model=False)
            
            # Dự đoán bệnh với model categorical
            preds_disease = model_disease.predict(processed_disease)
            
            # Chuyển về index của lớp có xác suất cao nhất
            class_id = int(np.argmax(preds_disease, axis=1)[0])
            predicted_label = LABELS_DISEASE[class_id]
            confidence = float(np.max(preds_disease) * 100.0)
            
            # Debug: In ra các xác suất dự đoán
            print(f"[DEBUG] Prediction probabilities: {preds_disease[0]}")
            print(f"[DEBUG] Predicted class: {class_id} - {predicted_label}")
            print(f"[DEBUG] Confidence: {confidence:.2f}%")
            
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
        print(f"[ERROR] Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============ Route kiểm tra trạng thái ============

@app.route("/status", methods=["GET"])
def status():
    """Endpoint để kiểm tra trạng thái các model"""
    return jsonify({
        "status": "running",
        "models": {
            "coffee_vs_not_coffee": model_coffee is not None,
            "disease_classification": model_disease is not None
        },
        "disease_classes": LABELS_DISEASE,
        "total_classes": len(LABELS_DISEASE)
    })

# ============ Chạy app ============

if __name__ == "__main__":
    print("\n" + "="*50)
    print("COFFEE CARE API SERVER")
    print("="*50)
    print(f"Model coffee vs not_coffee: {'✓ Loaded' if model_coffee else '✗ Not loaded'}")
    print(f"Model disease classification: {'✓ Loaded' if model_disease else '✗ Not loaded'}")
    if model_disease:
        print(f"Disease classes: {len(LABELS_DISEASE)}")
        for i, label in enumerate(LABELS_DISEASE):
            print(f"  {i}: {label}")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=True)