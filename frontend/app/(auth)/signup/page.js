"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, PasswordField, PasswordRules } from "@/components/ui";
import { signUp } from "@/lib/auth";
import { isEmail, passwordIsValid } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.fullName.trim()) return setError("Enter your name.");
    if (!isEmail(form.email)) return setError("Enter a valid email address.");
    if (!passwordIsValid(form.password)) return setError("Your password does not meet all the rules below.");
    if (form.password !== form.confirm) return setError("The two passwords do not match.");

    setBusy(true);
    const result = await signUp(form);
    setBusy(false);
    if (result.error) return setError(result.error);
    router.replace(result.signedIn ? "/" : `/verify-email?email=${encodeURIComponent(form.email.trim())}`);
  }

  return (
    <>
      <h1>Create your account</h1>
      <p className="auth-sub">Free to use. We will email you a link to confirm your address.</p>
      {error ? <Notice kind="error">{error}</Notice> : null}

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            maxLength={100}
            value={form.fullName}
            onChange={(event) => set("fullName")(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => set("email")(event.target.value)}
          />
        </div>
        <PasswordField
          id="password"
          label="Password"
          value={form.password}
          onChange={set("password")}
          autoComplete="new-password"
          describedBy="password-rules"
        />
        <PasswordRules id="password-rules" password={form.password} />
        <PasswordField id="confirm" label="Confirm password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />

        <button type="submit" className="btn btn-dark btn-block" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-foot">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
