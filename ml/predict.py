#!/usr/bin/env python3
"""
Inference script - use trained models for predictions.

Usage:
    # Global model (works for any location)
    python predict.py --pm25 85 --gas 450 --temp 32 --humidity 45
    
    # Per-location model
    python predict.py --pm25 85 --gas 450 --temp 32 --humidity 45 --location "delhi_anand_vihar"
    
    # From CSV
    python predict.py --csv data/processed/air_quality_data.csv --rows 10
"""

import argparse
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

import os
os.environ["KERAS_BACKEND"] = "torch"
from keras.models import load_model


def find_model_file(model_dir, base_name, location=None):
    """Find model file, preferring per-location over global."""
    model_dir = Path(model_dir)
    
    if location:
        # Try per-location first
        safe_loc = location.replace('/', '_').replace(' ', '_')
        per_loc = model_dir / f"{base_name}_{safe_loc}"
        if per_loc.with_suffix('.joblib').exists() or per_loc.with_suffix('.h5').exists():
            return per_loc
    
    # Fall back to global
    global_path = model_dir / f"{base_name}_global"
    if global_path.with_suffix('.joblib').exists() or global_path.with_suffix('.h5').exists():
        return global_path
    
    # Try without _global suffix (legacy)
    legacy = model_dir / base_name
    if legacy.with_suffix('.joblib').exists() or legacy.with_suffix('.h5').exists():
        return legacy
    
    return None


def load_rf_model(model_dir="models", location=None):
    """Load Random Forest model and label encoder."""
    model_dir = Path(model_dir)
    
    model_path = find_model_file(model_dir, "rf_source_classifier", location)
    encoder_path = find_model_file(model_dir, "rf_label_encoder", location)
    
    if not model_path or not model_path.with_suffix('.joblib').exists():
        raise FileNotFoundError(f"RF model not found in {model_dir}")
    
    rf = joblib.load(model_path.with_suffix('.joblib'))
    le = joblib.load(encoder_path.with_suffix('.joblib'))
    
    used = "per-location" if location and f"_{location.replace('/', '_').replace(' ', '_')}" in model_path.name else "global"
    print(f"Loaded RF model ({used}): {model_path.name}")
    return rf, le


def load_lstm_model(model_dir="models", location=None):
    """Load LSTM model and scaler."""
    model_dir = Path(model_dir)
    
    model_path = find_model_file(model_dir, "lstm_aqi_forecaster", location)
    scaler_path = find_model_file(model_dir, "lstm_scaler", location)
    
    if not model_path or not model_path.with_suffix('.h5').exists():
        raise FileNotFoundError(f"LSTM model not found in {model_dir}")
    
    model = load_model(model_path.with_suffix('.h5'))
    scaler = joblib.load(scaler_path.with_suffix('.pkl'))
    
    used = "per-location" if location and f"_{location.replace('/', '_').replace(' ', '_')}" in model_path.name else "global"
    print(f"Loaded LSTM model ({used}): {model_path.name}")
    return model, scaler


def compute_aqi(pm25: float) -> float:
    """Compute AQI from PM2.5 using CPCB formula."""
    breakpoints = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 380, 401, 500),
    ]
    for pm_low, pm_high, aqi_low, aqi_high in breakpoints:
        if pm_low <= pm25 <= pm_high:
            return aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low)
    return 500.0 if pm25 > 380 else 0.0


def predict_source(rf, le, pm25, gas_ppm, temp, humidity):
    """Predict pollution source from sensor readings."""
    X = np.array([[pm25, gas_ppm, temp, humidity]])
    pred_encoded = rf.predict(X)[0]
    pred_proba = rf.predict_proba(X)[0]
    pred_label = le.inverse_transform([pred_encoded])[0]
    
    print(f"\n--- Source Classification ---")
    print(f"Input: PM2.5={pm25}, Gas={gas_ppm}ppm, Temp={temp}°C, Humidity={humidity}%")
    print(f"Predicted Source: {pred_label}")
    print(f"Probabilities:")
    for cls, prob in zip(le.classes_, pred_proba):
        print(f"  {cls}: {prob:.2%}")
    return pred_label, pred_proba


def predict_aqi_lstm(model, scaler, recent_aqi_values, window_size=12):
    """Predict next AQI value using LSTM."""
    if len(recent_aqi_values) < window_size:
        raise ValueError(f"Need at least {window_size} recent AQI values")
    
    recent = np.array(recent_aqi_values[-window_size:]).reshape(-1, 1)
    recent_scaled = scaler.transform(recent)
    X = recent_scaled.reshape(1, window_size, 1)
    
    pred_scaled = model.predict(X, verbose=0)
    pred_aqi = scaler.inverse_transform(pred_scaled)[0, 0]
    
    print(f"\n--- AQI Forecast (LSTM) ---")
    print(f"Last {window_size} AQI values: {[round(x, 1) for x in recent_aqi_values[-window_size:]]}")
    print(f"Predicted next AQI: {pred_aqi:.1f}")
    return pred_aqi


