import io
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# ============ Định nghĩa các model ============

# 1) Model 1: Phân biệt coffee vs not_coffee
MODEL_COFFEE_PATH = "coffee_vs_notcoffee.h5"
try:
    model_coffee = tf.keras.models.load_model(MODEL_COFFEE_PATH)
    print("Model 1 (coffee vs not_coffee) loaded successfully.")
except Exception as e:
    print(f"Error loading model_coffee: {e}")

# 2) Model 2: Phân loại bệnh lá cà phê sử dụng file vừa train: coffee_resnet50_model_final.keras
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
    print("Model 2 (bệnh lá cà phê) loaded successfully.")
except Exception as e:
    print(f"Error loading model_disease: {e}")

# ============ Hàm tiền xử lý ảnh ============

IMG_SIZE = (224, 224)

def preprocess_image(image, target_size=IMG_SIZE):
    image = image.resize(target_size)
    image = np.array(image)
    if image.shape[-1] == 4:
        image = image[..., :3]
    # Chuyển đổi kiểu dữ liệu và thêm batch dimension
    image = image.astype("float32")
    image = np.expand_dims(image, axis=0)
    
    # Điều quan trọng: Chuẩn hóa ảnh giống như khi huấn luyện mô hình
    # Kiểm tra xem có cần chuẩn hóa ảnh về khoảng [0, 1] không
    # Bỏ comment dòng dưới nếu model được huấn luyện với dữ liệu chuẩn hóa
    # image = image / 255.0
    
    return image

# ============ Thêm các bộ lọc nâng cao để cải thiện độ chính xác ============

def has_extreme_non_leaf_features(image):
    """
    Phát hiện các đặc điểm cực đoan rõ ràng không phải lá cây
    Chỉ trả về True cho những trường hợp rất rõ ràng không phải lá
    """
    # Chuyển đổi ảnh sang array
    image_np = np.array(image)
    
    # Kiểm tra tỷ lệ màu xanh lá cây
    g_channel = image_np[:, :, 1].astype(float)
    r_channel = image_np[:, :, 0].astype(float)
    b_channel = image_np[:, :, 2].astype(float)
    
    # Tính tỷ lệ màu xanh lá trong ảnh (điều kiện nghiêm ngặt hơn)
    green_pixels = np.sum((g_channel > r_channel*1.1) & (g_channel > b_channel*1.1))
    total_pixels = image_np.shape[0] * image_np.shape[1]
    green_ratio = green_pixels / total_pixels
    
    # Chỉ phát hiện những trường hợp rất rõ ràng không phải lá
    # Kiểm tra nếu gần như hoàn toàn không có màu xanh lá
    if green_ratio < 0.05:
        # Các màu đặc trưng khác (như trắng thuần khiết, đen hoàn toàn)
        brightness = np.mean(image_np) / 255.0
        
        # Nếu ảnh quá tối hoặc quá sáng và không có màu xanh
        if brightness < 0.1 or brightness > 0.9:
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
        
        # BƯỚC 0: Tiền lọc - Chỉ kiểm tra những trường hợp cực đoan rõ ràng
        if has_extreme_non_leaf_features(image):
            return jsonify({
                "predicted_label": "Không phải lá cây",
                "confidence": "99.00%", 
                "is_leaf": False
            })
        
        # Tiền xử lý ảnh
        processed = preprocess_image(image)

        # ====== Bước 1: Model coffee vs not_coffee ======
        preds_coffee = model_coffee.predict(processed)
        
        # Quan trọng: Xác định đúng xác suất not_coffee
        # Cần kiểm tra xem model trả về gì
        # - Nếu model trả về xác suất là cà phê: prob_not_coffee = 1 - preds_coffee[0][0]
        # - Nếu model trả về xác suất không phải cà phê: prob_not_coffee = preds_coffee[0][0]
        
        # Giả sử model trả về xác suất là "not_coffee"
        prob_not_coffee = float(preds_coffee[0][0])
        
        # Quay lại ngưỡng 0.85 (thay vì 0.7) để quá nhạy cảm với việc phân loại not_coffee
        if prob_not_coffee > 0.85:
            return jsonify({
                "predicted_label": "Không phải lá cà phê",
                "confidence": f"{prob_not_coffee * 100:.2f}%",
                "is_leaf": True
            })
        else:
            # ====== Bước 2: Model phân loại bệnh lá cà phê ======
            preds_disease = model_disease.predict(processed)
            class_id = int(np.argmax(preds_disease, axis=1)[0])
            predicted_label = LABELS_DISEASE[class_id]
            confidence = float(np.max(preds_disease) * 100.0)
            
            # Nếu nằm ở vùng thực sự không chắc chắn (0.75-0.85), đưa ra cảnh báo
            if prob_not_coffee > 0.75 and prob_not_coffee <= 0.85:
                # Gọi y là xác suất của lá cà phê: y = 1 - prob_not_coffee
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