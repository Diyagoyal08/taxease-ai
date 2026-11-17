"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice, PasswordField } from "@/components/ui";
import { resendVerification, signIn, signInWithGoogle } from "@/lib/auth";
import { googleEnabled, setRemember } from "@/lib/supabase";
import { isEmail, safeNext } from "@/lib/validation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, next, router]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!isEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");

    setBusy(true);
    setRemember(remember);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) {
      setUnconfirmed(result.unconfirmed);
      return setError(result.error);
    }
    router.replace(next);
  }

  async function resend() {
    const result = await resendVerification(email);
    if (result.error) setError(result.error);
    else setNotice("We sent a new confirmation email. Check your inbox.");
  }

  async function google() {
    setRemember(remember);
    const result = await signInWithGoogle(next);
    if (result.error) setError(result.error);
  }

  return (
    <>
      <h1>Welcome back</h1>
      <p className="auth-sub">Sign in to your TaxEase AI workspace.</p>

      {params.get("expired") ? <Notice kind="warn">Your session expired. Please sign in again.</Notice> : null}
      {notice ? <Notice kind="ok">{notice}</Notice> : null}
      {error ? (
        <Notice kind="error">
          {error}
          {unconfirmed && isEmail(email) ? (
            <>
              {" "}
              <button type="button" className="link-button" onClick={resend}>
                Send the email again
              </button>
            </>
          ) : null}
        </Notice>
      ) : null}

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />

        <div className="auth-row">
          <label className="check-label">
            <input type="checkbox" checked={remember} onChange={(event) => setRememberMe(event.target.checked)} />
            Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <p className="divider">or</p>
          <button type="button" className="btn btn-ghost btn-block" onClick={google}>
            Continue with Google
          </button>
        </>
      ) : null}

      <p className="auth-foot">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
