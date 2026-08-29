---
name: gemini-advisory
description: Build Gemini Flash integration that accepts multi-lingual questions, injects current sensor readings + predicted source, returns health advisory
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: llm-integration
---
## What I do
- Single callable function: get_advisory(question, language, pm25, gas, temp, humidity, predicted_source)
- Uses google-generativeai SDK with gemini-2.0-flash (free tier)
- API key from GEMINI_API_KEY env var
- Prompt template injects CPCB AQI band, current readings, and predicted source
- Returns localized health advisory text (no Streamlit dependency)
