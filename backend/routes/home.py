from flask import Blueprint, jsonify
from models import model_coffee, model_disease, LABELS_DISEASE

home_bp = Blueprint('home_bp', __name__)

@home_bp.route("/")
def home():
    return "Coffee Care API - Enhanced Version with Advanced Leaf Detection!"

@home_bp.route("/status", methods=["GET"])
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
