"""
GET /api/health
Health check endpoint for ML models.
"""

from fastapi import FastAPI
from pathlib import Path

app = FastAPI()


@app.get("/api/health")
async def health():
    base_dir = Path(__file__).parent.parent
    trained_dir = base_dir / "models" / "trained"

    rf_model = trained_dir / "rf_pollution_source" / "model.joblib"
    lstm_model = trained_dir / "lstm_aq" / "forecaster.h5"
    scaler = trained_dir / "lstm_aq" / "scaler.pkl"

    return {
        "status": "healthy" if rf_model.exists() else "models_not_trained",
        "models": {
            "random_forest": rf_model.exists(),
            "lstm": lstm_model.exists(),
            "scaler": scaler.exists(),
        },
        "message": "Models ready" if rf_model.exists() else "Run 'python ml/train_all.py' to train models",
    }


handler = app
