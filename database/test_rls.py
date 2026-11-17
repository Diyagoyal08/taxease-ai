"""Tests the security rules in schema.sql against a real PostgreSQL.

Supabase's own objects (the auth schema, auth.uid(), auth.jwt(), the anon and authenticated
roles) are recreated here as small stand-ins that behave the same way, so the real schema.sql
runs unchanged. Run:  python3 test_rls.py   (needs a local PostgreSQL and the postgres user)
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
DB = "taxease_rls_test"
A, B, ADMIN = (
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
)


def psql(sql, db=DB, check=True):
    done = subprocess.run(
        ["su", "postgres", "-c", f"psql -X -q -At -v ON_ERROR_STOP=1 -d {db}"],
        input=sql, capture_output=True, text=True,
    )
    if check and done.returncode != 0:
        raise RuntimeError(done.stderr.strip())
    return done


def as_user(sub, role="user", pg_role="authenticated"):
    claims = json.dumps({"sub": sub, "app_metadata": {"role": role}})
    return f"begin; set local role {pg_role}; select set_config('request.jwt.claims', '{claims}', true);"


def run(sql):
    """Run SQL; return (ok, last output line or error text). Always rolls back."""
    done = psql(sql + "\nrollback;", check=False)
    if done.returncode != 0:
        return False, done.stderr.strip().splitlines()[-1] if done.stderr.strip() else "error"
    lines = [line for line in done.stdout.strip().splitlines() if line and line not in ("BEGIN", "ROLLBACK")]
    return True, (lines[-1] if lines else "")


results = []


def check(name, condition, detail=""):
    results.append(condition)
    print(("PASS " if condition else "FAIL ") + name + (f"   [{detail}]" if detail and not condition else ""))


# ---- build the database -------------------------------------------------------------
subprocess.run(["su", "postgres", "-c", f"dropdb --if-exists {DB} && createdb {DB}"], check=True)
psql("""
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create function auth.uid() returns uuid language sql stable as
  $f$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub' $f$::text::uuid;
""".replace("$f$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub' $f$::text::uuid",
            "$f$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $f$") + """
create function auth.jwt() returns jsonb language sql stable as
  $f$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $f$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
grant usage on schema public to anon, authenticated;
""")
psql((HERE / "schema.sql").read_text())
psql((HERE / "schema.sql").read_text())  # running it twice must be harmless
check("schema.sql runs twice without errors", True)

psql(f"""
insert into auth.users (id, email, raw_user_meta_data) values
  ('{A}', 'a@example.com', '{{"full_name": "Asha"}}'),
  ('{B}', 'b@example.com', '{{"full_name": "Bala"}}'),
  ('{ADMIN}', 'admin@example.com', '{{}}');
""")

# ---- the tests -----------------------------------------------------------------------
ok, out = run("select count(*) from public.profiles;")
check("signup trigger created a profile for every user", out == "3", out)

ok, out = run(as_user(A) + "select count(*) from public.profiles;")
check("user A sees only their own profile", out == "1", out)

ok, out = run(as_user(A) + f"select count(*) from public.profiles where id = '{B}';")
check("user A cannot see user B's profile", out == "0", out)

ok, out = run(as_user(A) + f"update public.profiles set full_name = 'Asha K' where id = '{A}'; select full_name from public.profiles;")
check("user A can change their own name", ok and out == "Asha K", out)

ok, out = run(as_user(A) + f"with u as (update public.profiles set full_name = 'hacked' where id = '{B}' returning 1) select count(*) from u;")
check("user A cannot change user B's name", ok and out == "0", out)

ok, out = run(as_user(A) + f"update public.profiles set id = '{B}' where id = '{A}';")
check("user cannot change a profile id", not ok, out)

ok, out = run(as_user(A) + f"update public.profiles set created_at = now() where id = '{A}';")
check("user cannot change created_at", not ok, out)

ok, out = run(as_user(A) + f"insert into public.profiles (id, full_name) values (gen_random_uuid(), 'fake');")
check("user cannot insert profiles", not ok, out)

ok, out = run(as_user(A) + f"delete from public.profiles where id = '{A}';")
check("user cannot delete profiles", not ok, out)

ok, out = run(as_user(A) + "update public.profiles set full_name = repeat('x', 101);")
check("a name over 100 characters is rejected", not ok, out)

ok, out = run(as_user(A, role="admin") + "select count(*) from public.profiles;")
check("a token claiming admin in app_metadata sees all profiles (the backend must only issue it to real admins)", out == "3", out)

ok, out = run(as_user(A, role="user") + "select count(*) from public.profiles;")
check("a normal role claim does not unlock other profiles", out == "1", out)

ok, out = run(as_user(A, pg_role="anon") + "select count(*) from public.profiles;")
check("anonymous visitors cannot read profiles", not ok, out)

ok, out = run(as_user(A) + "select count(*) from auth.users;")
check("signed-in users cannot read auth.users", not ok, out)

ok, out = run(as_user(ADMIN, role="admin") + f"update public.profiles set full_name = 'x' where id = '{A}'; select count(*) from public.profiles where full_name = 'x';")
check("admins can read all profiles but not edit other people's", ok and out == "0", out)

ok, out = run(f"update public.profiles set full_name = 'p' where id = '{A}'; select updated_at > created_at from public.profiles where id = '{A}';")
check("updated_at moves forward on change", out == "t", out)

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
