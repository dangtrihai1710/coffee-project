from flask import Flask
from flask_cors import CORS

# Import models to ensure they are loaded
from models import model_coffee, model_disease

# Import blueprints
from routes.home import home_bp
from routes.auth import auth_bp
from routes.predict import predict_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(home_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(predict_bp)

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
