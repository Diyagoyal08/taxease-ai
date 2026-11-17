"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { SetupNotice } from "./AuthLayout";
import { Spinner } from "./ui";

// Keeps signed-out people out of the app's pages. This only improves the experience:
// the real protection is the backend (auth.py) and the database rules, which check every request.
export default function RequireAuth({ role, children }) {
  const { configured, loading, session, role: userRole, signOutReason } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = !role || userRole === role;

  useEffect(() => {
    if (!configured || loading) return;
    if (!session) {
      const reason = signOutReason();
      router.replace(reason === "expired" ? "/login?expired=1" : reason ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    }
    else if (!allowed) router.replace("/unauthorized");
  }, [configured, loading, session, allowed, pathname, router, signOutReason]);

  if (!configured) return <SetupNotice />;
  if (loading || !session || !allowed) {
    return (
      <div className="auth-wrap">
        <Spinner label="Checking your sign-in…" />
      </div>
    );
  }
  return children;
}
