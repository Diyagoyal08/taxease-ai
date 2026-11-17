# TaxEase AI

An AI-assisted tax and GST helper for individuals, freelancers and small businesses in India. It explains
procedures, reads documents, checks them for mistakes, compares the old and new income tax regimes, tracks
deadlines, and answers questions from official documents with the source shown.

It gives **guidance and preliminary figures only**. Final calculations, filing decisions and submissions must be
checked against current official rules or a qualified professional. There is no automatic filing and no
connection to government portals.

## Features

| Module | What it does | Where |
|---|---|---|
| Deadline dashboard | Next due dates for ITR, advance tax, TDS and GST returns, charts, search | `frontend/app/(app)/page.js`, `backend/deadlines.json` |
| Tax calculator | Old vs new regime, rebate, cess, recommendation, downloadable summary PDF | `backend/tax_engine.py`, `backend/summary_pdf.py` |
| Form 16 reader | Reads a Form 16 PDF, rule-based field extraction with confidence, human review step | `backend/extractor.py` |
| Bills reader | PDFs, scans and photos (Tesseract OCR), classified into deduction types, totalled per type | `backend/bill_reader.py`, `backend/ocr.py` |
| GST invoice checker | GSTIN checksum, tax maths, CGST/SGST vs IGST, rate for the invoice date, duplicates | `backend/invoice_checker.py` |
| PAN and GSTIN checker | Format and check-character validation | `backend/validators.py` |
| Assistant | Search over official documents (TF-IDF) plus an answer written by a hosted language model, with sources | `backend/knowledge.py`, `backend/answerer.py` |
| Accounts | Sign up, email verification, login, password reset, profile, roles | Supabase Auth, `frontend/lib/auth.js`, `backend/auth.py` |

Tax arithmetic is always done by deterministic code with unit tests. The language model only explains; it never
computes.

## Architecture in one picture

```
Browser (Next.js, frontend/)
   |  1. sign up / log in                  2. calls with  Authorization: Bearer <token>
   v                                                         v
Supabase Auth  -- token -->  Browser  ------------------>  FastAPI (backend/)
Supabase Postgres (profiles + Row Level Security)            |  checks the token on EVERY request (auth.py)
   ^                                                         |  tax, documents, GST, search: local Python code
   |  3. profile reads/updates, protected by database rules  |  assistant answers: Hugging Face (optional)
   +---------------------------------------------------------+
```

More detail: `docs/ARCHITECTURE.md`. Endpoints: `docs/API.md`. Database: `docs/DATABASE.md`.

## Technology

Next.js 16 (React 19, plain CSS, Manrope font) | FastAPI, Python 3.12+ | Supabase (Auth, PostgreSQL, Row Level
Security) | Tesseract OCR, pdfplumber, scikit-learn (TF-IDF search), ReportLab | Hugging Face Inference Providers
(optional).

## Folder layout

```
TaxEase-AI/
  frontend/    the website (Next.js). Pages in app/, shared parts in components/, backend calls in lib/api.js
  backend/     the API (FastAPI) and its tests
  database/    schema.sql (Supabase tables and security rules) and test_rls.py
  data/        official documents for the assistant, sample documents for testing, evaluation questions
  docs/        setup, architecture, API, database, deployment
  FINAL_PROJECT_REPORT.md
```

There is no separate `ai-ml/` folder: this project has no trained machine-learning model. Its "AI" parts are
the TF-IDF search, rule-based extraction, OCR and a hosted language model. They live in `backend/`.

## Prerequisites

- Python 3.12 or newer, Node.js 20.9 or newer
- Tesseract OCR (the program, not just the Python package). Windows: install from the UB-Mannheim build, default
  folder `C:\Program Files\Tesseract-OCR\` is found automatically. macOS: `brew install tesseract`.
  Linux: `sudo apt install tesseract-ocr`.
- A free Supabase project (steps in `docs/SETUP.md`)
- Optional: a Hugging Face token for written answers

## Install and run (Windows PowerShell; adjust paths on other systems)

1. **Supabase**: follow `docs/SETUP.md` sections 1 to 3 (create the project, run `database/schema.sql`, set the
   email options).
2. **Backend**
   ```
   cd backend
   python -m venv venv
   .\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
   copy .env.example .env          # then fill in SUPABASE_URL (and HF_TOKEN if you have one)
   .\venv\Scripts\python.exe -m uvicorn main:app --reload
   ```
3. **Frontend** (second terminal)
   ```
   cd frontend
   copy .env.local.example .env.local     # then fill in the two Supabase values
   npm install
   npm run dev
   ```
4. Open http://localhost:3000, create an account, confirm the email, sign in. The sidebar shows
   "Backend connected" when the website and the API can talk.

## Environment variables

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `SUPABASE_URL` | Required. Used to verify login tokens |
| | `SUPABASE_JWT_SECRET` | Only for projects using the older shared-secret signing |
| | `FRONTEND_ORIGIN` | The one website address allowed to call the API |
| | `HF_TOKEN`, `HF_MODEL` | Optional. Written answers in the assistant |
| `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase values |
| | `NEXT_PUBLIC_API_URL` | Where the backend runs (default `http://127.0.0.1:8000`) |
| | `NEXT_PUBLIC_ENABLE_GOOGLE` | `true` only after Google is set up in Supabase |

Never put the Supabase `service_role` key or your Hugging Face token in the frontend or in Git.

## Authentication workflow

1. Sign up: Supabase emails a confirmation link; `/auth/callback` finishes the sign-in.
2. Log in: Supabase returns a signed token. "Remember me" off keeps it for the tab only.
3. Every API call carries the token. `backend/auth.py` verifies the signature, issuer, audience and expiry. The
   user id and role come from the verified token, never from the request body.
4. If the backend refuses the token, the website signs the person out and shows "session expired".
5. Roles live in the user's `app_metadata` (users cannot edit it). `require_admin` protects admin-only routes.
6. Logging out clears the saved calculator numbers from the browser.

## Testing

```
cd backend && .\venv\Scripts\python.exe -m pytest          # 119 tests
cd frontend && npm run lint && npm run build               # lint and production build
cd database && python3 test_rls.py                         # database rules; needs a local PostgreSQL
cd backend && .\venv\Scripts\python.exe eval_retrieval.py  # search quality on data/eval_questions.json
```

What was run, and what could not be, is listed in `FINAL_PROJECT_REPORT.md`.

## Troubleshooting

| What you see | What to do |
|---|---|
| Sidebar says "Backend not running" | Start the backend and wait a few seconds |
| Every page says "Sign-in is not set up yet" | Fill in `frontend/.env.local`, restart `npm run dev` |
| 503 "Sign-in is not configured on the server" | `SUPABASE_URL` is missing in `backend/.env` |
| "Your session expired" after every login | `SUPABASE_URL` in `backend/.env` must be exactly the website's Supabase URL |
| CORS error in the browser console | `FRONTEND_ORIGIN` must equal the website address exactly (no trailing slash) |
| Scans and photos are not read | Install Tesseract and make sure it is on the PATH |
| Assistant shows passages but no written answer | `HF_TOKEN` missing, or the free monthly credits are used up (HTTP 402) |
| Confirmation email never arrives | Check spam; Supabase's built-in sender allows very few emails per hour |
| `npm install` fails | Check `node --version` (20.9 or newer) |
