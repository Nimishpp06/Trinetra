#!/usr/bin/env python3
"""
Train LSTM forecaster for AQI prediction.
Supports: global model (all locations) OR per-location models.

Uses rolling window (12 timesteps = 2 hours at 10-min intervals) to forecast next AQI value.

Architecture: LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dense(1)

Outputs:
- models/lstm_aqi_forecaster_global.h5 (global model)
- models/lstm_aqi_forecaster_{location}.h5 (per-location models)
- models/lstm_scaler_global.pkl / lstm_scaler_{location}.pkl (scalers)
- Prints: RMSE, MAE on test set
"""

import os
os.environ["KERAS_BACKEND"] = "torch"

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error

import keras
from keras.models import Sequential
from keras.layers import LSTM, Dropout, Dense
from keras.callbacks import EarlyStopping, ReduceLROnPlateau
from keras.optimizers import Adam


def compute_aqi(pm25: float) -> float:
    """Compute AQI from PM2.5 using CPCB piecewise formula."""
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
            aqi = aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low)
            return round(aqi, 1)
    
    if pm25 > 380:
        return 500.0
    return 0.0


def create_sequences(data: np.ndarray, window_size: int = 12):
    """Create rolling window sequences for LSTM."""
    X, y = [], []
    for i in range(len(data) - window_size):
        X.append(data[i:i + window_size])
        y.append(data[i + window_size])
    return np.array(X), np.array(y)


def train_lstm_for_location(
    loc_name: str,
    loc_data: pd.DataFrame,
    model_dir: Path,
    window_size: int = 12,
    test_split: float = 0.2,
    epochs: int = 50,
    batch_size: int = 32,
    lstm_units_1: int = 64,
    lstm_units_2: int = 32,
    dropout_rate: float = 0.2,
    learning_rate: float = 0.001,
    patience: int = 10
):
    """Train LSTM for a single location."""
    
    print(f"\n--- Training LSTM for {loc_name} ({len(loc_data)} samples) ---")
    
    if len(loc_data) < window_size + 20:
        print(f"  Skipping: too few samples ({len(loc_data)}) for window_size={window_size}")
        return None
    
    # Compute AQI
    loc_data = loc_data.copy()
    loc_data['aqi'] = loc_data['pm25'].apply(compute_aqi)
    print(f"  AQI range: {loc_data['aqi'].min():.1f} - {loc_data['aqi'].max():.1f}")
    
    # Sort by timestamp
    loc_data['timestamp'] = pd.to_datetime(loc_data['timestamp'])
    loc_data = loc_data.sort_values('timestamp').reset_index(drop=True)
    
    aqi_values = loc_data['aqi'].values.reshape(-1, 1)
    
    # Scale
    scaler = MinMaxScaler(feature_range=(0, 1))
    aqi_scaled = scaler.fit_transform(aqi_values)
    
    # Create sequences
    X, y = create_sequences(aqi_scaled, window_size)
    print(f"  Created {len(X)} sequences")
    
    # Temporal split
    split_idx = int(len(X) * (1 - test_split))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")
    
    if len(X_train) < 10:
        print(f"  Skipping: too few training sequences")
        return None
    
    # Build model
    model = Sequential([
        LSTM(lstm_units_1, return_sequences=True, input_shape=(window_size, 1)),
        Dropout(dropout_rate),
        LSTM(lstm_units_2, return_sequences=False),
        Dropout(dropout_rate),
        Dense(1)
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss='mse',
        metrics=['mae']
    )
    
    # Callbacks
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=patience, restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=patience//2, min_lr=1e-6, verbose=0)
    ]
    
    # Train
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=0
    )
    
    # Evaluate
    y_pred_scaled = model.predict(X_test, verbose=0)
    y_test_actual = scaler.inverse_transform(y_test)
    y_pred_actual = scaler.inverse_transform(y_pred_scaled)
    
    rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred_actual))
    mae = mean_absolute_error(y_test_actual, y_pred_actual)
    rmse_scaled = np.sqrt(mean_squared_error(y_test, y_pred_scaled))
    mae_scaled = mean_absolute_error(y_test, y_pred_scaled)
    
    print(f"  RMSE: {rmse:.4f}, MAE: {mae:.4f} (AQI units)")
    
    # Save model & scaler
    safe_loc = loc_name.replace('/', '_').replace(' ', '_')
    model_path = model_dir / f"lstm_aqi_forecaster_{safe_loc}.h5"
    scaler_path = model_dir / f"lstm_scaler_{safe_loc}.pkl"
    
    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    
    return {
        'location': loc_name,
        'model': model,
        'scaler': scaler,
        'rmse': rmse,
        'mae': mae,
        'rmse_scaled': rmse_scaled,
        'mae_scaled': mae_scaled,
        'history': history.history
    }


def train_lstm(
    data_path: str = None,
    model_dir: str = None,
    window_size: int = 12,
    test_split: float = 0.2,
    epochs: int = 50,
    batch_size: int = 32,
    lstm_units_1: int = 64,
    lstm_units_2: int = 32,
    dropout_rate: float = 0.2,
    learning_rate: float = 0.001,
    patience: int = 10,
    per_location: bool = False
):
    # Resolve paths relative to this script's location
    base_dir = Path(__file__).parent.parent
    if data_path is None:
        data_path = str(base_dir / "data/processed/air_quality_data.csv")
    if model_dir is None:
        model_dir = str(base_dir / "models")
    """Train LSTM for AQI forecasting - global and/or per-location."""
    
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows from {data_path}")
    
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    if per_location and 'location_id' in df.columns:
        print("\n" + "="*50)
        print("TRAINING PER-LOCATION LSTM MODELS")
        print("="*50)
        
        for loc in sorted(df['location_id'].unique()):
            loc_data = df[df['location_id'] == loc].copy()
            result = train_lstm_for_location(
                loc, loc_data, model_dir,
                window_size, test_split, epochs, batch_size,
                lstm_units_1, lstm_units_2, dropout_rate, learning_rate, patience
            )
            if result:
                results[loc] = result
    
    # ALWAYS train global model
    print("\n" + "="*50)
    print("TRAINING GLOBAL LSTM MODEL (all locations)")
    print("="*50)
    
    global_result = train_lstm_for_location(
        'global', df, model_dir,
        window_size, test_split, epochs, batch_size,
        lstm_units_1, lstm_units_2, dropout_rate, learning_rate, patience
    )
    
    if global_result:
        # Rename global files
        for f in model_dir.glob("lstm_*_global.*"):
            new_name = f.name.replace('_global', '')
            f.rename(model_dir / new_name)
        
        results['global'] = global_result
        print(f"\nSaved GLOBAL model to {model_dir / 'lstm_aqi_forecaster.h5'}")
        print(f"Saved GLOBAL scaler to {model_dir / 'lstm_scaler.pkl'}")
    
    return results


if __name__ == "__main__":
    import sys
    per_loc = '--per-location' in sys.argv
    train_lstm(per_location=per_loc)