"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice, PasswordField, PasswordRules, Spinner } from "@/components/ui";
import { changePassword } from "@/lib/auth";
import { passwordIsValid } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!passwordIsValid(password)) return setError("Your password does not meet all the rules below.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const result = await changePassword(password);
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
    setTimeout(() => router.replace("/"), 1500);
  }

  // The reset link signs the person in for a moment. Without it there is nothing to reset.
  if (loading) return <Spinner label="Checking your link…" />;
  if (!session) {
    return (
      <>
        <h1>This link no longer works</h1>
        <Notice kind="error">The reset link is not valid, has expired, or was opened in a different browser.</Notice>
        <Link href="/forgot-password" className="btn btn-dark btn-block">
          Get a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Choose a new password</h1>
      <p className="auth-sub">Pick something you do not use anywhere else.</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? (
        <Notice kind="ok">Your password was updated. Taking you to your workspace…</Notice>
      ) : (
        <form onSubmit={submit} noValidate>
          <PasswordField id="password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="password-rules" />
          <PasswordRules id="password-rules" password={password} />
          <PasswordField id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </>
  );
}
