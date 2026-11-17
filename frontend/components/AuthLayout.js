"use client";

import { useAuth } from "./AuthProvider";

export function Brand() {
  return (
    <div className="auth-brand">
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="9" fill="var(--ink)" />
        <path d="M9.5 17l4.5 4.5L22.5 11" fill="none" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>TaxEase AI</span>
    </div>
  );
}

export function SetupNotice() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Sign-in is not set up yet</h1>
        <p className="auth-sub">
          This app needs your Supabase project details. Copy <code>.env.local.example</code> to{" "}
          <code>.env.local</code>, fill in <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>. The steps are in{" "}
          <code>docs/SETUP.md</code>.
        </p>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }) {
  const { configured } = useAuth();
  if (!configured) return <SetupNotice />;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        {children}
      </div>
    </div>
  );
}
