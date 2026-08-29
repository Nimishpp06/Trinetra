---
name: ml-training
description: Train and evaluate Random Forest classifier (source detection) and LSTM forecaster (AQI prediction) on air quality time-series data
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: model-training
---
## What I do
- Pipeline: ESP32 CSVs in data/raw/ -> python data/process_raw.py -> data/processed/air_quality_data.csv
- User manually labels source_label (ambient/traffic/industrial) in the processed CSV
- Random Forest: train on [pm25, gas_ppm, temp, humidity] predicting source_label
  - 80/20 stratified train/test split
  - Report accuracy, weighted F1, confusion matrix
  - Save model as joblib pickle
- LSTM: rolling-window (12 timesteps) forecasting of next AQI value
  - Compute AQI from PM2.5 using CPCB piecewise formula
  - Keras 3 with KERAS_BACKEND=torch (Python 3.14, no TensorFlow)
  - Architecture: LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dense(1)
  - Report RMSE and MAE
  - Save model as .h5 plus MinMaxScaler as .pkl
