"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth";
import { isEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!isEmail(email)) return setError("Enter a valid email address.");
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.error) return setError(result.error);
    setSent(true);
  }

  return (
    <>
      <h1>Reset your password</h1>
      <p className="auth-sub">Enter your email and we will send you a link to choose a new password.</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {sent ? (
        // The same message whether or not the email has an account, so nobody can use this form to find out who is registered.
        <Notice kind="ok">
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Open it on this device.
        </Notice>
      ) : (
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
          <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="auth-foot">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
