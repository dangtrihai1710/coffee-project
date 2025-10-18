import io
import numpy as np
import uuid
from datetime import datetime
from PIL import Image, ImageEnhance
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import os
import cv2
from skimage import exposure
from scipy import ndimage

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
    model_coffee = None

# 2) Model 2: Phân loại bệnh lá cà phê
MODEL_DISEASE_PATH = "coffee_resnet50_model_final.h5"
LABELS_DISEASE = [
    "Bệnh cercospora",
    "Cây khoẻ (không bệnh)",
    "Bệnh miner",
    "Bệnh phoma",
    "Bệnh gỉ sắt"
]

try:
    model_disease = tf.keras.models.load_model(MODEL_DISEASE_PATH)
    print("Model 2 (bệnh lá cà phê) đã được tải thành công.")
except Exception as e:
    print(f"Lỗi khi tải model_disease: {e}")
    model_disease = None

# ============ Hàm tiền xử lý ảnh nâng cao ============

IMG_SIZE = (224, 224)

def enhance_image_quality(image):
    """
    Tăng cường chất lượng ảnh cho ảnh chụp ngoài môi trường
    """
    # Chuyển sang numpy array để xử lý
    img_array = np.array(image)
    
    # 1. Cân bằng histogram để cải thiện độ tương phản
    if len(img_array.shape) == 3:
        # Chuyển sang LAB color space
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        # Áp dụng CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        # Ghép lại và chuyển về RGB
        lab = cv2.merge([l, a, b])
        img_array = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    
    # 2. Giảm nhiễu
    img_array = cv2.bilateralFilter(img_array, 9, 75, 75)
    
    # Chuyển lại thành PIL Image
    return Image.fromarray(img_array)

def detect_image_quality(image):
    """
    Đánh giá chất lượng ảnh
    Returns: quality_score (0-1), is_blurry, brightness_issue
    """
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # 1. Kiểm tra độ nét (sử dụng Laplacian variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = laplacian_var < 100
    
    # 2. Kiểm tra độ sáng
    brightness = np.mean(gray)
    brightness_issue = brightness < 50 or brightness > 200
    
    # 3. Kiểm tra độ tương phản
    contrast = gray.std()
    low_contrast = contrast < 20
    
    # Tính điểm chất lượng tổng thể
    quality_score = 1.0
    if is_blurry:
        quality_score *= 0.5
    if brightness_issue:
        quality_score *= 0.7
    if low_contrast:
        quality_score *= 0.8
    
    return quality_score, is_blurry, brightness_issue

def preprocess_image_advanced(image, target_size=IMG_SIZE, is_coffee_model=True):
    """
    Tiền xử lý ảnh nâng cao với tăng cường chất lượng
    """
    # Kiểm tra và cải thiện chất lượng ảnh nếu cần
    quality_score, is_blurry, brightness_issue = detect_image_quality(image)
    
    if quality_score < 0.7:
        print(f"[INFO] Ảnh chất lượng thấp (score: {quality_score:.2f}), đang tăng cường...")
        image = enhance_image_quality(image)
    
    # Resize ảnh
    image = image.resize(target_size, Image.Resampling.LANCZOS)
    
    # Chuyển sang numpy array
    image_array = np.array(image)
    
    # Đảm bảo 3 kênh màu
    if len(image_array.shape) == 2:
        image_array = np.stack([image_array] * 3, axis=-1)
    elif image_array.shape[-1] == 4:
        image_array = image_array[..., :3]
    
    # Chuyển đổi kiểu dữ liệu
    image_array = image_array.astype("float32")
    
    # Preprocessing cho từng model
    if is_coffee_model:
        image_array = image_array / 255.0
        image_array = np.expand_dims(image_array, axis=0)
    else:
        image_array = np.expand_dims(image_array, axis=0)
        image_array = tf.keras.applications.resnet50.preprocess_input(image_array)
    
    return image_array, quality_score

# ============ Bộ lọc nâng cao cho nhận diện lá ============