def predict_from_csv(csv_path, model_dir="models", n_rows=10, location=None):
    """Run predictions on rows from a CSV file."""
    df = pd.read_csv(csv_path)
    
    # Filter by location if specified
    if location and 'location_id' in df.columns:
        df = df[df['location_id'] == location]
        print(f"Filtered to location '{location}': {len(df)} rows")
    
    df = df.tail(n_rows)
    
    rf, le = load_rf_model(model_dir, location)
    lstm_model, scaler = load_lstm_model(model_dir, location)
    
    print(f"\nRunning predictions on last {n_rows} rows from {csv_path}")
    
    for idx, row in df.iterrows():
        if all(c in row for c in ['pm25', 'gas_ppm', 'temp', 'humidity']):
            loc_info = f" [{row['location_id']}]" if 'location_id' in row else ""
            print(f"\nRow {idx}{loc_info}:")
            predict_source(rf, le, row['pm25'], row['gas_ppm'], row['temp'], row['humidity'])
        print("-" * 40)


def list_available_models(model_dir=None):
    """List all available trained models."""
    if model_dir is None:
        base_dir = Path(__file__).parent.parent
        model_dir = base_dir / "models"
    else:
        model_dir = Path(model_dir)
    
    print("\n=== Available Models ===")
    
    # RF models
    rf_models = list(model_dir.glob("rf_source_classifier*.joblib"))
    if rf_models:
        print("\nRandom Forest:")
        for m in sorted(rf_models):
            print(f"  {m.name}")
    
    # LSTM models
    lstm_models = list(model_dir.glob("lstm_aqi_forecaster*.h5"))
    if lstm_models:
        print("\nLSTM:")
        for m in sorted(lstm_models):
            print(f"  {m.name}")
    
    if not rf_models and not lstm_models:
        print("  No models found. Run train_all.py first.")


def main():
    base_dir = Path(__file__).parent.parent
    default_model_dir = str(base_dir / "models")
    default_csv = str(base_dir / "data/processed/air_quality_data.csv")
    
    parser = argparse.ArgumentParser(description="Run inference with trained models")
    parser.add_argument("--pm25", type=float, help="PM2.5 value")
    parser.add_argument("--gas", type=float, help="Gas PPM value")
    parser.add_argument("--temp", type=float, help="Temperature (°C)")
    parser.add_argument("--humidity", type=float, help="Humidity (%)")
    parser.add_argument("--location", type=str, help="Location ID for per-location model")
    parser.add_argument("--csv", type=str, default=default_csv, help="CSV file to run predictions on")
    parser.add_argument("--rows", type=int, default=10, help="Number of rows from CSV")
    parser.add_argument("--model-dir", type=str, default=default_model_dir, help="Model directory")
    parser.add_argument("--aqi-history", type=str, help="Comma-separated recent AQI values for LSTM")
    parser.add_argument("--list-models", action="store_true", help="List available models and exit")
    
    args = parser.parse_args()
    
    if args.list_models:
        list_available_models(args.model_dir)
        return
    
    # Load models
    try:
        rf, le = load_rf_model(args.model_dir, args.location)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Run 'python train_all.py' first to train models.")
        return
    
    try:
        lstm_model, scaler = load_lstm_model(args.model_dir, args.location)
    except FileNotFoundError as e:
        print(f"Warning: {e} - AQI forecasting unavailable")
        lstm_model, scaler = None, None
    
    if args.csv:
        predict_from_csv(args.csv, args.model_dir, args.rows, args.location)
    
    elif all(v is not None for v in [args.pm25, args.gas, args.temp, args.humidity]):
        predict_source(rf, le, args.pm25, args.gas, args.temp, args.humidity)
        
        if lstm_model and scaler:
            if args.aqi_history:
                aqi_vals = [float(x) for x in args.aqi_history.split(",")]
                predict_aqi_lstm(lstm_model, scaler, aqi_vals)
            else:
                current_aqi = compute_aqi(args.pm25)
                print(f"\nCurrent AQI (from PM2.5): {current_aqi:.1f}")
                print("Provide --aqi-history for LSTM forecast (need 12 values, e.g. --aqi-history '45,52,58,61,65,70,72,68,62,55,50,48')")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()