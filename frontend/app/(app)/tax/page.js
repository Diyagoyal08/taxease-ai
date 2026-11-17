"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { Disclaimer, Notice, PageHeader, Pill, Spinner } from "@/components/ui";
import { calculateTax, downloadTaxPdf } from "@/lib/api";
import { rupees, toNumber } from "@/lib/format";
import { addActivity, clearTaxInput, saveTaxInput, useTaxInput } from "@/lib/store";

const FIELDS = [
  { key: "gross_salary", label: "Gross salary for the year", help: "Total salary before any deduction. It is on your Form 16." },
  { key: "other_income", label: "Other income", help: "Bank interest, rent received and similar." },
  { key: "hra_exemption", label: "HRA exemption (old regime)", help: "The exempt part of your house rent allowance, not the rent you paid." },
  { key: "deduction_80c", label: "80C investments (old regime)", help: "PPF, ELSS, LIC premium, EPF. The calculator applies the yearly limit." },
  { key: "nps_80ccd_1b", label: "Extra NPS contribution (old regime)", help: "The calculator applies the yearly limit." },
  { key: "deduction_80d", label: "Health insurance premium (old regime)", help: "The calculator applies the yearly limit." },
  { key: "home_loan_interest", label: "Home loan interest (old regime)", help: "The calculator applies the yearly limit." },
  { key: "tds_paid", label: "Tax already deducted (TDS)", help: "Total TDS shown on your Form 16 or Form 26AS." },
];

const EMPTY = Object.fromEntries(FIELDS.map((field) => [field.key, ""]));

function RegimeCard({ title, regime, best }) {
  const rows = [
    ["Taxable income", rupees(regime.taxable_income)],
    ["Tax on slabs", rupees(regime.tax_on_slabs)],
    ["Rebate (87A)", rupees(regime.rebate)],
  ];
  if (regime.marginal_relief > 0) rows.push(["Marginal relief", rupees(regime.marginal_relief)]);
  rows.push(["Cess (4%)", rupees(regime.cess)]);
  rows.push(["TDS already paid", rupees(regime.tds_paid)]);
  rows.push([regime.net_payable_or_refund < 0 ? "Refund due" : "Still to pay", rupees(Math.abs(regime.net_payable_or_refund))]);

  return (
    <article className={"regime" + (best ? " best" : "")} data-testid={`regime-${regime.regime}`}>
      <div className="regime-head">
        <span>{title}</span>
        {best ? <Pill tone="good">Lower tax</Pill> : null}
      </div>
      <p className="regime-total">{rupees(regime.total_tax)}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div className="kv" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details style={{ marginTop: 12 }}>
        <summary>How this was worked out</summary>
        <ol className="steps">
          {regime.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export default function TaxPage() {
  const saved = useTaxInput();
  const [typed, setTyped] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  // what the person typed wins over what was saved from Form 16 or bills
  const values = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) {
    if (saved.values[key]) values[key] = String(saved.values[key]);
  }
  Object.assign(values, typed);
  const sources = saved.sources;

  function update(key, text) {
    setTyped((current) => ({ ...current, [key]: text }));
  }

  function payload() {
    return Object.fromEntries(FIELDS.map((field) => [field.key, toNumber(values[field.key])]));
  }

  async function calculate(event) {
    event.preventDefault();
    setError("");
    const data = payload();
    if (data.gross_salary <= 0) {
      setError("Enter your gross salary to calculate.");
      return;
    }
    setBusy("calculate");
    try {
      const answer = await calculateTax(data);
      setResult(answer);
      saveTaxInput(data);
      const best = answer.recommended === "new" ? answer.new_regime : answer.old_regime;
      addActivity(`Calculated tax: ${answer.recommended} regime, ${rupees(best.total_tax)}`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy("");
    }
  }

  async function downloadPdf() {
    setError("");
    setBusy("pdf");
    try {
      const blob = await downloadTaxPdf(payload());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tax_summary.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addActivity("Downloaded the tax summary PDF");
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy("");
    }
  }

  function startOver() {
    clearTaxInput();
    setTyped({});
    setResult(null);
    setError("");
  }

  const best = result ? (result.recommended === "new" ? result.new_regime : result.old_regime) : null;

  return (
    <div className="page">
      <PageHeader
        title="Tax calculator"
        subtitle="Compare the old and new tax regimes and see which one costs you less."
      />

      <div className="split">
        <form className="card" onSubmit={calculate} noValidate>
          <div className="card-head">
            <h2>Your numbers</h2>
            <button type="button" className="link-button" onClick={startOver}>
              Start over
            </button>
          </div>

          {sources.length > 0 ? (
            <Notice kind="info" title={`Filled in from your ${sources.join(" and ")}`}>
              Please check every number before you rely on it.
            </Notice>
          ) : null}

          {FIELDS.map((field) => (
            <div className="field" key={field.key}>
              <label htmlFor={field.key}>{field.label}</label>
              <input
                id={field.key}
                className="input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={values[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
              />
              <p className="help">{field.help}</p>
            </div>
          ))}

          <div className="btn-row" style={{ marginTop: 24 }}>
            <button type="submit" className="btn btn-dark" disabled={busy !== ""}>
              {busy === "calculate" ? "Calculating…" : "Calculate tax"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={downloadPdf} disabled={busy !== ""}>
              <Icon name="download" size={18} />
              {busy === "pdf" ? "Preparing…" : "Download summary PDF"}
            </button>
          </div>
          <p className="help" style={{ marginTop: 12 }}>
            Your numbers stay in this browser. Only the calculation request goes to your own backend.
          </p>
        </form>

        <div>
          {error ? (
            <Notice kind="error" title="That did not work">
              {error}
            </Notice>
          ) : null}
          {busy === "calculate" ? <Spinner label="Calculating both regimes…" /> : null}

          {!result && busy === "" ? (
            <div className="card empty">
              <p>Enter your salary and press <strong>Calculate tax</strong>. Both regimes appear here side by side.</p>
            </div>
          ) : null}

          {result ? (
            <>
              <section className="recommend" aria-live="polite" data-testid="recommendation">
                <h2>
                  {result.savings === 0
                    ? "Both regimes give the same tax"
                    : `The ${result.recommended} regime costs you ${rupees(result.savings)} less`}
                </h2>
                <p>
                  {rupees(best.total_tax)} is your total tax including cess, using {result.rules_year} rules.
                </p>
              </section>
              <div className="regimes">
                <RegimeCard title="New regime" regime={result.new_regime} best={result.recommended === "new"} />
                <RegimeCard title="Old regime" regime={result.old_regime} best={result.recommended === "old"} />
              </div>
              <p className="disclaimer">{result.disclaimer}</p>
            </>
          ) : null}
          {!result ? <Disclaimer /> : null}
        </div>
      </div>
    </div>
  );
}
