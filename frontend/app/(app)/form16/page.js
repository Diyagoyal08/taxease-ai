"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Disclaimer, FileDrop, Notice, PageHeader, Pill, Spinner } from "@/components/ui";
import { readForm16 } from "@/lib/api";
import { toNumber } from "@/lib/format";
import { addActivity, saveTaxInput } from "@/lib/store";

const LABELS = {
  employee_name: "Employee name",
  employee_pan: "Employee PAN",
  employer_name: "Employer name",
  employer_tan: "Employer TAN",
  assessment_year: "Assessment year",
  gross_salary: "Gross salary",
  standard_deduction: "Standard deduction",
  salary_income: "Income under Salaries",
  chapter_via_deductions: "Chapter VI-A deductions",
  taxable_income: "Taxable income",
  tax_on_income: "Tax on income",
  cess: "Health and education cess",
  total_tax_payable: "Net tax payable",
  tds_deducted: "Total TDS deducted",
};

function confidenceInfo(confidence) {
  if (confidence >= 0.9) return { tone: "good", text: "Good match", color: "var(--good-deep)" };
  if (confidence > 0) return { tone: "warn", text: "Check this one", color: "var(--warn-deep)" };
  return { tone: "bad", text: "Not found, type it in", color: "var(--coral)" };
}

export default function Form16Page() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({});
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    const file = files[0];
    setError("");
    setData(null);
    setChecked(false);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setFileName(file.name);
    try {
      const answer = await readForm16(file);
      setData(answer);
      setEdits(
        Object.fromEntries(
          Object.entries(answer.fields).map(([key, field]) => [key, field.value === null ? "" : String(field.value)])
        )
      );
      addActivity(`Read Form 16: ${file.name}`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  function useInCalculator() {
    saveTaxInput(
      { gross_salary: toNumber(edits.gross_salary), tds_paid: toNumber(edits.tds_deducted) },
      "Form 16"
    );
    router.push("/tax");
  }

  return (
    <div className="page">
      <PageHeader
        title="Form 16 reader"
        subtitle="Upload a Form 16 PDF. The app reads the main numbers and you confirm them."
      />

      <FileDrop
        accept="application/pdf,.pdf"
        onFiles={handleFiles}
        busy={busy}
        title="Drop a Form 16 PDF here"
        hint="Text PDFs only for now. Scanned Form 16s need OCR. Use sample documents while testing."
      />

      {busy ? (
        <p style={{ marginTop: 20 }}>
          <Spinner label={`Reading ${fileName}…`} />
        </p>
      ) : null}

      {error ? (
        <div style={{ marginTop: 20 }}>
          <Notice kind="error" title="This file could not be read">
            {error}
          </Notice>
        </div>
      ) : null}

      {data ? (
        <section className="card" style={{ marginTop: 24 }}>
          <div className="card-head">
            <h2>What we found in {fileName}</h2>
            <Pill tone={data.warnings.length ? "warn" : "good"}>
              {data.warnings.length ? `${data.warnings.length} to check` : "No problems found"}
            </Pill>
          </div>

          {data.warnings.length > 0 ? (
            <Notice kind="warn" title="Please look at these">
              <ul>
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <div className="fields">
            {Object.entries(data.fields).map(([key, field]) => {
              const info = confidenceInfo(field.confidence);
              return (
                <div className="field-row" key={key}>
                  <label htmlFor={`f16-${key}`}>{LABELS[key] || key}</label>
                  <input
                    id={`f16-${key}`}
                    className="input"
                    value={edits[key] ?? ""}
                    onChange={(event) => setEdits((current) => ({ ...current, [key]: event.target.value }))}
                  />
                  <div className="conf">
                    <div className="meter" aria-hidden="true">
                      <span style={{ width: `${Math.round(field.confidence * 100)}%`, background: info.color }} />
                    </div>
                    <span>
                      {info.text}
                      {field.confidence > 0 ? ` (${Math.round(field.confidence * 100)}%)` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="confirm">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>I checked these values against my Form 16.</span>
          </label>
          <div className="btn-row">
            <button type="button" className="btn btn-dark" disabled={!checked} onClick={useInCalculator}>
              Use gross salary and TDS in the tax calculator
            </button>
          </div>
          <p className="help" style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
            {data.note} The file is read by your own backend and deleted right after.
          </p>
        </section>
      ) : null}
      <Disclaimer />
    </div>
  );
}
