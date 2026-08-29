#!/usr/bin/env python3
"""
Train Random Forest classifier for pollution source detection.
Supports: global model (all locations) OR per-location models.

Features: [pm25, gas_ppm, temp, humidity]
Target: source_label (ambient/traffic/industrial)

Outputs:
- models/rf_source_classifier_global.joblib (global model)
- models/rf_source_classifier_{location}.joblib (per-location models)
- models/rf_label_encoder.joblib (label encoder)
- Prints: accuracy, weighted F1, confusion matrix, classification report
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, f1_score, confusion_matrix, 
    classification_report, ConfusionMatrixDisplay
)
import matplotlib.pyplot as plt


def train_random_forest(
    data_path: str = None,
    model_dir: str = None,
    test_size: float = 0.2,
    random_state: int = 42,
    n_estimators: int = 200,
    max_depth: int = None,
    class_weight: str = "balanced",
    per_location: bool = False
):
    # Resolve paths relative to this script's location
    base_dir = Path(__file__).parent.parent
    if data_path is None:
        data_path = str(base_dir / "data/processed/air_quality_data.csv")
    if model_dir is None:
        model_dir = str(base_dir / "models")
    """Train and evaluate Random Forest classifier."""
    
    # Load data
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows from {data_path}")
    
    # Check for source labels
    if 'source_label' not in df.columns:
        raise ValueError("source_label column not found. Please label your data first.")
    
    # Remove unlabeled rows
    labeled = df[df['source_label'] != 'unlabeled'].copy()
    print(f"Labeled samples: {len(labeled)}")
    
    if len(labeled) == 0:
        raise ValueError("No labeled data found. Please label source_label column (ambient/traffic/industrial)")
    
    print("\nLabel distribution:")
    print(labeled['source_label'].value_counts())
    
    if 'location_id' in labeled.columns:
        print(f"\nLocations: {labeled['location_id'].nunique()}")
        print(labeled['location_id'].value_counts())
    
    feature_cols = ['pm25', 'gas_ppm', 'temp', 'humidity']
    
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    if per_location and 'location_id' in labeled.columns:
        # Train per-location models
        print("\n" + "="*50)
        print("TRAINING PER-LOCATION MODELS")
        print("="*50)
        
        for loc in sorted(labeled['location_id'].unique()):
            loc_data = labeled[labeled['location_id'] == loc]
            print(f"\n--- Location: {loc} ({len(loc_data)} samples) ---")
            
            if len(loc_data) < 20:
                print(f"  Skipping {loc}: too few samples ({len(loc_data)})")
                continue
            
            X = loc_data[feature_cols].values
            y = loc_data['source_label'].values
            
            le = LabelEncoder()
            y_encoded = le.fit_transform(y)
            
            if len(le.classes_) < 2:
                print(f"  Skipping {loc}: only one class ({le.classes_[0]})")
                continue
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=test_size, random_state=random_state, stratify=y_encoded
            )
            
            rf = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                class_weight=class_weight,
                random_state=random_state,
                n_jobs=-1
            )
            rf.fit(X_train, y_train)
            y_pred = rf.predict(X_test)
            
            acc = accuracy_score(y_test, y_pred)
            f1_w = f1_score(y_test, y_pred, average='weighted')
            f1_m = f1_score(y_test, y_pred, average='macro')
            
            print(f"  Accuracy: {acc:.4f}, F1-weighted: {f1_w:.4f}, F1-macro: {f1_m:.4f}")
            
            # Save per-location model
            safe_loc = loc.replace('/', '_').replace(' ', '_')
            model_path = model_dir / f"rf_source_classifier_{safe_loc}.joblib"
            encoder_path = model_dir / f"rf_label_encoder_{safe_loc}.joblib"
            joblib.dump(rf, model_path)
            joblib.dump(le, encoder_path)
            
            results[loc] = {
                'model': rf, 'label_encoder': le,
                'accuracy': acc, 'f1_weighted': f1_w, 'f1_macro': f1_m
            }
    
    # ALWAYS train global model (all locations combined)
    print("\n" + "="*50)
    print("TRAINING GLOBAL MODEL (all locations)")
    print("="*50)
    
    X = labeled[feature_cols].values
    y = labeled['source_label'].values
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    print(f"Classes: {list(le.classes_)}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=test_size, random_state=random_state, stratify=y_encoded
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")
    
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        class_weight=class_weight,
        random_state=random_state,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    f1_weighted = f1_score(y_test, y_pred, average='weighted')
    f1_macro = f1_score(y_test, y_pred, average='macro')
    f1_per_class = f1_score(y_test, y_pred, average=None)
    
    print(f"\nAccuracy:           {acc:.4f}")
    print(f"F1 (weighted):      {f1_weighted:.4f}")
    print(f"F1 (macro):         {f1_macro:.4f}")
    print(f"F1 per class:       {dict(zip(le.classes_, [f'{x:.4f}' for x in f1_per_class]))}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    print(f"Rows: Actual, Cols: Predicted | Classes: {list(le.classes_)}")
    
    print("\nFeature Importance:")
    for name, imp in zip(feature_cols, rf.feature_importances_):
        print(f"  {name}: {imp:.4f}")
    
    # Save GLOBAL model
    global_model_path = model_dir / "rf_source_classifier_global.joblib"
    global_encoder_path = model_dir / "rf_label_encoder_global.joblib"
    joblib.dump(rf, global_model_path)
    joblib.dump(le, global_encoder_path)
    print(f"\nSaved GLOBAL model to {global_model_path}")
    print(f"Saved GLOBAL label encoder to {global_encoder_path}")
    
    # Save confusion matrix plot
    try:
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=le.classes_)
        fig, ax = plt.subplots(figsize=(6, 5))
        disp.plot(ax=ax, cmap='Blues')
        plt.title('Random Forest Confusion Matrix (Global)')
        plt.tight_layout()
        plot_path = model_dir / "rf_confusion_matrix_global.png"
        plt.savefig(plot_path, dpi=150)
        plt.close()
        print(f"Saved confusion matrix plot to {plot_path}")
    except Exception as e:
        print(f"Could not save plot: {e}")
    
    results['global'] = {
        'model': rf,
        'label_encoder': le,
        'accuracy': acc,
        'f1_weighted': f1_weighted,
        'f1_macro': f1_macro,
        'f1_per_class': dict(zip(le.classes_, f1_per_class)),
        'confusion_matrix': cm,
        'feature_importance': dict(zip(feature_cols, rf.feature_importances_))
    }
    
    return results


if __name__ == "__main__":
    import sys
    per_loc = '--per-location' in sys.argv
    train_random_forest(per_location=per_loc)