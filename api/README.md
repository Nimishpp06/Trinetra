# Vercel Serverless Functions for Trinetra

This folder contains Python serverless functions deployed to Vercel.

## Structure

```
api/
├── predict.py      # POST /api/predict - ML inference endpoint
├── ask.py          # POST /api/ask - AI Assistant endpoint  
├── health.py       # GET /api/health - Model health check
└── requirements.txt # Python dependencies for Vercel
```

## Deployment

1. Add to `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ],
  "functions": {
    "api/*.py": {
      "runtime": "python3.11"
    }
  }
}
```

2. Set environment variables in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## Local Development

```bash
# Install dependencies
pip install -r api/requirements.txt

# Run locally with Vercel CLI
vercel dev
```