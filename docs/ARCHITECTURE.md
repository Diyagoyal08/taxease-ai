# Architecture

## Parts

| Part | Technology | Responsibility |
|---|---|---|
| `frontend/` | Next.js 16, React 19 | All screens. Talks to Supabase (accounts, profile) and to the backend (everything else). Hides pages from signed-out visitors as a convenience |
| `backend/` | FastAPI | The real security boundary for tax features: checks every request's token, validates input, runs all calculations and document reading |
| Supabase Auth | hosted | Accounts, email confirmation, password reset, signed tokens |
| Supabase Postgres | hosted | `profiles` table with Row Level Security (see `DATABASE.md`) |
| Hugging Face | hosted, optional | Writes the assistant's answer from retrieved passages |

## Where the rules are enforced

| Rule | Enforced by |
|---|---|
| Only signed-in people use the tax features | `backend/auth.py`, applied to the whole app |
| Roles (user, admin) | token claim `app_metadata.role`, read by `backend/auth.py`; database policies read the same claim |
| A person sees only their own profile | database Row Level Security, not the website |
| Only the website may call the API from a browser | CORS in `backend/main.py` (`FRONTEND_ORIGIN`) |
| Uploads are real, small PDFs/PNGs/JPGs and are deleted after use | `backend/uploads.py` |
| One person cannot drain the language-model credits | `backend/ratelimit.py` (per user, in memory) |

## Backend modules

`main.py` wires routes. Each feature lives in its own module with its own tests:
`tax_engine.py` (slabs and rules in one `RULES` table), `validators.py`, `extractor.py`, `bill_reader.py`,
`ocr.py`, `invoice_checker.py`, `summary_pdf.py`, `knowledge.py` (chunking and TF-IDF search), `answerer.py`
(prompt, model call, refusal handling), `auth.py`, `uploads.py`, `ratelimit.py`.

## Frontend structure

`app/(auth)/` sign-in pages without the sidebar. `app/(app)/` protected pages with the sidebar.
`components/` (Sidebar, AuthProvider, RequireAuth, charts), `lib/api.js` (the only file that calls the backend,
adds the token, and handles an expired session), `lib/auth.js` (Supabase sign-in with readable errors),
`lib/store.js` (calculator numbers and recent activity kept in this browser only, wiped at logout).

## The assistant (RAG)

1. `data/knowledge/*.pdf` are split into overlapping chunks and indexed with TF-IDF when first needed.
2. A question retrieves the best 3 passages above a score threshold.
3. With a Hugging Face token, a language model is told to answer only from those passages, cite `[1]`, `[2]`,
   and reply `NOT_FOUND` if they do not contain the answer. Without one, or when credits run out, the passages
   are still shown.
4. The model never calculates tax. Calculations come from `tax_engine.py`.

Measured search quality on `data/eval_questions.json`: see `FINAL_PROJECT_REPORT.md`.

## Known design limits

- Tax rules cover FY 2025-26 only and live in `tax_engine.RULES`; they must be checked against the official
  sources whenever the law changes.
- The rate limiter counts per backend process.
- The TF-IDF search matches words, not meaning, so casual phrasing can miss relevant passages.
