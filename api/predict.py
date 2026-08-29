"""
POST /api/predict
ML Inference endpoint for pollution source classification and AQI forecasting.

Input:
{
    "pm25": 35.0,
    "gas_ppm": 600,
    "temp": 28.5,
    "humidity": 85,
    "station_id": "station_01",  // optional
    "past_aqi": [45, 52, 58, 61, 65, 70, 72, 68, 62, 55, 50, 48]  // optional, 12 values for LSTM
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

# Add ml folder to path
sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

import joblib
import numpy as np
from predict import (
    load_rf_model, load_lstm_model, 
    predict_source, predict_aqi_lstm, compute_aqi
)

app = FastAPI(title="Trinetra ML API", version="1.0.0")

# Global model cache
_rf_model = None
_rf_encoder = None
_lstm_model = None
_lstm_scaler = None


def get_models():
    """Load models on first request (cached)."""
    global _rf_model, _rf_encoder, _lstm_model, _lstm_scaler
    
    base_dir = Path(__file__).parent.parent
    model_dir = str(base_dir / "models")
    
    if _rf_model is None:
        try:
            _rf_model, _rf_encoder = load_rf_model(model_dir)
        except FileNotFoundError:
            pass
    
    if _lstm_model is None:
        try:
            _lstm_model, _lstm_scaler = load_lstm_model(model_dir)
        except FileNotFoundError:
            pass
    
    return _rf_model, _rf_encoder, _lstm_model, _lstm_scaler


class PredictRequest(BaseModel):
    pm25: float = Field(..., ge=0, le=500, description="PM2.5 in µg/m³")
    gas_ppm: int = Field(..., ge=0, le=5000, description="MQ135 raw ADC value")
    temp: float = Field(..., ge=-10, le=60, description="Temperature in °C")
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
    
    # Predict pollution source
    source, proba = predict_source(rf, le, request.pm25, request.gas_ppm, request.temp, request.humidity)
    confidence = float(max(proba))
    
    # Compute current AQI
    current_aqi = compute_aqi(request.pm25)
    
    # Forecast AQI if LSTM available and past_aqi provided
    forecast_aqi = None
    if lstm is not None and scaler is not None and request.past_aqi is not None:
        try:
            forecast_aqi = predict_aqi_lstm(lstm, scaler, request.past_aqi)
        except Exception as e:
            # Silently fail forecast, return current AQI only
            pass
    
    return PredictResponse(
        source=source,
        source_confidence=confidence,
        current_aqi=current_aqi,
        forecast_aqi=forecast_aqi,
        model_version="global"
    )


@app.get("/api/health")
async def health():
    rf, le, lstm, scaler = get_models()
    return {
        "status": "healthy" if rf is not None else "models_not_loaded",
        "random_forest_loaded": rf is not None,
        "lstm_loaded": lstm is not None,
        "model_dir": str(Path(__file__).parent.parent / "models")
    }


# For Vercel serverless
handler = app