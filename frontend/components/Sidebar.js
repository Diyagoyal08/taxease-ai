"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { ping } from "@/lib/api";
import { useAuth } from "./AuthProvider";

const NAV = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/tax", label: "Tax calculator", icon: "calculator" },
  { href: "/form16", label: "Form 16 reader", icon: "document" },
  { href: "/bills", label: "Bills", icon: "receipt" },
  { href: "/gst", label: "GST invoices", icon: "invoice" },
  { href: "/check", label: "PAN and GSTIN", icon: "shield" },
  { href: "/chat", label: "Assistant", icon: "chat" },
  { href: "/profile", label: "Profile", icon: "user" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await ping();
        if (!cancelled) setStatus("online");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }
    check();
    const timer = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email || "Signed in";

  async function logOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="TaxEase AI home">
        <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 17l4.5 4.5L22.5 11" fill="none" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>TaxEase AI</span>
      </Link>

      <div className="profile">
        <div className="avatar" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <p className="profile-small">Welcome back,</p>
        <p className="profile-name">{displayName}</p>
      </div>

      <nav aria-label="Main">
        <ul className="nav">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-foot">
        <p className={`status status-${status}`} role="status" data-testid="backend-status">
          <span className="dot" aria-hidden="true" />
          {status === "online" ? "Backend connected" : status === "offline" ? "Backend not running" : "Checking backend…"}
        </p>
        <button type="button" className="logout" onClick={logOut}>
          <Icon name="logout" size={18} />
          Log out
        </button>
        <p className="foot-note">Estimates only. Check official sources before you file.</p>
      </div>
    </aside>
  );
}