def extract_leaf_features(image):
    """
    Trích xuất đặc trưng của lá cây một cách chi tiết hơn
    """
    img_array = np.array(image)
    
    # Chuyển sang các không gian màu khác nhau
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    
    # 1. Phân tích màu sắc trong HSV
    h, s, v = cv2.split(hsv)
    
    # Dải màu xanh lá cây trong HSV (35-85 độ)
    green_mask = cv2.inRange(h, 35, 85)
    green_ratio = np.sum(green_mask > 0) / (img_array.shape[0] * img_array.shape[1])
    
    # Dải màu nâu/vàng (15-35 độ) - lá khô hoặc bệnh
    brown_mask = cv2.inRange(h, 15, 35)
    brown_ratio = np.sum(brown_mask > 0) / (img_array.shape[0] * img_array.shape[1])
    
    # 2. Phân tích độ bão hòa
    avg_saturation = np.mean(s)
    
    # 3. Phân tích kết cấu (texture)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Gabor filters để phát hiện kết cấu lá
    gabor_features = []
    for theta in np.arange(0, np.pi, np.pi/4):
        kernel = cv2.getGaborKernel((21, 21), 5, theta, 10, 0.5, 0)
        filtered = cv2.filter2D(gray, cv2.CV_32F, kernel)
        gabor_features.append(np.mean(filtered))
    
    avg_texture = np.mean(gabor_features)
    
    # 4. Phát hiện gân lá
    edges = cv2.Canny(gray, 50, 150)
    
    # Hough transform để tìm đường thẳng (gân lá)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=30, maxLineGap=10)
    vein_count = len(lines) if lines is not None else 0
    
    # 5. Phân tích hình dạng tổng thể
    # Tìm contour lớn nhất
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Tính các đặc trưng hình học
        area = cv2.contourArea(largest_contour)
        perimeter = cv2.arcLength(largest_contour, True)
        
        # Solidity: tỷ lệ diện tích contour / diện tích convex hull
        hull = cv2.convexHull(largest_contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        
        # Circularity: độ tròn của hình dạng
        circularity = 4 * np.pi * area / (perimeter ** 2) if perimeter > 0 else 0
        
        # Aspect ratio
        x, y, w, h = cv2.boundingRect(largest_contour)
        aspect_ratio = float(w) / h if h > 0 else 0
    else:
        solidity = 0
        circularity = 0
        aspect_ratio = 0
    
    return {
        'green_ratio': green_ratio,
        'brown_ratio': brown_ratio,
        'avg_saturation': avg_saturation,
        'avg_texture': avg_texture,
        'vein_count': vein_count,
        'solidity': solidity,
        'circularity': circularity,
        'aspect_ratio': aspect_ratio
    }

def is_coffee_leaf_advanced(image, features):
    """
    Phương pháp nâng cao để xác định có phải lá cà phê không
    """
    # Điểm cơ sở
    score = 0.5
    
    # 1. Màu sắc (trọng số: 30%)
    if features['green_ratio'] > 0.3 or features['brown_ratio'] > 0.2:
        score += 0.15
    if features['avg_saturation'] > 50:
        score += 0.15
    
    # 2. Kết cấu lá (trọng số: 20%)
    if 10 < features['avg_texture'] < 100:
        score += 0.2
    
    # 3. Gân lá (trọng số: 20%)
    if 5 < features['vein_count'] < 50:
        score += 0.2
    
    # 4. Hình dạng (trọng số: 30%)
    # Lá cà phê thường có:
    # - Solidity cao (0.85-0.95)
    # - Circularity trung bình (0.3-0.7)
    # - Aspect ratio: 1.5-3.0
    if 0.8 < features['solidity'] < 0.98:
        score += 0.1
    if 0.2 < features['circularity'] < 0.8:
        score += 0.1
    if 1.3 < features['aspect_ratio'] < 3.5:
        score += 0.1
    
    return score

def detect_environmental_artifacts(image):
    """
    Phát hiện các yếu tố môi trường có thể gây nhiễu
    """
    img_array = np.array(image)
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    
    # 1. Phát hiện bóng đổ
    shadow_mask = cv2.inRange(hsv[:,:,2], 0, 50)
    shadow_ratio = np.sum(shadow_mask > 0) / (img_array.shape[0] * img_array.shape[1])
    
    # 2. Phát hiện phản chiếu ánh sáng
    highlight_mask = cv2.inRange(hsv[:,:,2], 230, 255)
    highlight_ratio = np.sum(highlight_mask > 0) / (img_array.shape[0] * img_array.shape[1])
    
    # 3. Phát hiện nền phức tạp
    edges = cv2.Canny(cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY), 100, 200)
    edge_density = np.sum(edges > 0) / (img_array.shape[0] * img_array.shape[1])
    
    return {
        'has_shadow': shadow_ratio > 0.2,
        'has_highlight': highlight_ratio > 0.1,
        'complex_background': edge_density > 0.3
    }

