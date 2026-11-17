"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Notice } from "@/components/ui";
import { resendVerification } from "@/lib/auth";

const COOLDOWN_SECONDS = 60;

function VerifyEmail() {
  const email = useSearchParams().get("email") || "";
  const [wait, setWait] = useState(0);
  const [message, setMessage] = useState({ kind: "", text: "" });

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setMessage({ kind: "", text: "" });
    const result = await resendVerification(email);
    if (result.error) return setMessage({ kind: "error", text: result.error });
    setMessage({ kind: "ok", text: "A new email is on its way." });
    setWait(COOLDOWN_SECONDS);
  }

  return (
    <>
      <h1>Check your email</h1>
      <p className="auth-sub">
        {email ? (
          <>
            We sent a confirmation link to <strong>{email}</strong>.
          </>
        ) : (
          "We sent you a confirmation link."
        )}{" "}
        Open it on this device to finish creating your account. The email can take a minute to arrive, and it may be in
        your spam folder.
      </p>
      {message.text ? <Notice kind={message.kind}>{message.text}</Notice> : null}
      {email ? (
        <button type="button" className="btn btn-ghost btn-block" disabled={wait > 0} onClick={resend}>
          {wait > 0 ? `Send again in ${wait}s` : "Send the email again"}
        </button>
      ) : null}
      <p className="auth-foot">
        Already confirmed? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
