#!/usr/bin/env python3
"""
Train RF classifiers M1 (Pollution Source) and M2 (Thermal Comfort).

M1: Real ML - classifies pollution source from sensor readings
M2: Formula-based - classifies comfort from heat index

Raw features: Temperature_C, Humidity_Pct, Air_Quality_MQ135, Dust_Density_ug_m3
Split: 80-10-10
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib, json
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

RAW_FEATURES = ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"]

MODEL_CONFIGS = {
    "M1": {
        "name": "rf_pollution_source",
        "target": "pollution_source",
        "description": "Pollution Source Classification (Real ML)",
    },
    "M2": {
        "name": "rf_thermal_comfort",
        "target": "Thermal_Comfort",
        "description": "Thermal Comfort Classification (Formula)",
    },
}


def compute_heat_index(t_c, rh):
    t_f = t_c * 1.8 + 32
    hi_f = 0.5 * (t_f + 61 + (t_f - 68) * 1.2 + rh * 0.094)
    if hi_f >= 80:
        hi_f = (-42.379 + 2.049*t_f + 10.143*rh - 0.225*t_f*rh
                - 0.007*t_f**2 - 0.055*rh**2 + 0.001*t_f**2*rh
                + 0.001*t_f*rh**2)
    return (hi_f - 32) / 1.8


def compute_thermal_comfort(t_c, rh):
    hi = compute_heat_index(t_c, rh)
    if hi > 32: return "Hot & Humid"
    elif hi > 27: return "Warm"
    return "Comfortable"


def plot_cm(cm, classes, title, path):
    fig, ax = plt.subplots(figsize=(max(6, len(classes)), max(5, len(classes)-1)))
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(xticks=np.arange(cm.shape[1]), yticks=np.arange(cm.shape[0]),
           xticklabels=classes, yticklabels=classes, title=title,
           ylabel='Actual', xlabel='Predicted')
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max()/2 else "black")
    fig.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()


def plot_feature_importance(features, importances, path):
    fig, ax = plt.subplots(figsize=(8, 5))
    y_pos = range(len(features))
    ax.barh(y_pos, importances)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(features)
    ax.set_xlabel('Importance')
    ax.set_title('Feature Importance')
    fig.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches='tight')
    plt.close()


def train_rf_model(df, model_key, model_dir):
    cfg = MODEL_CONFIGS[model_key]
    target = cfg["target"]
    name = cfg["name"]

    print(f"\n{'='*60}")
    print(f"  {model_key}: {cfg['description']}")
    print(f"{'='*60}")

    df = df.copy()
    if target == "Thermal_Comfort":
        df[target] = df.apply(lambda r: compute_thermal_comfort(r["Temperature_C"], r["Humidity_Pct"]), axis=1)

    df_model = df[RAW_FEATURES + [target]].dropna()
    print(f"Samples: {len(df_model)}")

    le = LabelEncoder()
    y = le.fit_transform(df_model[target].astype(str))
    X = df_model[RAW_FEATURES].values
    classes = list(le.classes_)
    print(f"Classes: {classes}")
    print(f"Distribution: {dict(zip(classes, np.bincount(y)))}")

    X_tv, X_test, y_tv, y_test = train_test_split(X, y, test_size=0.1, random_state=42, stratify=y)
    X_train, X_val, y_train, y_val = train_test_split(X_tv, y_tv, test_size=0.111, random_state=42, stratify=y_tv)
    print(f"Split: train={len(X_train)} val={len(X_val)} test={len(X_test)}")

    rf = RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_leaf=5,
                                min_samples_split=10, class_weight='balanced',
                                random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)

    results = {"model_key": model_key, "target": target, "features": RAW_FEATURES,
               "classes": classes, "splits": {}}
    for sn, Xs, ys in [("train", X_train, y_train), ("val", X_val, y_val), ("test", X_test, y_test)]:
        yp = rf.predict(Xs)
        cm = confusion_matrix(ys, yp)
        results["splits"][sn] = {
            "accuracy": float(accuracy_score(ys, yp)),
            "f1_weighted": float(f1_score(ys, yp, average='weighted', zero_division=0)),
            "f1_macro": float(f1_score(ys, yp, average='macro', zero_division=0)),
            "f1_per_class": dict(zip(classes, [float(x) for x in f1_score(ys, yp, average=None, zero_division=0)])),
            "precision_per_class": dict(zip(classes, [float(x) for x in precision_score(ys, yp, average=None, zero_division=0)])),
            "recall_per_class": dict(zip(classes, [float(x) for x in recall_score(ys, yp, average=None, zero_division=0)])),
            "confusion_matrix": cm.tolist(),
        }

    t = results["splits"]["test"]
    print(f"\nTest: Acc={t['accuracy']:.4f} F1-w={t['f1_weighted']:.4f} F1-m={t['f1_macro']:.4f}")
    cm = np.array(t['confusion_matrix'])
    print(f"Confusion Matrix:\n{cm}")
    print(f"Feature Importance:")
    for f, imp in zip(RAW_FEATURES, rf.feature_importances_):
        print(f"  {f}: {imp:.4f}")

    # Save to new folder structure
    model_dir = Path(model_dir)
    trained_dir = model_dir / "trained" / name
    viz_dir = model_dir / "visualizations" / model_key
    metrics_dir = model_dir / "metrics"
    trained_dir.mkdir(parents=True, exist_ok=True)
    viz_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(rf, trained_dir / "model.joblib")
    joblib.dump(le, trained_dir / "encoder.joblib")
    plot_cm(cm, classes, f'{cfg["description"]} - Test Set', viz_dir / "confusion_matrix.png")
    plot_feature_importance(RAW_FEATURES, rf.feature_importances_, viz_dir / "feature_importance.png")
    with open(metrics_dir / f"{model_key}_metrics.json", 'w') as f:
        json.dump(results, f, indent=2)

    print(f"Saved: trained/{name}/model.joblib, visualizations/{model_key}/confusion_matrix.png")
    return results


def train_all_rf(data_path=None, model_dir=None):
    base_dir = Path(__file__).parent.parent
    if data_path is None:
        data_path = str(base_dir / "data" / "processed" / "raw_only.csv")
    if model_dir is None:
        model_dir = str(base_dir / "models")

    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows from {data_path}")

    all_results = {}
    for mk in MODEL_CONFIGS:
        all_results[mk] = train_rf_model(df, mk, model_dir)

    print(f"\n{'='*60}")
    print("  RF SUMMARY (Test Set)")
    print(f"{'='*60}")
    for mk, res in all_results.items():
        t = res["splits"]["test"]
        print(f"  {mk}: Acc={t['accuracy']:.4f} F1-w={t['f1_weighted']:.4f}")
    return all_results


if __name__ == "__main__":
    train_all_rf()