# ============ Route predict với logic nâng cấp ============

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Không có file được gửi lên"}), 400
    
    file = request.files["file"]
    try:
        # Đọc ảnh
        image = Image.open(io.BytesIO(file.read()))
        
        # Chuyển sang RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Trích xuất đặc trưng
        features = extract_leaf_features(image)
        environmental = detect_environmental_artifacts(image)
        
        # Tính điểm lá cà phê
        leaf_score = is_coffee_leaf_advanced(image, features)
        
        print(f"[DEBUG] Leaf features: {features}")
        print(f"[DEBUG] Environmental: {environmental}")
        print(f"[DEBUG] Leaf score: {leaf_score:.2f}")
        
        # Quyết định dựa trên điểm số
        if leaf_score < 0.3:
            return jsonify({
                "predicted_label": "Không phải lá cây",
                "confidence": f"{(1 - leaf_score) * 100:.2f}%",
                "is_leaf": False,
                "quality_warning": "Vật thể không có đặc điểm của lá cây"
            })
        
        # Nếu có model coffee
        if model_coffee is not None:
            # Tiền xử lý ảnh với enhancement
            processed_coffee, quality_score = preprocess_image_advanced(image, is_coffee_model=True)
            
            # Dự đoán với model
            preds_coffee = model_coffee.predict(processed_coffee)
            prob_not_coffee = float(preds_coffee[0][0])
            
            # Điều chỉnh ngưỡng dựa trên chất lượng ảnh và điểm lá
            adjusted_threshold = 0.85
            if quality_score < 0.7:
                adjusted_threshold = 0.9  # Nghiêm ngặt hơn với ảnh chất lượng thấp
            if environmental['complex_background']:
                adjusted_threshold = 0.88  # Cẩn thận hơn với nền phức tạp
            
            # Kết hợp với leaf_score
            combined_score = (1 - prob_not_coffee) * 0.7 + leaf_score * 0.3
            
            print(f"[DEBUG] Model prediction: {prob_not_coffee:.2f}")
            print(f"[DEBUG] Combined score: {combined_score:.2f}")
            print(f"[DEBUG] Quality score: {quality_score:.2f}")
            
            # Quyết định cuối cùng
            if prob_not_coffee > adjusted_threshold and leaf_score < 0.6:
                confidence = prob_not_coffee * 100
                message = "Không phải lá cà phê"
                
                # Thêm thông tin chi tiết nếu cần
                if environmental['has_shadow']:
                    message += " (có bóng đổ)"
                elif environmental['complex_background']:
                    message += " (nền phức tạp)"
                
                return jsonify({
                    "predicted_label": message,
                    "confidence": f"{confidence:.2f}%",
                    "is_leaf": True,
                    "quality_score": f"{quality_score:.2f}"
                })
            
            # Nếu chất lượng ảnh thấp nhưng vẫn có thể là lá cà phê
            if quality_score < 0.5 and 0.7 < prob_not_coffee <= adjusted_threshold:
                # Chuyển sang model bệnh nhưng với cảnh báo
                pass  # Tiếp tục xuống phần model disease
        
        # Model disease classification
        if model_disease is None:
            return jsonify({"error": "Model phân loại bệnh không khả dụng"}), 500
        
        # Tiền xử lý cho model bệnh
        processed_disease, _ = preprocess_image_advanced(image, is_coffee_model=False)
        
        # Dự đoán
        preds_disease = model_disease.predict(processed_disease)
        class_id = int(np.argmax(preds_disease, axis=1)[0])
        predicted_label = LABELS_DISEASE[class_id]
        confidence = float(np.max(preds_disease) * 100.0)
        
        # Chuẩn bị response
        response = {
            "predicted_label": predicted_label,
            "confidence": f"{confidence:.2f}%",
            "is_leaf": True
        }
        
        # Thêm cảnh báo nếu cần
        if quality_score < 0.7:
            response["warning"] = "Chất lượng ảnh thấp, kết quả có thể không chính xác"
        
        if environmental['complex_background']:
            response["recommendation"] = "Nên chụp lại với nền đơn giản hơn"
        
        if environmental['has_shadow'] or environmental['has_highlight']:
            response["lighting_issue"] = "Ánh sáng không đều, có thể ảnh hưởng kết quả"
        
        return jsonify(response)

    except Exception as e:
        print(f"[ERROR] Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============ Các route khác giữ nguyên ============

@app.route("/")
def home():
    return "Coffee Care API - Enhanced Version with Advanced Leaf Detection!"

@app.route("/status", methods=["GET"])
def status():
    """Endpoint để kiểm tra trạng thái các model"""
    return jsonify({
        "status": "running",
        "version": "2.0-enhanced",
        "models": {
            "coffee_vs_not_coffee": model_coffee is not None,
            "disease_classification": model_disease is not None
        },
        "features": {
            "quality_detection": True,
            "environmental_analysis": True,
            "advanced_leaf_features": True
        },
        "disease_classes": LABELS_DISEASE
    })

# Routes xác thực giữ nguyên
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    
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
    
    if data.get('email') == 'demo@example.com':
        return jsonify({"success": False, "message": "Email đã được sử dụng"}), 400
    
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
    return jsonify({
        "success": True,
        "message": "Đã gửi email đặt lại mật khẩu."
    })

@app.route("/auth/update-profile", methods=["PUT"])
def update_profile():
    data = request.get_json()
    
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

if __name__ == "__main__":
    print("\n" + "="*50)
    print("COFFEE CARE API SERVER - ENHANCED VERSION")
    print("="*50)
    print(f"Model coffee vs not_coffee: {'✓ Loaded' if model_coffee else '✗ Not loaded'}")
    print(f"Model disease classification: {'✓ Loaded' if model_disease else '✗ Not loaded'}")
    print("\nEnhanced features:")
    print("  ✓ Advanced leaf feature extraction")
    print("  ✓ Image quality detection")
    print("  ✓ Environmental artifact analysis")
    print("  ✓ Adaptive thresholding")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=True)