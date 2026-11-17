"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice, PageHeader, PasswordField, PasswordRules, Pill } from "@/components/ui";
import { changePassword, friendlyAuthError } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import { passwordIsValid } from "@/lib/validation";

export default function ProfilePage() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const [savedName, setSavedName] = useState(null);
  const [typedName, setTypedName] = useState(null);
  const [nameMessage, setNameMessage] = useState({ kind: "", text: "" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState({ kind: "", text: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    getSupabase()
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNameMessage({ kind: "error", text: "Could not load your profile. Try refreshing the page." });
        else setSavedName(data?.full_name ?? "");
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  const name = typedName ?? savedName ?? "";

  async function saveName(event) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return setNameMessage({ kind: "error", text: "Your name cannot be empty." });
    setBusy("name");
    const supabase = getSupabase();
    const { error } = await supabase.from("profiles").update({ full_name: clean }).eq("id", user.id);
    if (!error) await supabase.auth.updateUser({ data: { full_name: clean } });
    setBusy("");
    if (error) return setNameMessage({ kind: "error", text: friendlyAuthError(error) });
    setSavedName(clean);
    setTypedName(null);
    setNameMessage({ kind: "ok", text: "Your name was updated." });
  }

  async function savePassword(event) {
    event.preventDefault();
    if (!passwordIsValid(password)) return setPasswordMessage({ kind: "error", text: "Your password does not meet all the rules below." });
    if (password !== confirm) return setPasswordMessage({ kind: "error", text: "The two passwords do not match." });
    setBusy("password");
    const result = await changePassword(password);
    setBusy("");
    if (result.error) return setPasswordMessage({ kind: "error", text: result.error });
    setPassword("");
    setConfirm("");
    setPasswordMessage({ kind: "ok", text: "Your password was updated." });
  }

  async function leave(scope) {
    await signOut(scope);
    router.replace("/login");
  }

  return (
    <div className="page">
      <PageHeader title="Profile" subtitle="Your account details and sign-in settings." />

      <div className="check-grid">
        <section className="card">
          <h2>Account</h2>
          <dl style={{ margin: "16px 0 0" }}>
            <div className="kv">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="kv">
              <dt>Role</dt>
              <dd>
                <Pill tone={role === "admin" ? "info" : "neutral"}>{role === "admin" ? "Administrator" : "Taxpayer"}</Pill>
              </dd>
            </div>
            <div className="kv">
              <dt>Member since</dt>
              <dd>{formatDate(user.created_at?.slice(0, 10))}</dd>
            </div>
          </dl>

          <form onSubmit={saveName} noValidate style={{ marginTop: 22 }}>
            {nameMessage.text ? <Notice kind={nameMessage.kind}>{nameMessage.text}</Notice> : null}
            <div className="field">
              <label htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                className="input"
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(event) => setTypedName(event.target.value)}
              />
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn-dark" disabled={busy !== "" || savedName === null}>
                {busy === "name" ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Change password</h2>
          <form onSubmit={savePassword} noValidate style={{ marginTop: 16 }}>
            {passwordMessage.text ? <Notice kind={passwordMessage.kind}>{passwordMessage.text}</Notice> : null}
            <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="profile-rules" />
            <PasswordRules id="profile-rules" password={password} />
            <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn-dark" disabled={busy !== ""}>
                {busy === "password" ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>

          <h2 style={{ marginTop: 32 }}>Sessions</h2>
          <p className="muted" style={{ margin: "4px 0 14px" }}>
            Signed in somewhere you do not trust? Sign out everywhere.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => leave("local")}>
              Sign out here
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => leave("global")}>
              Sign out everywhere
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
