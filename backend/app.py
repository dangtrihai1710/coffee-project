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

def preprocess_for_natural_environment(image, target_size=IMG_SIZE):
    """
    Tiền xử lý đặc biệt cho ảnh trong môi trường tự nhiên
    """
    # Cải thiện độ tương phản
    image_array = np.array(image)
    
    # Áp dụng CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
    
    # Resize và normalize
    enhanced_pil = Image.fromarray(enhanced)
    enhanced_pil = enhanced_pil.resize(target_size)
    
    image_array = np.array(enhanced_pil).astype("float32")
    
    # Normalize
    image_array = image_array / 255.0
    image_array = np.expand_dims(image_array, axis=0)
    
    return image_array

# ============ Bộ lọc đầu vào cải thiện ============

def detect_coffee_leaves_in_natural_environment(image):
    """
    Cải thiện nhận diện lá cà phê trong môi trường tự nhiên
    """
    image_np = np.array(image)
    
    # Chuyển sang HSV để phân tích màu sắc tốt hơn
    hsv = cv2.cvtColor(image_np, cv2.COLOR_RGB2HSV)
    
    # Định nghĩa phạm vi màu xanh lá cây (HSV)
    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])
    
    # Tạo mask cho màu xanh lá
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # Tính tỷ lệ màu xanh lá
    green_ratio = np.sum(green_mask > 0) / (image_np.shape[0] * image_np.shape[1])
    
    # Nếu có đủ màu xanh lá (>25%), có thể là lá cà phê
    if green_ratio < 0.25:
        return False
    
    # Phát hiện cạnh để tìm hình dạng lá
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    
    # Tìm contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Kiểm tra có ít nhất một contour có kích thước hợp lý
    valid_leaf_found = False
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 800:  # Diện tích tối thiểu cho một lá
            # Tính tỷ lệ khung hình
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w) / h
            
            # Lá cà phê thường có tỷ lệ 1.2 - 3.5
            if 1.2 <= aspect_ratio <= 3.5:
                valid_leaf_found = True
                break
    
    return valid_leaf_found

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
    color_condition = green_ratio < 0.15 and brown_ratio < 0.08
    
    # 2. Kiểm tra độ sáng: Nếu ảnh quá tối hoặc quá sáng
    brightness_condition = brightness < 0.05 or brightness > 0.95
    
    # 3. Kiểm tra độ lệch chuẩn màu: Nếu ảnh gần như trắng đen
    color_std_condition = np.all(color_std < 20)
    
    # 4. Kiểm tra hình dạng:
    # - Lá cà phê thường có tỷ lệ chiều dài/chiều rộng từ 1.2 đến 3.5
    # - Lá có hình dạng tương đối đơn giản (compactness thấp, thường < 25)
    shape_condition = not (1.2 <= aspect_ratio <= 3.5 and compactness < 25)
    
    # Nếu ảnh không có màu sắc đặc trưng của lá (xanh hoặc nâu)
    # và không có hình dạng giống lá, thì coi là không phải lá
    if color_condition and shape_condition:
        # Kết hợp thêm các điều kiện độ sáng và độ lệch chuẩn màu
        if brightness_condition or color_std_condition:
            return True
    
    return False

def enhanced_leaf_detection(image):
    """
    Cải thiện phát hiện lá cà phê với nhiều kỹ thuật
    """
    # Kiểm tra các đặc điểm cực đoan không phải lá
    if has_extreme_non_leaf_features(image):
        return False
    
    # Kiểm tra môi trường tự nhiên
    return detect_coffee_leaves_in_natural_environment(image)

# ============ Route mặc định ============

@app.route("/")
def home():
    return "API Cascade: model1 (coffee vs not_coffee) => model2 (disease)! - Phiên bản cải thiện cho môi trường tự nhiên"

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

