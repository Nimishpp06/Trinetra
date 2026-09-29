#!/usr/bin/env python3
"""
Train LSTM regressors M3-M6. Raw data only. Anti-overfitting focused.
Window=12 (72s). Shuffle split.
"""

import os
os.environ["KERAS_BACKEND"] = "torch"

import pandas as pd
import numpy as np
from pathlib import Path
import joblib, json
import warnings
warnings.filterwarnings("ignore")

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import keras
from keras.models import Sequential
from keras.layers import LSTM, Dropout, Dense
from keras.callbacks import EarlyStopping, ReduceLROnPlateau
from keras.optimizers import Adam
from keras.regularizers import l2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

WINDOW = 12

MODEL_CONFIGS = {
    "M3": {"name": "lstm_temp", "target": "Temperature_C",
           "features": ["Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"],
           "description": "Temperature Value"},
    "M4": {"name": "lstm_aq", "target": "Air_Quality_MQ135",
           "features": ["Temperature_C", "Humidity_Pct", "Dust_Density_ug_m3"],
           "description": "AQI Value"},
    "M5": {"name": "lstm_pm25", "target": "Dust_Density_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135"],
           "description": "PM2.5 Level"},
    "M6": {"name": "lstm_pm10", "target": "PM10_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"],
           "description": "PM10 Level"},
}


def compute_pm10(dust):
    return dust * 1.75 + np.random.normal(0, 0.5)


def build_lstm(input_shape):
    model = Sequential([
        LSTM(16, input_shape=input_shape,
             kernel_regularizer=l2(0.005), recurrent_regularizer=l2(0.005)),
        Dropout(0.6),
        Dense(1, kernel_regularizer=l2(0.005))
    ])
    model.compile(optimizer=Adam(learning_rate=0.0003), loss='mse', metrics=['mae'])
    return model


def temporal_split(X, y, train=0.8, val=0.1):
    n = len(X)
    idx = np.random.RandomState(42).permutation(n)
    te = int(train * n)
    ve = int((train + val) * n)
    tr_idx, val_idx, te_idx = idx[:te], idx[te:ve], idx[ve:]
    return X[tr_idx], y[tr_idx], X[val_idx], y[val_idx], X[te_idx], y[te_idx]


def forecast(model, last_window, tscaler, n_steps):
    preds = []
    window = last_window.copy()
    for _ in range(n_steps):
        pred_scaled = model.predict(window.reshape(1, WINDOW, -1), verbose=0)[0, 0]
        pred = tscaler.inverse_transform([[pred_scaled]])[0, 0]
        preds.append(float(pred))
        new_row = window[-1].copy()
        new_row[0] = pred_scaled
        window = np.vstack([window[1:], new_row.reshape(1, -1)])
    return np.array(preds)


