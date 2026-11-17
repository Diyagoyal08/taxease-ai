"use client";

import { useRef, useState } from "react";
import { PASSWORD_RULES } from "@/lib/validation";
import { Icon } from "./Icons";

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {children}
    </header>
  );
}

// kind: "error" | "warn" | "info" | "ok"
export function Notice({ kind = "info", title, children }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label = "Working…" }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}

// tone: "neutral" | "good" | "warn" | "bad" | "info"
export function Pill({ tone = "neutral", children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Disclaimer() {
  return (
    <p className="disclaimer">
      Preliminary estimate for guidance only. Check the official Income Tax and GST portals, or ask a qualified
      professional, before you file anything.
    </p>
  );
}

export function FileDrop({ accept, multiple = false, onFiles, busy = false, title, hint }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  function pick(fileList) {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  }

  return (
    <div
      className={"drop" + (over ? " drop-over" : "")}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        pick(event.dataTransfer.files);
      }}
    >
      <Icon name="upload" size={30} />
      <p className="drop-title">{title}</p>
      <p className="muted">{hint}</p>
      <button type="button" className="btn btn-dark" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Reading…" : multiple ? "Choose files" : "Choose file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        data-testid="file-input"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete, describedBy }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-group">
        <input
          id={id}
          className="input"
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((current) => !current)}
        >
          <Icon name={shown ? "eyeOff" : "eye"} size={18} />
        </button>
      </div>
    </div>
  );
}

export function PasswordRules({ id, password }) {
  return (
    <ul className="pw-rules" id={id}>
      {PASSWORD_RULES.map((rule) => (
        <li key={rule.id} className={rule.test(password) ? "ok" : ""}>
          <Icon name="check" size={14} /> {rule.label}
        </li>
      ))}
    </ul>
  );
}
