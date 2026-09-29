"""Rebuild the target scalers that training never saved.

``train_lstm.py`` fits two MinMaxScalers:

  ``scaler``  over the *features*  -> persisted to ``scaler.pkl``
  ``tscaler`` over the *target*    -> never persisted

The serving code needs ``tscaler`` to turn a scaled model output back into a
real reading. Without it ``forecast_multi()`` raised ``ValueError`` (1 column
against a 3-feature scaler), the ``except Exception`` swallowed it, and the
forecast endpoint returned all zeros.

This recomputes ``tscaler`` from the exact dataset and split the training used,
and then proves the reconstruction is correct two ways:

1. The rebuilt *feature* scaler must match the persisted ``scaler.pkl``. Both
   come from the same ``df_model``, so a match proves the data replication is
   exact -- which is what makes the target scaler trustworthy too.
2. Re-running each model on its recorded test split must reproduce the test
   RMSE stored in ``models/metrics/M*_metrics.json``.

Run from the repo root:  python ml/fit_target_scalers.py
"""

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("KERAS_BACKEND", "torch")  # train_lstm imports keras

import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import MinMaxScaler

BASE = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE / "models"
TRAINED = MODEL_DIR / "trained"
METRICS = MODEL_DIR / "metrics"
DATA = BASE / "data" / "processed" / "raw_only.csv"
WINDOW = 12

# Mirrors ml/train_lstm.py:MODEL_CONFIGS. The feature-scaler check below fails
# loudly if the two ever drift apart.
MODEL_CONFIGS = {
    "M3": {"name": "lstm_temp", "target": "Temperature_C",
           "features": ["Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"]},
    "M4": {"name": "lstm_aq", "target": "Air_Quality_MQ135",
           "features": ["Temperature_C", "Humidity_Pct", "Dust_Density_ug_m3"]},
    "M5": {"name": "lstm_pm25", "target": "Dust_Density_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135"]},
    "M6": {"name": "lstm_pm10", "target": "PM10_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135",
                        "Dust_Density_ug_m3"]},
}

# train_lstm.py derives PM10 with per-row Gaussian noise, so its range cannot
# be reproduced exactly. Everything else is a raw column and is exact.
RANDOM_TARGETS = {"M6"}


def compute_pm10(dust):
    return dust * 1.75 + np.random.normal(0, 0.5)


def build_df():
    df = pd.read_csv(DATA)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    return df


def df_model_for(df, cfg):
    """Exactly the frame train_lstm_model() fits its scalers on."""
    target = cfg["target"]
    if target not in df.columns:
        df = df.copy()
        df[target] = df["Dust_Density_ug_m3"].apply(compute_pm10)
    cols = list(dict.fromkeys(cfg["features"] + [target, "timestamp"]))
    return (df[cols].dropna()
            .sort_values("timestamp")
            .reset_index(drop=True))


def temporal_split(n):
    """Identical to train_lstm.temporal_split(), which is seeded and so exact."""
    idx = np.random.RandomState(42).permutation(n)
    te, ve = int(0.8 * n), int(0.9 * n)
    return idx[:te], idx[te:ve], idx[ve:]


def run_one(df, model_key, cfg):
    out_dir = TRAINED / cfg["name"]
    saved_scaler = out_dir / "scaler.pkl"
    if not saved_scaler.exists():
        print(f"  SKIP  {model_key}: no scaler.pkl in {out_dir.name}")
        return False

    import joblib

    dmf = df_model_for(df, cfg)
    feat_scaler = MinMaxScaler().fit(dmf[cfg["features"]].values)
    saved = joblib.load(saved_scaler)

    # 1. Data replication check.
    drift = max(
        float(np.max(np.abs(feat_scaler.data_min_ - saved.data_min_))),
        float(np.max(np.abs(feat_scaler.data_max_ - saved.data_max_))),
    )
    ok_data = drift < 1e-9

    tscaler = MinMaxScaler().fit(dmf[[cfg["target"]]].values)
    joblib.dump(tscaler, out_dir / "target_scaler.pkl")

    # 2. RMSE reproduction check.
    rmse_note = "n/a"
    if model_key not in RANDOM_TARGETS:
        metrics_file = METRICS / f"{model_key}_metrics.json"
        recorded = json.loads(metrics_file.read_text())["splits"]["test"]["rmse"]
        try:
            data_scaled = saved.transform(dmf[cfg["features"]].values)
            target_scaled = tscaler.transform(dmf[[cfg["target"]]].values).flatten()
            X = np.array([data_scaled[i:i + WINDOW]
                          for i in range(len(data_scaled) - WINDOW)])
            y = np.array([target_scaled[i + WINDOW]
                          for i in range(len(target_scaled) - WINDOW)])
            tr, _, te = temporal_split(len(X))
            from keras.models import load_model
            model = load_model(out_dir / "forecaster.h5", compile=False)
            pred = model.predict(X[te], verbose=0).flatten()
            actual = tscaler.inverse_transform(y[te].reshape(-1, 1)).flatten()
            pred_real = tscaler.inverse_transform(pred.reshape(-1, 1)).flatten()
            got = float(np.sqrt(mean_squared_error(actual, pred_real)))
            rmse_note = f"rmse {got:.4f} vs recorded {recorded:.4f}"
            ok_rmse = abs(got - recorded) < 0.05 * max(abs(recorded), 1e-6)
        except Exception as exc:
            rmse_note = f"rmse check errored: {exc}"
            ok_rmse = False
    else:
        ok_rmse = True
        rmse_note = "rmse n/a (derived target, non-reproducible noise)"

    status = "OK  " if (ok_data and ok_rmse) else "FAIL"
    print(f"  {status}  {model_key} {cfg['name']:11} "
          f"data_drift={drift:.1e}  [{rmse_note}]")
    return ok_data and ok_rmse


def main():
    if not DATA.exists():
        print(f"Dataset missing: {DATA}")
        return 1
    df = build_df()
    print(f"Loaded {len(df)} rows; rebuilding target scalers into {TRAINED}")
    results = {k: run_one(df, k, c) for k, c in MODEL_CONFIGS.items()}

    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"\nFAILED: {', '.join(failed)}")
        return 1
    print("\nAll target scalers rebuilt and validated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
