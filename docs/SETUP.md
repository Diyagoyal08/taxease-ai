# Setting up sign-in and the database (Supabase)

How sign-in works: people sign up and log in with **Supabase Auth**, which gives the browser a signed token.
The website sends the token with every request to the backend, and the backend (`backend/auth.py`) checks it
before doing anything. The database has its own rules (Row Level Security). Hiding pages in the website is only
a convenience: the real checks are in the backend and the database.

## 1. Create the Supabase project (10 minutes)

1. Create a free account at supabase.com and click **New project**. Choose a name, a strong database password
   (keep it in a password manager; you will not need it here) and a region near you.
2. Open **Project Settings > API**. Copy the **Project URL** and the **anon / publishable key**. These two are
   safe in the website. Never use the `service_role` or secret key in the website or in Git.

## 2. Create the tables and rules

Open **SQL Editor > New query**, paste all of `database/schema.sql`, and press **Run**. It is safe to run again.

## 3. Switch on email sign-in

In the Supabase dashboard open **Authentication** and check:

- The **Email** provider is on and **Confirm email** is **on** (this is what makes people verify their address).
- **URL Configuration > Site URL** is `http://localhost:3000`.
- **Redirect URLs** include `http://localhost:3000/auth/callback` and `http://localhost:3000/reset-password`.
  When you deploy, add the same two paths on your real address.
- Minimum password length is **8**. The website also asks for a lowercase letter, an uppercase letter and a number
  (`frontend/lib/validation.js`). If you set stricter rules in Supabase, make the website rules match.

Supabase's built-in email sender is for testing only and allows very few emails per hour. For real use add your own
email service under **Authentication > SMTP Settings**.

## 4. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set `SUPABASE_URL` to your Project URL. Set
`SUPABASE_JWT_SECRET` only if your project still signs tokens with the shared secret (Project Settings > JWT shows
which you have). Set `FRONTEND_ORIGIN` to the website address. The backend is already wired to check tokens.

## 5. Configure the website

Copy `frontend/.env.local.example` to `frontend/.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. If you forget, every page shows "Sign-in is not set up yet" instead of breaking.

## 6. Make yourself an administrator

After you have signed up and confirmed your email, run this in the SQL Editor (use your email):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'
where email = 'you@example.com';
```
Sign out and in again. The Profile page then shows "Administrator". There are no admin-only pages yet; the backend
already has `require_admin` ready for them.

## 7. Google sign-in (optional, not tested)

1. In Google Cloud Console create an OAuth client (type: Web application) with the authorised redirect URI
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
2. In Supabase open **Authentication > Providers > Google**, switch it on, paste the client ID and secret.
3. Set `NEXT_PUBLIC_ENABLE_GOOGLE=true` in `frontend/.env.local` and restart `npm run dev`.

## 8. Your first run

Terminal 1, from `backend`: `.\venv\Scripts\python.exe -m uvicorn main:app --reload`
Terminal 2, from `frontend`: `npm run dev`
Open http://localhost:3000, create an account, open the confirmation email in the same browser, and sign in.

Please test once: sign up, confirm by email, log in, log out, reset a password, change your name, and open the
website while the backend is stopped. These need your real Supabase project and could not be tested while this
project was assembled.

## Troubleshooting

| What you see | What to do |
|---|---|
| "Sign-in is not set up yet" | Fill in `frontend/.env.local`, restart `npm run dev` |
| Confirmation email never arrives | Check spam; wait; or add SMTP (see section 3) |
| The email link says it is not valid | Open it in the same browser you signed up in, within an hour, or request a new one |
| Every page says "Your session expired" | `SUPABASE_URL` in `backend/.env` must equal the website's Supabase URL, then restart the backend |
| 503 "Sign-in is not configured on the server" | `backend/.env` has no `SUPABASE_URL` |
| CORS error in the browser console | `FRONTEND_ORIGIN` must equal the website address exactly (no trailing slash) |
| Profile page cannot load | Run `database/schema.sql` in the SQL Editor |