def train_lstm_model(df, model_key, model_dir, epochs=50):
    cfg = MODEL_CONFIGS[model_key]
    target_col = cfg["target"]
    feature_cols = cfg["features"]
    name = cfg["name"]

    print(f"\n{'='*60}")
    print(f"  {model_key}: {cfg['description']}")
    print(f"  Target: {target_col} | Features: {feature_cols}")
    print(f"{'='*60}")

    df = df.copy()
    if target_col == "PM10_ug_m3" and "PM10_ug_m3" not in df.columns:
        df["PM10_ug_m3"] = df["Dust_Density_ug_m3"].apply(compute_pm10)

    cols = list(dict.fromkeys(feature_cols + [target_col, 'timestamp']))
    df_model = df[cols].dropna().sort_values('timestamp').reset_index(drop=True)
    print(f"Samples: {len(df_model)}")
    if len(df_model) < WINDOW + 50:
        print("SKIPPED"); return None

    scaler = MinMaxScaler()
    data_scaled = scaler.fit_transform(df_model[feature_cols].values)
    tscaler = MinMaxScaler()
    target_scaled = tscaler.fit_transform(df_model[[target_col]].values).flatten()

    X, y = [], []
    for i in range(len(data_scaled) - WINDOW):
        X.append(data_scaled[i:i+WINDOW])
        y.append(target_scaled[i+WINDOW])
    X, y = np.array(X), np.array(y)
    print(f"Sequences: {len(X)}")

    X_tr, y_tr, X_val, y_val, X_te, y_te = temporal_split(X, y)
    print(f"Split: train={len(X_tr)} val={len(X_val)} test={len(X_te)}")

    model = build_lstm((WINDOW, len(feature_cols)))
    history = model.fit(X_tr, y_tr, validation_data=(X_val, y_val),
                        epochs=epochs, batch_size=32,
                        callbacks=[EarlyStopping(patience=4, restore_best_weights=True, verbose=0),
                                   ReduceLROnPlateau(patience=2, factor=0.5, min_lr=1e-7, verbose=0)],
                        verbose=0)

    results = {"model_key": model_key, "target": target_col, "features": feature_cols,
               "window": WINDOW, "splits": {}}
    for sn, Xs, ys in [("train", X_tr, y_tr), ("val", X_val, y_val), ("test", X_te, y_te)]:
        yp = model.predict(Xs, verbose=0).flatten()
        ya = tscaler.inverse_transform(ys.reshape(-1,1)).flatten()
        yp_inv = tscaler.inverse_transform(yp.reshape(-1,1)).flatten()
        rmse = float(np.sqrt(mean_squared_error(ya, yp_inv)))
        mae = float(mean_absolute_error(ya, yp_inv))
        rng = ya.max() - ya.min()
        results["splits"][sn] = {"rmse": rmse, "mae": mae,
                                  "normalized_mae": float(mae/rng) if rng>0 else 0,
                                  "n_samples": len(ys)}

    for sn in ["train", "val", "test"]:
        s = results["splits"][sn]
        print(f"  {sn:>5}: RMSE={s['rmse']:.4f} MAE={s['mae']:.4f}")

    ratio = results["splits"]["test"]["rmse"] / results["splits"]["train"]["rmse"]
    print(f"  Test/Train ratio: {ratio:.2f} {'OVERFIT' if ratio>1.5 else 'OK'}")

    model_dir = Path(model_dir)
    trained_dir = model_dir / "trained" / name
    viz_dir = model_dir / "visualizations" / model_key
    metrics_dir = model_dir / "metrics"
    trained_dir.mkdir(parents=True, exist_ok=True)
    viz_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    model.save(trained_dir / "forecaster.h5")
    joblib.dump(scaler, trained_dir / "scaler.pkl")
    # The target scaler is what turns a scaled prediction back into a real
    # reading. Serving code needs it, so it must ship alongside the model.
    joblib.dump(tscaler, trained_dir / "target_scaler.pkl")
    with open(metrics_dir / f"{model_key}_metrics.json", 'w') as f:
        json.dump(results, f, indent=2)
    pd.DataFrame(history.history).to_csv(trained_dir / "training_history.csv", index=False)

    # Actual vs Predicted
    ya = tscaler.inverse_transform(y_te.reshape(-1,1)).flatten()
    yp = tscaler.inverse_transform(model.predict(X_te, verbose=0).flatten().reshape(-1,1)).flatten()
    fig, ax = plt.subplots(figsize=(8,5))
    ax.scatter(ya, yp, alpha=0.4, s=10)
    lims = [min(ya.min(),yp.min())-1, max(ya.max(),yp.max())+1]
    ax.plot(lims, lims, 'r--', label='Ideal')
    ax.set_xlabel('Actual'); ax.set_ylabel('Predicted')
    ax.set_title(f'{cfg["description"]} - Actual vs Predicted'); ax.legend()
    fig.tight_layout(); plt.savefig(viz_dir / "actual_vs_predicted.png", dpi=150); plt.close()

    # Forecast 1h
    last_window = data_scaled[-WINDOW:]
    forecast_vals = forecast(model, last_window, tscaler, 600)
    fig, ax = plt.subplots(figsize=(10,5))
    ax.plot(range(len(forecast_vals)), forecast_vals, label='Forecast (1h)')
    ax.set_xlabel('Steps (6s each)'); ax.set_ylabel(target_col)
    ax.set_title(f'{cfg["description"]} - 1 Hour Forecast'); ax.legend()
    fig.tight_layout(); plt.savefig(viz_dir / "forecast_1h.png", dpi=150); plt.close()

    # Training history
    h = history.history
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(h['loss'], label='Train Loss')
    ax1.plot(h['val_loss'], label='Val Loss')
    ax1.set_title('Loss'); ax1.set_xlabel('Epoch'); ax1.legend()
    ax2.plot(h['mae'], label='Train MAE')
    ax2.plot(h['val_mae'], label='Val MAE')
    ax2.set_title('MAE'); ax2.set_xlabel('Epoch'); ax2.legend()
    fig.suptitle(f'{cfg["description"]} - Training History')
    fig.tight_layout(); plt.savefig(viz_dir / "training_history.png", dpi=150); plt.close()

    print(f"Saved to trained/{name}/, visualizations/{model_key}/")
    return results


def train_all_lstm(data_path=None, model_dir=None, epochs=50):
    base_dir = Path(__file__).parent.parent
    if data_path is None:
        data_path = str(base_dir / "data" / "processed" / "raw_only.csv")
    if model_dir is None:
        model_dir = str(base_dir / "models")

    df = pd.read_csv(data_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    print(f"Loaded {len(df)} rows")

    all_results = {}
    for mk in MODEL_CONFIGS:
        r = train_lstm_model(df, mk, model_dir, epochs)
        if r: all_results[mk] = r

    print(f"\n{'='*60}")
    print("  LSTM SUMMARY (Test Set)")
    print(f"{'='*60}")
    for mk, res in all_results.items():
        t = res["splits"]["test"]
        tr = res["splits"]["train"]
        ratio = t['rmse']/tr['rmse'] if tr['rmse']>0 else 0
        status = "OK" if ratio <= 1.5 else "OVERFIT"
        print(f"  {mk} ({res['target']}): RMSE={t['rmse']:.4f} Ratio={ratio:.2f} [{status}]")
    return all_results


if __name__ == "__main__":
    import sys
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    train_all_lstm(epochs=epochs)
