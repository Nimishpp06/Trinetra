# Trinetra — Setup & Deployment Checklist

Deadline: **Sep 30** · Demo day: jury tests live site

## Architecture

| Piece | Where | URL |
|---|---|---|
| React SPA (auth, dashboard, maps, charts) | Vercel (free) | `https://<vercel-domain>` |
| Python API (LSTM forecast, RF classifier, Gemini AI) | Hugging Face Space (free, Docker) | `https://<space>.hf.space` |
| Data (readings, profiles, stations) | Supabase | `https://tmqtiamgeapiiikgjfti.supabase.co` |

Local dev: `npm run dev` from project root → frontend :5173 + API :8000, everything runs on your machine.

---

## 1. Local dev setup (any machine)

```bash
npm install                      # root (concurrently)
cd Trinetra/Trinetra && npm install && cd ../..
cd server && pip install -r requirements.txt && cd ..
npm run dev
```

Two `.env` files needed (NOT in git — recreate if missing):

**`project_root/.env`** (Python API):
```
SUPABASE_URL=https://tmqtiamgeapiiikgjfti.supabase.co
SUPABASE_ANON_KEY=<same key as below>
GEMINI_API_KEY=<your Gemini key>
```

**`Trinetra/Trinetra/.env`** (frontend):
```
VITE_SUPABASE_URL=https://tmqtiamgeapiiikgjfti.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_BASE=/api
```

---

## 2. Google Cloud Console (ONE-TIME, ~10 min)

1. https://console.cloud.google.com → **APIs & Services → OAuth consent screen**
   - User type: **External** → App name: `Trinetra` → add your email
   - Scopes: add `email`, `profile`, `openid`
   - Test users: add every Gmail you'll demo with (your account + teammates)
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://<vercel-domain>` ← add after first Vercel deploy
   - Authorized redirect URI:
     - `https://tmqtiamgeapiiikgjfti.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client secret**
3. (If the Google button errors with access_blocked: publish the consent screen or keep demo users in the test list)

## 3. Supabase Dashboard (~5 min)

1. **Authentication → Providers → Google** → Enabled → paste Client ID + secret → Save
2. **Authentication → Providers → Email** → turn **OFF** "Confirm email" (so sign-up works without inbox; re-enable after demo)
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173/**` and `https://<vercel-domain>/**`
4. **SQL Editor** → paste all of `supabase/auth.sql` → Run (creates `profiles` + auto-join trigger + RLS)

## 4. Hugging Face Space (~15 min, do FIRST of the hosting steps)

1. https://huggingface.co → sign up (free, no card) → New Space
   - Name: `trinetra-api` (or similar) → **SDK: Docker** → Public → Create
2. Push the repo to the Space (once):
   ```bash
   git remote add space https://huggingface.co/spaces/<hf-username>/<space-name>
   git push space main
   ```
   (or connect the Space to the GitHub repo for auto-sync)
3. **Space → Settings → Variables and secrets** add:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS` = `http://localhost:5173,https://<vercel-domain>`
4. Wait for the build (first build installs CPU torch ~5–10 min)
5. Validate BEFORE wiring the frontend:
   ```bash
   curl https://<space>.hf.space/api/health          # JSON with models loaded
   curl -X POST https://<space>.hf.space/api/ask -H "Content-Type: application/json" -d "{\"question\":\"hello\"}"
   ```
6. **Settings → Variables** → add repo variable `HF_SPACE_URL` = `https://huggingface.co/spaces/<user>/<name>` (powers the keep-alive workflow so the Space never sleeps)

## 5. Vercel (~10 min)

1. https://vercel.com → Add New → Project → import `Nimishpp06/Trinetra`
   - Root directory: repo root (build command already set in `vercel.json`)
2. **Settings → Environment Variables** (set BEFORE first build — Vite bakes them in):
   - `VITE_SUPABASE_URL` = `https://tmqtiamgeapiiikgjfti.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<anon key>`
   - `VITE_API_BASE` = `https://<space>.hf.space/api`
3. Deploy → get the `<vercel-domain>`
4. **Back-fill the domain** everywhere:
   - Google Cloud → OAuth client → JS origins → add `https://<vercel-domain>`
   - Supabase → URL Configuration → add `https://<vercel-domain>/**`
   - Hugging Face → Space variable `ALLOWED_ORIGINS` → append `https://<vercel-domain>`

---

## Demo-day checklist (Oct 3 / jury day)

1. Open the live site ~1 min before (wakes the Space if it slept)
2. Confirm keep-alive workflow is green (GitHub → Actions)
3. Fallback ready: `npm run dev` locally — full stack works offline from Vercel/HF
4. Test path the jury will take: Google login → Dashboard live AQI → Forecast → AI question in Hindi/English
5. If anything looks dead: check `curl https://<space>.hf.space/api/health` first — it's almost always the API host, not your app
