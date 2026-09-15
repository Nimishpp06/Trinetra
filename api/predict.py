"""
POST /api/predict
ML Inference endpoint for pollution source classification and AQI forecasting.

Input:
{
    "pm25": 35.0,
    "gas_ppm": 600,
    "temp": 28.5,
    "humidity": 85,
    "station_id": "station_01",
    "past_aqi": [45, 52, 58, 61, 65, 70, 72, 68, 62, 55, 50, 48]
}

Output:
{
    "source": "ambient",
    "source_confidence": 0.87,
    "current_aqi": 57,
    "forecast_aqi": 62,
    "model_version": "global"
}
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

import joblib
import numpy as np
from keras.models import load_model

app = FastAPI(title="Trinetra ML API", version="1.0.0")

_rf_model = None
_rf_encoder = None
_lstm_model = None
_lstm_scaler = None


def _find_model(base_dir: Path, subdir_name: str, filename: str) -> Optional[Path]:
    """Search for a model file in trained subdirectories."""
    trained = base_dir / "models" / "trained"
    target = trained / subdir_name / filename
    if target.exists():
        return target
    for d in trained.iterdir():
        if d.is_dir():
            f = d / filename
            if f.exists():
                return f
    return None


def get_models():
    global _rf_model, _rf_encoder, _lstm_model, _lstm_scaler
    base_dir = Path(__file__).parent.parent

    if _rf_model is None:
        try:
            model_path = _find_model(base_dir, "rf_pollution_source", "model.joblib")
            encoder_path = _find_model(base_dir, "rf_pollution_source", "encoder.joblib")
            if model_path and encoder_path:
                _rf_model = joblib.load(model_path)
                _rf_encoder = joblib.load(encoder_path)
        except Exception:
            pass

    if _lstm_model is None:
        try:
            lstm_path = _find_model(base_dir, "lstm_aq", "forecaster.h5")
            scaler_path = _find_model(base_dir, "lstm_aq", "scaler.pkl")
            if lstm_path and scaler_path:
                os.environ["KERAS_BACKEND"] = "torch"
                _lstm_model = load_model(str(lstm_path))
                _lstm_scaler = joblib.load(scaler_path)
        except Exception:
            pass

    return _rf_model, _rf_encoder, _lstm_model, _lstm_scaler


def compute_aqi(pm25: float) -> float:
    breakpoints = [
        (0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
        (91, 120, 201, 300), (121, 250, 301, 400), (251, 380, 401, 500),
    ]
    for pm_low, pm_high, aqi_low, aqi_high in breakpoints:
        if pm_low <= pm25 <= pm_high:
            return aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low)
    return 500.0 if pm25 > 380 else 0.0


def classify_aqi(aqi: float) -> str:
    if aqi <= 50: return "good"
    if aqi <= 100: return "moderate"
    if aqi <= 200: return "poor"
    if aqi <= 300: return "unhealthy"
    return "severe"


class PredictRequest(BaseModel):
    pm25: float = Field(..., ge=0, le=500, description="PM2.5 in ug/m3")
    gas_ppm: int = Field(..., ge=0, le=5000, description="MQ135 raw ADC value")
    temp: float = Field(..., ge=-10, le=60, description="Temperature in C")
    humidity: float = Field(..., ge=0, le=100, description="Humidity in %")
    station_id: Optional[str] = None
    past_aqi: Optional[List[float]] = Field(None, min_length=12, max_length=12)


class PredictResponse(BaseModel):
    source: str
    source_confidence: float
    current_aqi: float
    forecast_aqi: Optional[float] = None
    model_version: str = "global"


@app.post("/api/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    rf, le, lstm, scaler = get_models()

    if rf is None or le is None:
        raise HTTPException(status_code=503, detail="Models not trained. Run training pipeline first.")

    X = np.array([[request.pm25, request.gas_ppm, request.temp, request.humidity]])
    pred_encoded = rf.predict(X)[0]
    pred_proba = rf.predict_proba(X)[0]
    source = le.inverse_transform([pred_encoded])[0]
    confidence = float(max(pred_proba))

    current_aqi = compute_aqi(request.pm25)

    forecast_aqi = None
    if lstm is not None and scaler is not None and request.past_aqi is not None:
        try:
            recent = np.array(request.past_aqi[-12:]).reshape(-1, 1)
            recent_scaled = scaler.transform(recent)
            X_lstm = recent_scaled.reshape(1, 12, 1)
            pred_scaled = lstm.predict(X_lstm, verbose=0)
            forecast_aqi = float(scaler.inverse_transform(pred_scaled)[0, 0])
        except Exception:
            pass

    return PredictResponse(
        source=source,
        source_confidence=confidence,
        current_aqi=current_aqi,
        forecast_aqi=forecast_aqi,
        model_version="global",
    )


@app.get("/api/health")
async def health():
    rf, le, lstm, scaler = get_models()
    return {
        "status": "healthy" if rf is not None else "models_not_loaded",
        "random_forest_loaded": rf is not None,
        "lstm_loaded": lstm is not None,
    }


handler = app
