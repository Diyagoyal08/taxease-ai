"use client";

import { useState } from "react";
import { Notice, PageHeader, Pill } from "@/components/ui";
import { checkGstin, checkPan } from "@/lib/api";
import { addActivity } from "@/lib/store";

function CheckCard({ title, description, example, placeholder, run, details }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Type a number to check.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const answer = await run(value);
      setResult(answer);
      addActivity(`Checked a ${title}: ${answer.valid ? "valid" : "not valid"}`);
    } catch (problem) {
      setResult(null);
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  const inputId = `check-${title.replace(/\s/g, "")}`;

  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="muted" style={{ marginTop: 4 }}>
        {description}
      </p>
      <form className="check-form" onSubmit={submit}>
        <label className="sr-only" htmlFor={inputId}>
          {title}
        </label>
        <input
          id={inputId}
          className="input mono"
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          spellCheck="false"
          onChange={(event) => setValue(event.target.value.toUpperCase())}
        />
        <button type="submit" className="btn btn-dark" disabled={busy}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
      <button type="button" className="link-button" style={{ marginTop: 10 }} onClick={() => setValue(example)}>
        Use an example format
      </button>

      {error ? (
        <div style={{ marginTop: 16 }}>
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}

      {result ? (
        <div className={"result-box " + (result.valid ? "good" : "bad")} aria-live="polite" data-testid={`result-${title.replace(/\s/g, "")}`}>
          <Pill tone={result.valid ? "good" : "bad"}>{result.valid ? "Looks valid" : "Not valid"}</Pill>
          {result.valid ? (
            <dl>{details(result)}</dl>
          ) : (
            <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
              {result.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function CheckPage() {
  return (
    <div className="page">
      <PageHeader
        title="PAN and GSTIN checker"
        subtitle="Check that a number is written correctly. This tests the format and the check character, not whether the number is registered."
      />
      <div className="check-grid">
        <CheckCard
          title="PAN"
          description="Ten characters: five letters, four digits, one letter."
          placeholder="ABCPE1234F"
          example="ABCPE1234F"
          run={checkPan}
          details={(result) => (
            <div className="kv">
              <dt>Holder type</dt>
              <dd>{result.holder_type}</dd>
            </div>
          )}
        />
        <CheckCard
          title="GSTIN"
          description="Fifteen characters: state code, the PAN, an entity number, the letter Z and a check character."
          placeholder="27AAPFU0939F1ZV"
          example="27AAPFU0939F1ZV"
          run={checkGstin}
          details={(result) => (
            <>
              <div className="kv">
                <dt>State code</dt>
                <dd>{result.state_code}</dd>
              </div>
              <div className="kv">
                <dt>PAN inside</dt>
                <dd className="mono">{result.pan}</dd>
              </div>
            </>
          )}
        />
      </div>
      <p className="disclaimer">
        Never type real people&apos;s PAN or GSTIN while you are testing. Use example numbers.
      </p>
    </div>
  );
}
