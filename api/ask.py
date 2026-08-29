"""
POST /api/ask
AI Health Assistant endpoint using Gemini with RAG.

Input:
{
    "question": "हवा कैसी है?",
    "station_id": "station_01",
    "language": "hi"
}

Output:
{
    "answer": "वर्तमान AQI 57 है...",
    "language": "hi",
    "sources": ["station_01 latest reading", "24h trend"]
}
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

app = FastAPI(title="Trinetra AI Assistant", version="1.0.0")

# Indian language codes supported by Gemini
INDIAN_LANGUAGES = {
    "hi": "Hindi", "mr": "Marathi", "gu": "Gujarati", "ta": "Tamil",
    "te": "Telugu", "bn": "Bengali", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "en": "English"
}

# System prompt with guardrails
SYSTEM_PROMPT = """You are Trinetra, an air quality health assistant for Somaiya Vidyavihar campus.

STRICT RULES:
1. Answer ONLY using the provided sensor data and context.
2. Refuse ANY question not about air quality, AQI, pollution sources, or health guidance related to air quality.
3. If asked to code, write essays, answer general knowledge, or do anything unrelated to air quality: refuse politely.
4. Respond in the USER'S LANGUAGE (detected or specified).
5. Cite specific sensor readings, trends, or forecasts for every claim.
6. Keep responses concise and actionable.

REFUSAL TEMPLATE: "I can only answer questions about air quality at Trinetra monitoring stations. Please ask about current AQI, pollution sources, forecasts, or health advice related to air quality."

CONTEXT INJECTION:
The user's question will be accompanied by relevant sensor data from Supabase. Use ONLY this data."""

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    station_id: Optional[str] = None
    language: Optional[str] = Field(None, pattern="^(hi|mr|gu|ta|te|bn|kn|ml|pa|or|en)$")


class AskResponse(BaseModel):
    answer: str
    language: str
    sources: List[str]
    refused: bool = False


def detect_language(text: str) -> str:
    """Simple language detection - in production use langdetect or fasttext."""
    # Check for Devanagari (Hindi/Marathi)
    if any('\u0900' <= c <= '\u097F' for c in text):
        return "hi"
    # Check for Gujarati
    if any('\u0A80' <= c <= '\u0AFF' for c in text):
        return "gu"
    # Check for Tamil
    if any('\u0B80' <= c <= '\u0BFF' for c in text):
        return "ta"
    # Check for Telugu
    if any('\u0C00' <= c <= '\u0C7F' for c in text):
        return "te"
    # Check for Bengali
    if any('\u0980' <= c <= '\u09FF' for c in text):
        return "bn"
    # Check for Kannada
    if any('\u0C80' <= c <= '\u0CFF' for c in text):
        return "kn"
    # Check for Malayalam
    if any('\u0D00' <= c <= '\u0D7F' for c in text):
        return "ml"
    # Check for Punjabi (Gurmukhi)
    if any('\u0A00' <= c <= '\u0A7F' for c in text):
        return "pa"
    # Check for Odia
    if any('\u0B00' <= c <= '\u0B7F' for c in text):
        return "or"
    return "en"


def build_context(station_id: str) -> dict:
    """Fetch relevant context from Supabase. Placeholder - implement with Supabase client."""
    # TODO: Implement actual Supabase query
    # For now, return mock context
    return {
        "station": station_id or "station_01",
        "current": {
            "aqi": 57,
            "pm25": 34.7,
            "gas": 543,
            "temp": 28.8,
            "humidity": 85.7,
            "source": "ambient",
            "timestamp": "2024-01-15T10:30:00Z"
        },
        "trend_24h": {
            "avg_aqi": 62,
            "max_aqi": 89,
            "min_aqi": 45,
            "dominant_source": "ambient"
        },
        "forecast": {
            "next_hour_aqi": 61,
            "next_6h_aqi": 58,
            "next_24h_aqi": 65
        }
    }


def build_prompt(question: str, language: str, context: dict) -> str:
    """Build the full prompt for Gemini."""
    lang_name = INDIAN_LANGUAGES.get(language, "English")
    
    context_str = f"""
CURRENT READINGS ({context['station']}):
- AQI: {context['current']['aqi']} ({context['current']['source']})
- PM2.5: {context['current']['pm25']} µg/m³
- Gas (MQ135 raw): {context['current']['gas']}
- Temperature: {context['current']['temp']}°C
- Humidity: {context['current']['humidity']}%
- Time: {context['current']['timestamp']}

24-HOUR TREND:
- Average AQI: {context['trend_24h']['avg_aqi']}
- Range: {context['trend_24h']['min_aqi']} - {context['trend_24h']['max_aqi']}
- Dominant source: {context['trend_24h']['dominant_source']}

FORECAST:
- Next hour: {context['forecast']['next_hour_aqi']} AQI
- Next 6 hours: {context['forecast']['next_6h_aqi']} AQI
- Next 24 hours: {context['forecast']['next_24h_aqi']} AQI
"""
    
    prompt = f"{SYSTEM_PROMPT}\n\nCONTEXT:\n{context_str}\n\nUSER QUESTION ({lang_name}): {question}\n\nANSWER IN {lang_name.upper()}:"
    return prompt


@app.post("/api/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    if not GEMINI_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gemini SDK not installed")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    
    # Detect language if not provided
    language = request.language or detect_language(request.question)
    
    # Build context from Supabase (implement actual query)
    context = build_context(request.station_id)
    
    # Build prompt
    prompt = build_prompt(request.question, language, context)
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        answer = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
    
    # Check if response contains refusal
    refused = "I can only answer questions about air quality" in answer
    
    return AskResponse(
        answer=answer,
        language=language,
        sources=[f"{context['station']} current reading", "24h trend", "forecast"],
        refused=refused
    )


handler = app