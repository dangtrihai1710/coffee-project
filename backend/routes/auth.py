from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

@auth_bp.route("/login", methods=["POST"])
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

@auth_bp.route("/register", methods=["POST"])
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

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    return jsonify({
        "success": True,
        "message": "Đã gửi email đặt lại mật khẩu."
    })

@auth_bp.route("/update-profile", methods=["PUT"])
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
