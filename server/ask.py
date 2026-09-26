"""
POST /api/ask
AI Health Assistant endpoint using Gemini with RAG.

Input:
{
    "question": "how is the air quality?",
    "station_id": "station_01"
}

Output:
{
    "answer": "The current AQI at Engineering Block is 57...",
    "language": "en",
    "sources": ["station_01 latest reading", "24h trend"]
}
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional, List
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Trinetra AI Assistant", version="1.0.0")

INDIAN_LANGUAGES = {
    "hi": "Hindi", "mr": "Marathi", "gu": "Gujarati", "ta": "Tamil",
    "te": "Telugu", "bn": "Bengali", "kn": "Kannada", "ml": "Malayalam",
    "pa": "Punjabi", "or": "Odia", "en": "English",
}

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
The user's question will be accompanied by relevant sensor data from Supabase. Use ONLY this data to form your answer. Do not make up data."""


def detect_language(text: str) -> str:
    if any('\u0900' <= c <= '\u097F' for c in text):
        return "hi"
    if any('\u0A80' <= c <= '\u0AFF' for c in text):
        return "gu"
    if any('\u0B80' <= c <= '\u0BFF' for c in text):
        return "ta"
    if any('\u0C00' <= c <= '\u0C7F' for c in text):
        return "te"
    if any('\u0980' <= c <= '\u09FF' for c in text):
        return "bn"
    if any('\u0C80' <= c <= '\u0CFF' for c in text):
        return "kn"
    if any('\u0D00' <= c <= '\u0D7F' for c in text):
        return "ml"
    if any('\u0A00' <= c <= '\u0A7F' for c in text):
        return "pa"
    if any('\u0B00' <= c <= '\u0B7F' for c in text):
        return "or"
    return "en"


def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


def build_context(station_id: Optional[str] = None) -> str:
    sb = get_supabase_client()
    if sb is None:
        return "No sensor data available (Supabase not configured)."

    lines = []

    try:
        if station_id:
            resp = sb.table("stations").select("*").eq("id", station_id).execute()
            if resp.data:
                s = resp.data[0]
                lines.append(f"Station: {s['name']}")

            resp = sb.table("processed_readings") \
                .select("*") \
                .eq("station_id", station_id) \
                .order("processed_at", desc=True) \
                .limit(1) \
                .execute()
            if resp.data:
                r = resp.data[0]
                lines.append(f"Latest reading: temp={r.get('temperature')}C, humidity={r.get('humidity')}%, "
                             f"pm25={r.get('pm25_ug_m3')}ug/m3, pm10={r.get('pm10_ug_m3')}ug/m3, "
                             f"aqi={r.get('aqi')}, source={r.get('source')}, "
                             f"thermal_comfort={r.get('thermal_comfort')}, "
                             f"at {r.get('processed_at')}")

            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            resp = sb.table("processed_readings") \
                .select("aqi, processed_at") \
                .eq("station_id", station_id) \
                .gte("processed_at", cutoff) \
                .order("processed_at", desc=False) \
                .limit(2880) \
                .execute()
            if resp.data:
                aqi_vals = [r["aqi"] for r in resp.data if r.get("aqi") is not None]
                if aqi_vals:
                    avg = sum(aqi_vals) / len(aqi_vals)
                    high = max(aqi_vals)
                    low = min(aqi_vals)
                    lines.append(f"24h AQI trend: avg={avg:.0f}, high={high}, low={low}, readings={len(aqi_vals)}")
        else:
            resp = sb.table("processed_readings") \
                .select("station_id, aqi, pm25_ug_m3, temperature, humidity, source, thermal_comfort, processed_at") \
                .order("processed_at", desc=True) \
                .limit(20) \
                .execute()
            if resp.data:
                lines.append("Latest readings across all stations:")
                for r in resp.data[:10]:
                    lines.append(f"  {r.get('station_id')}: aqi={r.get('aqi')}, pm25={r.get('pm25_ug_m3')}, "
                                 f"temp={r.get('temperature')}C, source={r.get('source')}, "
                                 f"comfort={r.get('thermal_comfort')}")

        resp = sb.table("stations").select("id, name").execute()
        if resp.data:
            lines.append(f"\nActive stations ({len(resp.data)}): " +
                         ", ".join(s['name'] for s in resp.data[:19]))

    except Exception as e:
        lines.append(f"Error fetching sensor data: {e}")

    return "\n".join(lines) if lines else "No sensor data available yet."


def query_gemini(question: str, context: str, language: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return ("I cannot answer right now because the Gemini API key is not configured. "
                "Please set GEMINI_API_KEY in the environment.")

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = f"""Context from Trinetra sensor network:
{context}

User question: {question}

Respond in language code: {language}. Keep the response concise and actionable. Cite specific sensor values."""

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
            ),
        )
        return response.text
    except ImportError:
        return "Gemini library not installed. Install with: pip install google-genai"
    except Exception as e:
        return f"Error querying AI: {e}"


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    station_id: Optional[str] = None
    language: Optional[str] = Field(None, pattern="^(hi|mr|gu|ta|te|bn|kn|ml|pa|or|en)$")


class AskResponse(BaseModel):
    answer: str
    language: str
    sources: List[str]
    refused: bool = False


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    lang = request.language or detect_language(request.question)

    context = build_context(request.station_id)
    sources = ["Supabase sensor readings"]
    if request.station_id:
        sources.insert(0, f"station {request.station_id}")

    answer = query_gemini(request.question, context, lang)

    refusal_keywords = ["i can only", "i cannot answer", "not about air quality",
                        "cannot help with that", "out of my scope"]
    refused = any(kw in answer.lower() for kw in refusal_keywords)

    return AskResponse(
        answer=answer,
        language=lang,
        sources=sources,
        refused=refused,
    )


handler = app
