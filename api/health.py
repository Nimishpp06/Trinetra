"""
GET /api/health
Health check endpoint for ML models.
"""

from fastapi import FastAPI
from pathlib import Path
import sys
import os

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))
import joblib

app = FastAPI()


@app.get("/api/health")
async def health():
    base_dir = Path(__file__).parent.parent
    model_dir = base_dir / "models"
    
    rf_exists = (model_dir / "rf_source_classifier_global.joblib").exists()
    lstm_exists = (model_dir / "lstm_aqi_forecaster.h5").exists()
    scaler_exists = (model_dir / "lstm_scaler.pkl").exists()
    
    return {
        "status": "healthy" if rf_exists else "models_not_trained",
        "models": {
            "random_forest": rf_exists,
            "lstm": lstm_exists,
            "scaler": scaler_exists
        },
        "model_dir": str(model_dir),
        "message": "Run 'python ml/train_all.py' to train models" if not rf_exists else "Models ready"
    }


handler = app