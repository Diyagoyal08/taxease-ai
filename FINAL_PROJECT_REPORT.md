# TaxEase AI: final project report

This report describes how three uploaded archives were consolidated into one project, what was changed, and,
just as important, what was and was not tested. Nothing below is claimed as working unless it was run.

## 1. Archives inspected

| Archive | Contents | Role in the merge |
|---|---|---|
| `taxease-ai.zip` (24,551 files, about 1 GB unpacked) | Your full repository: `backend/` (FastAPI, 15 modules, 11 test files, 64 tests), `frontend/` (an early copy of the website plus the Step 2 `index.html` prototype), `data/` (5 official documents, sample Form 16s, sample bills and scans, evaluation questions, generator scripts), an empty `docs/`, a 13-commit git history, plus vendor folders (`backend/venv`, `frontend/.../node_modules`) and a `backend/.env` | **Base of the project.** Source of the whole backend, the data and the evaluation set |
| `taxease-web_1.zip` (25 files) | The website, first version (old colours, no login) | Identical to the copy inside `taxease-ai.zip` (checked file by file). Superseded, nothing unique |
| `taxease-stage-a.zip` (52 files) | The website, newest version (Manrope and the purple/sky/near-black palette, ESLint, Supabase login, protected route groups), `backend-auth/` (token check and tests), `supabase/` (schema and database tests), setup guide | **Source of the frontend**, the auth module and the database files |

The newest archive was not assumed to be complete: every file of the older frontend was checked for a successor
in the newer one. None was missing.

## 2. Features recovered and merged

From `taxease-ai.zip`: deadline data (14 deadlines, including the TDS ones you added), tax calculator and summary PDF,
PAN and GSTIN validators, Form 16 extractor, bill reader with OCR, GST invoice checker, knowledge search,
assistant answer module, 64 tests, retrieval evaluation script and 30 questions, sample documents and the five
official documents.

From `taxease-stage-a.zip`: the final website (7 working pages plus sign-in pages and profile), Supabase login,
the backend token check, the database schema with security rules, and the setup guide.

All of the above is in one tree. No backend module was dropped or replaced by a placeholder.

## 3. What is new in this consolidation

| Change | Where |
|---|---|
| Every endpoint except the health check now needs a verified login; CORS restricted to the website | `backend/main.py`, `backend/auth.py` |
| Safe uploads: allowed types, real file contents (not just the name), 10 MB limit, 10 files, temp files always deleted, damaged files give a clear message instead of a crash | `backend/uploads.py` |
| Per-user rate limit on the assistant (20 per 10 minutes) to protect language-model credits | `backend/ratelimit.py` |
| Assistant failures no longer leak internal addresses or request ids; usage-limit errors get a friendly message | `backend/answerer.py` |
| Form 16 label "Total Emoluments" now recognised (an unfinished exercise from Step 5) | `backend/extractor.py` |
| Search endpoint input limits | `backend/main.py` |
| 55 new backend tests (119 total) | `backend/test_*.py` |
| Pinned dependency lists, environment templates, `.gitignore`, Dockerfile, full documentation | project root, `docs/` |
| Frontend flattened from `frontend/taxease-web/web` to `frontend/` | `frontend/` |

## 4. Bugs found and fixed

| Bug | Found by | Fix |
|---|---|---|
| Two places set React state inside an effect, and the donut chart changed a variable while rendering | ESLint (first time a linter was run on the frontend) | Browser data is read through a proper store hook; chart computed without mutation |
| The GST page overflowed sideways (a hidden label inside a wide table) | Browser test with page-width check | Table container made the positioning context |
| After "Sign out everywhere" the person landed on `login?next=/profile` | Browser test | The app records why a sign-out happened (deliberate or expired) |
| If the backend refused a token during login, the person got no "session expired" message (two redirects raced) | Real-backend browser test | One redirect, decided from the recorded reason |
| Logout left empty entries behind in browser storage | Browser test | Entries are now removed |
| Form 16 upload crashed on a missing file name, accepted any content with a `.pdf` name, had no size limit | Code audit | `uploads.py` plus tests |
| Open CORS (`*`) | Code audit | Only `FRONTEND_ORIGIN` |
| Assistant error text exposed a request URL and id to the browser | Code audit | Short code to the browser, details to the server log |
| Search endpoint accepted any `k` and one-character queries | Code audit | Validated |
| Evaluation question "How do I opt out of the new tax regime" accepted only one valid source though the FAQ document also answers it | Evaluation run | Question now accepts either source (data change) |

## 5. Files removed or not carried over, and why

| Item | Reason |
|---|---|
| `backend/venv`, `frontend/**/node_modules`, `.next`, `__pycache__`, `.pytest_cache` | Installed or generated; recreated by the install commands |
| `backend/.env` | Contains a real secret. Not copied. Use `backend/.env.example` |
| `.git` (48 MB history) | Your repository history belongs to your own repository. Copy the new files over your working copy and commit |
| `.agents/` and `skills-lock.json` | A third-party design-assistant skill installed by your editor tooling; not used by the app and can be reinstalled |
| `.vscode/settings.json` | Personal editor setting |
| `frontend/index.html` | The Step 2 prototype; the dashboard page does the same job (same endpoint) and more |
| `data/test_summary.pdf` | A generated test output, not used by any code |
| The duplicate older frontend copies | Superseded by the newest version, verified identical to the first version |

## 6. Security

