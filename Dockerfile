FROM python:3.12-slim

WORKDIR /app

# Dependencies first for layer caching
COPY server/requirements.txt ./requirements.txt

# CPU-only torch (smaller image, faster build); satisfied below so not re-fetched
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# App + ML models
COPY server/ ./server/
COPY models/ ./models/

EXPOSE 7860

# Run from server/ so Path(__file__).parent.parent resolves to /app (project root)
CMD ["sh", "-c", "cd server && python -m uvicorn main:app --host 0.0.0.0 --port 7860"]
