from flask import Blueprint, request, jsonify
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from mongoengine.errors import NotUniqueError, ValidationError

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

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
