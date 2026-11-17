# TaxEase AI: web app

The browser side of TaxEase AI. It talks to your FastAPI backend and has seven pages:

| Page | Address | What it does | Backend endpoint |
|---|---|---|---|
| Dashboard | `/` | Deadlines, charts, recent activity | `GET /deadlines` |
| Tax calculator | `/tax` | Old vs new regime, summary PDF | `POST /tax/calculate`, `POST /summary/tax-pdf` |
| Form 16 reader | `/form16` | Reads a Form 16 PDF, you confirm the fields | `POST /documents/form16` |
| Bills | `/bills` | Reads bills (text, scans, photos), totals per deduction | `POST /documents/bills` |
| GST invoices | `/gst` | Checks invoices for errors and duplicates | `POST /gst/validate` |
| PAN and GSTIN | `/check` | Checks number format and check character | `POST /validate/pan`, `POST /validate/gstin` |
| Assistant | `/chat` | Answers from official documents, with sources | `POST /chat` |

## Sign-in

Pages other than the sign-in screens need a login. Supabase Auth handles accounts and email. The browser
sends the login token to the backend, which checks it on every request. Full steps: `../docs/SETUP.md`.

| Page | Address |
|---|---|
| Login, Sign up | `/login`, `/signup` |
| Verify email, Email link landing | `/verify-email`, `/auth/callback` |
| Forgot and reset password | `/forgot-password`, `/reset-password` |
| Profile (name, password, sign out) | `/profile` |
| No access | `/unauthorized` |

## Run it

You need Node.js 20.9 or newer. In the `frontend` folder:

```
copy .env.local.example .env.local     (then fill in the Supabase values)
npm install
npm run dev
```

Open http://localhost:3000. Keep the backend running in another terminal. The sidebar shows
"Backend connected" when the two can talk.

## Where things are

```
app/(auth)/     sign-in pages (no sidebar)
app/(app)/      the protected pages: dashboard, calculator, documents, GST, assistant, profile
components/     Sidebar, AuthProvider, RequireAuth, charts, icons, shared parts
lib/api.js      the only file that calls the backend (adds the login token)
lib/auth.js     Supabase sign-in functions with readable errors
lib/supabase.js the Supabase client (public key only)
lib/store.js    what the browser remembers: calculator numbers and recent activity (wiped on logout)
```

Colours and font: variables at the top of `app/globals.css` (near-black `#1A1A1A`, purple `#723FEB`,
sky blue `#97E0F7`, white `#FCFCFC`, Manrope). Check the code with `npm run lint` and `npm run build`.

## Problems

| What you see | What to do |
|---|---|
| "Backend not running" in the sidebar | Start the backend, then wait a few seconds |
| "Sign-in is not set up yet" | Fill in `.env.local` and restart `npm run dev` |
| `npm install` fails | Check `node --version` (needs 20.9 or newer) |
