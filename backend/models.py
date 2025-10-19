import tensorflow as tf
from mongoengine import Document, StringField, DateTimeField, EmailField
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

# --- Database Models (MongoDB) ---

class User(Document):
    email = EmailField(required=True, unique=True)
    password = StringField(required=True, min_length=6)
    fullName = StringField(required=True)
    createdAt = DateTimeField(default=datetime.datetime.utcnow)

    def hash_password(self):
        """Mã hóa mật khẩu của người dùng và cập nhật trường mật khẩu."""
        self.password = generate_password_hash(self.password)

    def check_password(self, password_to_check):
        """Kiểm tra xem mật khẩu được cung cấp có khớp với hash đã lưu không."""
        return check_password_hash(self.password, password_to_check)

# --- Machine Learning Models ---

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