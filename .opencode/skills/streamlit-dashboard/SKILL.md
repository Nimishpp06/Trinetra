---
name: streamlit-dashboard
description: Build Streamlit dashboard with Folium map, time-series graphs with filters, data table, and model prediction overlays
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: dashboard
---
## What I do
- Folium map centered on Delhi (28.61, 77.23) with CPCB color-coded markers
- Time-series line charts with: date slider, source multi-select, parameter selector, rolling avg overlay, anomaly highlights
- Live predictions from RF classifier + LSTM forecaster loaded via joblib/keras
- All filtering done with pandas, no extra models needed
