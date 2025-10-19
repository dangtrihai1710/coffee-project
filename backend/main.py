import os
from flask import Flask
from flask_cors import CORS
from flask_mongoengine import MongoEngine
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

# Import models để MongoEngine nhận biết
from models import User

# Import blueprints
from routes.home import home_bp
from routes.auth import auth_bp # Kích hoạt lại blueprint mới
from routes.predict import predict_bp

app = Flask(__name__)

# Cấu hình CORS để cho phép tất cả các nguồn và các header cần thiết
CORS(app, resources={r"/*": {"origins": "*"}})


# --- Cấu hình ứng dụng ---
# Tải khóa bí mật JWT từ biến môi trường
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
# Tải chuỗi kết nối MongoDB từ biến môi trường
app.config["MONGODB_SETTINGS"] = {
    "host": os.environ.get("MONGODB_URI")
}

# --- Khởi tạo các extensions ---
# Khởi tạo JWT Manager
jwt = JWTManager(app)
# Khởi tạo MongoEngine
db = MongoEngine(app)


# --- Đăng ký Blueprints ---
app.register_blueprint(home_bp)
app.register_blueprint(auth_bp) # Đăng ký blueprint xác thực mới
app.register_blueprint(predict_bp)


if __name__ == "__main__":
    print("\n" + "="*50)
    print("COFFEE CARE API SERVER - DATABASE & AUTH ENABLED")
    print("="*50)
    print("Backend đã được cấu hình cho MongoDB và JWT.")
    print("Routes đã kích hoạt: /home, /auth, /predict")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=True)