# ============ Route predict đã cải thiện ============

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Không có file được gửi lên"}), 400
    
    file = request.files["file"]
    try:
        # Đọc ảnh từ file gửi lên
        image = Image.open(io.BytesIO(file.read()))
        
        # BƯỚC 0: Kiểm tra cải thiện cho môi trường tự nhiên
        if not enhanced_leaf_detection(image):
            return jsonify({
                "predicted_label": "Không phải lá cây hoặc ảnh không rõ",
                "confidence": "95.00%", 
                "is_leaf": False,
                "suggestion": "Thử chụp gần hơn vào lá cà phê hoặc cải thiện ánh sáng. Đảm bảo có ít nhất 25% diện tích ảnh là lá xanh."
            })
        
        # Tiền xử lý ảnh cho model coffee vs not_coffee
        # Sử dụng preprocessing cải thiện cho môi trường tự nhiên
        processed_coffee = preprocess_for_natural_environment(image)

        # ====== Bước 1: Model coffee vs not_coffee ======
        preds_coffee = model_coffee.predict(processed_coffee)
        
        # Xác định xác suất not_coffee
        prob_not_coffee = float(preds_coffee[0][0])
        
        # Điều chỉnh ngưỡng cho môi trường tự nhiên (giảm từ 0.85 xuống 0.75)
        if prob_not_coffee > 0.75:
            return jsonify({
                "predicted_label": "Có thể không phải lá cà phê",
                "confidence": f"{prob_not_coffee * 100:.2f}%",
                "is_leaf": True,
                "suggestion": "Để có kết quả chính xác hơn, hãy chụp lá riêng lẻ với nền đơn giản và ánh sáng tốt."
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
            
            # Thêm lời khuyên dựa trên độ tin cậy và môi trường
            suggestion = ""
            if confidence < 80:
                suggestion = "Độ tin cậy thấp. Để có kết quả chính xác hơn, hãy chụp lá riêng lẻ với nền đơn giản và ánh sáng tự nhiên."
            elif 0.65 < prob_not_coffee <= 0.75:
                coffee_confidence = (1 - prob_not_coffee) * 100
                suggestion = "Lá có vẻ như cà phê nhưng chất lượng ảnh có thể chưa tối ưu. Thử chụp rõ nét hơn."
            
            # Nếu nằm ở vùng không chắc chắn (0.65-0.75), đưa ra cảnh báo
            if 0.65 < prob_not_coffee <= 0.75:
                coffee_confidence = (1 - prob_not_coffee) * 100
                return jsonify({
                    "predicted_label": predicted_label,
                    "confidence": f"{coffee_confidence:.2f}%",
                    "warning": "Cây có thể không phải cà phê, hãy kiểm tra lại",
                    "is_leaf": True,
                    "suggestion": suggestion or "Thử chụp lá riêng lẻ với nền đối lập và ánh sáng tốt hơn."
                })
            
            return jsonify({
                "predicted_label": predicted_label,
                "confidence": f"{confidence:.2f}%",
                "is_leaf": True,
                "suggestion": suggestion,
                "natural_environment": True  # Đánh dấu đây là kết quả từ môi trường tự nhiên
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Route debug mới ============

@app.route("/debug/image-analysis", methods=["POST"])
def debug_image_analysis():
    """
    Route debug để phân tích chi tiết ảnh
    """
    if "file" not in request.files:
        return jsonify({"error": "Không có file được gửi lên"}), 400
    
    file = request.files["file"]
    try:
        image = Image.open(io.BytesIO(file.read()))
        image_np = np.array(image)
        
        # Phân tích màu sắc
        hsv = cv2.cvtColor(image_np, cv2.COLOR_RGB2HSV)
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        green_ratio = np.sum(green_mask > 0) / (image_np.shape[0] * image_np.shape[1])
        
        # Phân tích hình dạng
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Thông tin contour lớn nhất
        largest_contour_info = {}
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            
            largest_contour_info = {
                "area": float(area),
                "aspect_ratio": float(aspect_ratio),
                "width": int(w),
                "height": int(h)
            }
        
        # Độ sáng trung bình
        brightness = float(np.mean(image_np) / 255.0)
        
        return jsonify({
            "image_size": image_np.shape,
            "green_ratio": float(green_ratio),
            "brightness": brightness,
            "contours_found": len(contours),
            "largest_contour": largest_contour_info,
            "passes_basic_filter": not has_extreme_non_leaf_features(image),
            "passes_natural_env_filter": detect_coffee_leaves_in_natural_environment(image),
            "overall_assessment": enhanced_leaf_detection(image)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Chạy app ============

if __name__ == "__main__":
    print("🌿 Coffee Care API - Phiên bản cải thiện cho môi trường tự nhiên")
    print("📸 Hỗ trợ nhận diện lá cà phê trong ảnh có nhiều lá và nền phức tạp")
    print("🔧 Debug endpoint: POST /debug/image-analysis")
    app.run(host="0.0.0.0", port=5000, debug=True)