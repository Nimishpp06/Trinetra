"""
Trinetra API — Local dev entry point
Run: cd server && python -m uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")  # no-op if .env is missing (HF Space uses env vars)

from predict import app as predict_app
from process import app as process_app
from forecast import app as forecast_app
from ask import app as ask_app

app = FastAPI(title="Trinetra API", version="1.0.0")

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount each sub-app's routes under /api
app.include_router(predict_app.router, prefix="/api", tags=["predict"])
app.include_router(process_app.router, prefix="/api", tags=["process"])
app.include_router(forecast_app.router, prefix="/api", tags=["forecast"])
app.include_router(ask_app.router, prefix="/api", tags=["ask"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "Trinetra API"}


@app.get("/api/health")
async def health():
    """Combined health check."""
    from predict import get_models
    rf, le, lstm, scaler = get_models()
    return {
        "status": "healthy" if rf is not None else "models_not_loaded",
        "random_forest_loaded": rf is not None,
        "lstm_loaded": lstm is not None,
        "endpoints": ["/api/predict", "/api/process", "/api/forecast", "/api/ask"],
    }
