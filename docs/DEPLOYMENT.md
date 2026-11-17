# Deployment (not tested: nothing here was deployed while the project was assembled)

## Order

1. Supabase: already hosted. Add your real website address to **Site URL** and **Redirect URLs**
   (`/auth/callback` and `/reset-password`). Add SMTP for real emails.
2. Backend: needs Python 3.12+ and the Tesseract program, so use a host that runs Docker or lets you install
   system packages (for example Render or Railway with the `Dockerfile` in the project root).
   Set these environment variables on the host (no `.env` file): `SUPABASE_URL`, `FRONTEND_ORIGIN` (your
   website address, no trailing slash), optionally `SUPABASE_JWT_SECRET`, `HF_TOKEN`, `HF_MODEL`.
   Check `GET /` returns `{"message": "TaxEase AI is running"}`.
3. Frontend: deploy the `frontend/` folder to Vercel (root directory `frontend`). Set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_API_URL` (your backend's public
   address). These are inlined when the site is built, so redeploy after changing them.

## Before going live

- Rotate any token that was ever shared (see the security notes in `FINAL_PROJECT_REPORT.md`).
- Confirm tax rules in `backend/tax_engine.py` and dates in `backend/deadlines.json` against official sources.
- Keep the disclaimer visible. Do not market the results as verified tax advice.
- The assistant's first question after a restart builds the search index and can take a minute.
- The rate limiter counts per process. If you run several worker processes, each keeps its own count.
