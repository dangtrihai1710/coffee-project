import tensorflow as tf

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
