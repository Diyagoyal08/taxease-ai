# Database

Technology: Supabase (PostgreSQL). Setup file: `database/schema.sql` (safe to run more than once).

## Tables

### `public.profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, primary key | References `auth.users(id)`, deleted together with the user |
| `full_name` | text | Up to 100 characters |
| `created_at`, `updated_at` | timestamptz | `updated_at` is set by a trigger |

A trigger creates the profile row when someone signs up.

## Row Level Security

| Who | May |
|---|---|
| Signed-in user | read their own row; change only `full_name` on their own row |
| Administrator (`app_metadata.role = 'admin'`) | read all rows |
| Anonymous visitor | nothing |
| Anyone | insert or delete rows (only the signup trigger inserts; deletion happens when the auth user is deleted) |

Table privileges are limited as well: signed-in users have `select` and `update (full_name)` only, so they cannot
change `id` or `created_at` even though they own the row.

## Roles

Roles are stored in `auth.users.raw_app_meta_data` (`app_metadata` in the token), which users cannot edit.
To make someone an administrator, run in the Supabase SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'
where email = 'person@example.com';
```
They sign out and in again to receive a token with the new role.

## Tests

`python3 database/test_rls.py` creates a throwaway PostgreSQL database, imitates Supabase's `auth` schema, runs
`schema.sql` twice, and checks 17 rules (isolation between users, column limits, admin read, no anonymous
access, name length, signup trigger). It needs a local PostgreSQL and the `postgres` system user.

## Not built yet

User-owned records (saved calculations, invoices, bills, uploaded documents) are not stored in the database
yet. Today the tax tools work on data held in the browser for the current session. When these tables are added
they need the same pattern: a `user_id` column, Row Level Security with `user_id = auth.uid()`, and tests.