Improvements: login required on every data endpoint with signature, issuer, audience and expiry checks
(unsigned, forged, expired and wrong-key tokens refused); roles only from `app_metadata`; fail-closed when the
server is not configured; restricted CORS; upload validation and limits; per-user chat limit; no internal
details in error responses; database rules so users see and edit only their own row, with column-level privileges;
the frontend contains only the public Supabase key; open-redirect protection on the `next` parameter; no
account-enumeration on password reset; calculator numbers wiped from the browser at logout.

Checks run: search of the project for secrets (only warnings in documentation matched), `npm audit` for
production dependencies (0 vulnerabilities).

**Action needed from you:** `backend/.env` in the archive you uploaded contained a real Hugging Face token
(37 characters). It was never committed to git, and it is not in the final ZIP, but it did leave your computer
inside an archive. Revoke it in your Hugging Face settings and create a new one with only the permission to call
Inference Providers.

## 7. Tests: what was run

| Check | Result |
|---|---|
| Backend baseline: your original 64 tests, unchanged code, real Tesseract 5.3.4 | 64 passed |
| Backend after the changes (`pytest`): 119 tests | **119 passed** |
| Database rules (`database/test_rls.py`, real PostgreSQL 16 with imitated Supabase helpers) | **17 of 17 passed** |
| Frontend lint | clean |
| Frontend production build | succeeded, 17 routes |
| `npm audit`, production dependencies | 0 vulnerabilities |
| **Real end to end** (real browser, real backend, real OCR, real search over your documents, your real sample files; only the Supabase login service imitated, issuing genuine signed tokens) | **36 of 36 passed** |
| Sign-in flows in a browser (validation, wrong password, unconfirmed email, resend, sign-up, duplicate email, forgot and reset password, remember me, expired session, protected routes, profile, phone layout) against an imitation of Supabase | 49 of 49 passed |
| All feature pages behind a login against a stand-in backend with canned answers | 50 of 50 passed |
| Search quality on `data/eval_questions.json` (30 questions: 20 answerable, 10 unanswerable) | 24 of 30 (80%) |

What the 36 real end-to-end checks cover: refusal of missing, damaged, wrong-key and expired tokens; the real tax
engine (₹97,500 and ₹2,10,600); a real PDF download with the right totals; both sample Form 16s (including the
Total Emoluments fix); a disguised PNG refused; text bills totalled and three real scans read by OCR (type and
amount correct, flagged, confirmed by hand); the GST checker (duplicate and wrong tax found); the GSTIN
checksum; the assistant showing the right ITR-1 passage with no internal details when no model is configured; the
chat limit; an expired token sending the person back to login with an explanation.

Failures seen during testing: the bugs in section 4, plus several mistakes in my own test expectations (for
example the real file has 14 deadlines, not 10), which were corrected and are not counted as application bugs.

Test environment: Python 3.12.3 with fastapi 0.162.2, reportlab 5.0.1 and PyJWT 2.7.0 (your environment pins
0.162.0 and 5.1.0; the other packages match the pins), Node 22, Chromium through Playwright.

### Search quality, in plain words

Of the 6 misses, 2 are unrelated questions that still returned passages (the word "capital" matches "capital
gains"), and 4 are casual, informally written questions such as "should i fill tax?". TF-IDF matches words, not
meaning, which is the main weakness; embeddings are the natural next step. A stricter score threshold removes
the unrelated-question misses but also loses real answers (measured in the sweep earlier in the project).

## 8. What could NOT be tested, and why

| Not tested | Reason |
|---|---|
| Real Supabase: emails arriving, real error wording, the dashboard's behaviour | No access to a Supabase project from this environment |
| Tokens signed with your project's real keys (the newer asymmetric scheme fetched from your project's key address) | Tests used generated keys with the same algorithms, and the shared-secret scheme end to end |
| Google sign-in | Needs your Google credentials |
| The language model's written answers | No token or credits here; only the failure and refusal paths were tested |
| Docker image, deployment | Docker and hosting were not available |
| Tablet widths | Only desktop (1440 and 1536 wide) and phone (390 wide) were tested |
| Database policies on the hosted Supabase | Tested on PostgreSQL 16 with imitated helper functions, not on Supabase itself |

## 9. Remaining limitations and incomplete work

- **User records are not stored in the database.** Only profiles exist. Saving calculations, invoices, bills and
  documents per user (with Row Level Security) is not built.
- **No admin pages or endpoints.** The role mechanism and `require_admin` exist and are tested, but nothing uses
  them yet.
- **No public pages** (landing, about, contact, privacy, terms) and no notifications or reminders.
- **No trained machine-learning model exists in this project.** The synopsis mentions ML anomaly detection; it was not built. The
  "AI" parts are TF-IDF search, rule-based extraction, OCR and a hosted language model.
- The assistant's written answers depend on Hugging Face's free monthly credits, which ran out during
  development (HTTP 402).
- Tax rules cover FY 2025-26 only; surcharge, senior-citizen slabs, capital gains and the HRA formula are not
  implemented. Rules and dates must be verified against official sources.
- The rate limiter is per process.
- Requirements pin your environment's versions; only Python 3.12 was available to test with.

## 10. Exact commands

Backend (from `backend`, Windows PowerShell):
```
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
copy .env.example .env
.\venv\Scripts\python.exe -m uvicorn main:app --reload
.\venv\Scripts\python.exe -m pytest
```
Frontend (from `frontend`):
```
copy .env.local.example .env.local
npm install
npm run dev
npm run lint
npm run build
```
Database setup: paste `database/schema.sql` into the Supabase SQL Editor. Full steps: `docs/SETUP.md`.
