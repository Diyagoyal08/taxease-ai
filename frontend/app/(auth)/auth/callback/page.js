"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice, Spinner } from "@/components/ui";
import { safeNext } from "@/lib/validation";

// Email links and Google sign-in come back here. Supabase finishes the sign-in while the app loads.
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const { loading, session } = useAuth();
  const next = safeNext(params.get("next"));
  const providerError = params.get("error_description");

  useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, next, router]);

  if (!providerError && (loading || session)) return <Spinner label="Signing you in…" />;

  return (
    <>
      <h1>We could not sign you in</h1>
      <Notice kind="error">
        {providerError || "This link is not valid, has expired, or was opened in a different browser than the one you signed up in."}
      </Notice>
      <p className="auth-sub">If your email is already confirmed, you can sign in with your password.</p>
      <Link href="/login" className="btn btn-dark btn-block">
        Go to sign in
      </Link>
    </>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
