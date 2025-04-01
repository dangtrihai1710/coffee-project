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
MODEL_DISEASE_PATH = "coffee_resnet50_model_final.keras"
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
    return image

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
        # Tiền xử lý ảnh
        processed = preprocess_image(image)

        # ====== Bước 1: Model coffee vs not_coffee ======
        preds_coffee = model_coffee.predict(processed)
        # Giả sử model1 sử dụng activation sigmoid, output dạng (1, 1)
        prob_not_coffee = float(preds_coffee[0][0])
        # Nếu xác suất "not_coffee" > 80% thì trả về "Không phải lá cà phê"
        if prob_not_coffee > 0.9:
            return jsonify({
                "predicted_label": "Không phải lá cà phê",
                "confidence": f"{prob_not_coffee * 100:.2f}%"
            })
        else:
            # ====== Bước 2: Model phân loại bệnh lá cà phê ======
            preds_disease = model_disease.predict(processed)
            class_id = int(np.argmax(preds_disease, axis=1)[0])
            predicted_label = LABELS_DISEASE[class_id]
            confidence = float(np.max(preds_disease) * 100.0)

            return jsonify({
                "predicted_label": predicted_label,
                "confidence": f"{confidence:.2f}%"
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Chạy app ============

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
