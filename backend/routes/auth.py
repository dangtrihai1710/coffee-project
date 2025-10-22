from flask import Blueprint, request, jsonify
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from mongoengine.errors import NotUniqueError, ValidationError

# Imports for Google Sign-In
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

# Client ID của Web Application từ Google Cloud Console
# NOTE: Nên lưu giá trị này trong biến môi trường thay vì hardcode
GOOGLE_CLIENT_ID = "637075502351-l1t9dlugduoq5c83e3i1gvfc0ajnhn7s.apps.googleusercontent.com"

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        body = request.get_json()
        
        if not body or not body.get('email') or not body.get('password') or not body.get('fullName'):
            return jsonify({"message": "Yêu cầu email, password và fullName"}), 400

        user = User(
            email=body.get('email'),
            password=body.get('password'),
            fullName=body.get('fullName')
        )
        
        user.hash_password()
        user.save()
        
        return jsonify({"message": "Người dùng đã đăng ký thành công"}), 201

    except NotUniqueError:
        return jsonify({"message": "Email đã tồn tại"}), 409
    except ValidationError as e:
        return jsonify({"message": "Lỗi xác thực", "errors": e.to_dict()}), 400
    except Exception as e:
        print(f"!!! UNEXPECTED ERROR IN /register: {e}")
        print(f"!!! ERROR TYPE: {type(e)}")
        return jsonify({"message": "Đã xảy ra lỗi", "error": str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        body = request.get_json()
        
        if not body or not body.get('email') or not body.get('password'):
            return jsonify({"message": "Yêu cầu email và password"}), 400

        email = body.get('email')
        password = body.get('password')

        user = User.objects(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({"message": "Email hoặc mật khẩu không hợp lệ"}), 401

        access_token = create_access_token(identity=str(user.id))
        
        return jsonify(access_token=access_token), 200

    except Exception as e:
        return jsonify({"message": "Đã xảy ra lỗi", "error": str(e)}), 500

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    try:
        body = request.get_json()
        token = body.get('token')

        if not token:
            return jsonify({"message": "Yêu cầu ID token của Google"}), 400

        # Xác thực id_token với Google
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )

        # Lấy thông tin người dùng từ token đã xác thực
        email = id_info['email']
        full_name = id_info.get('name', '')

        # Kiểm tra xem người dùng đã tồn tại trong DB chưa
        user = User.objects(email=email).first()

        if not user:
            # Nếu chưa tồn tại, tạo người dùng mới
            # Mật khẩu không được thiết lập vì đây là đăng nhập qua Google
            user = User(
                email=email,
                fullName=full_name
            )
            user.save()

        # Tạo access token cho người dùng
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify(access_token=access_token), 200

    except ValueError as e:
        # Token không hợp lệ
        print(f"!!! GOOGLE AUTH VALUE ERROR: {e}")
        return jsonify({"message": "Token không hợp lệ", "error": str(e)}), 401
    except Exception as e:
        print(f"!!! UNEXPECTED ERROR IN /google: {e}")
        print(f"!!! ERROR TYPE: {type(e)}")
        return jsonify({"message": "Đã xảy ra lỗi trong quá trình xác thực Google", "error": str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    try:
        # Lấy định danh của người dùng hiện tại từ JWT
        current_user_id = get_jwt_identity()
        
        # Tìm người dùng trong database
        user = User.objects.get(id=current_user_id)
        
        # Trả về thông tin công khai của người dùng (không bao gồm mật khẩu)
        return jsonify({
            "id": str(user.id),
            "email": user.email,
            "fullName": user.fullName,
            "createdAt": user.createdAt.isoformat()
        }), 200
        
    except User.DoesNotExist:
        return jsonify({"message": "Không tìm thấy người dùng"}), 404
    except Exception as e:
        return jsonify({"message": "Đã xảy ra lỗi", "error": str(e)}), 500
