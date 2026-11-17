"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { Disclaimer, Notice, PageHeader, Pill, Spinner } from "@/components/ui";
import { checkInvoices } from "@/lib/api";
import { rupees, toNumber } from "@/lib/format";
import { addActivity } from "@/lib/store";

const COLUMNS = [
  { key: "invoice_no", label: "Invoice no.", cls: "w-no", type: "text" },
  { key: "invoice_date", label: "Date", cls: "w-date", type: "date" },
  { key: "supplier_gstin", label: "Supplier GSTIN", cls: "w-gstin", type: "text" },
  { key: "buyer_gstin", label: "Buyer GSTIN (optional)", cls: "w-gstin", type: "text" },
  { key: "place_of_supply", label: "Place of supply (state code)", cls: "w-pos", type: "text" },
  { key: "taxable_value", label: "Taxable value", cls: "w-num", type: "text" },
  { key: "gst_rate", label: "Rate %", cls: "w-num", type: "text" },
  { key: "cgst", label: "CGST", cls: "w-num", type: "text" },
  { key: "sgst", label: "SGST", cls: "w-num", type: "text" },
  { key: "igst", label: "IGST", cls: "w-num", type: "text" },
  { key: "total", label: "Total", cls: "w-num", type: "text" },
];

const SAMPLE = [
  ["INV-001", "2026-10-05", "27AAPFU0939F1ZV", "", "27", "10000", "18", "900", "900", "0", "11800"],
  ["INV-002", "2026-10-06", "27AAPFU0939F1ZV", "", "08", "10000", "18", "0", "0", "1800", "11800"],
  ["INV-001", "2026-10-05", "27AAPFU0939F1ZV", "", "27", "10000", "18", "900", "900", "0", "11800"],
  ["INV-004", "2026-10-07", "27AAPFU0939F1ZV", "", "27", "10000", "18", "800", "800", "0", "11600"],
];

let counter = 0;

function emptyRow() {
  return { id: `row-${counter++}`, ...Object.fromEntries(COLUMNS.map((column) => [column.key, ""])) };
}

function sampleRows() {
  return SAMPLE.map((values) => ({
    id: `row-${counter++}`,
    ...Object.fromEntries(COLUMNS.map((column, index) => [column.key, values[index]])),
  }));
}

function toInvoice(row) {
  const clean = (text) => String(text).trim();
  return {
    invoice_no: clean(row.invoice_no),
    invoice_date: clean(row.invoice_date),
    supplier_gstin: clean(row.supplier_gstin).toUpperCase(),
    buyer_gstin: clean(row.buyer_gstin) ? clean(row.buyer_gstin).toUpperCase() : null,
    place_of_supply: clean(row.place_of_supply) || null,
    taxable_value: toNumber(row.taxable_value),
    gst_rate: toNumber(row.gst_rate),
    cgst: toNumber(row.cgst),
    sgst: toNumber(row.sgst),
    igst: toNumber(row.igst),
    total: toNumber(row.total),
  };
}

export default function GstPage() {
  const [rows, setRows] = useState(() => [emptyRow()]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(id, key, value) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  async function check() {
    setError("");
    setReport(null);
    setBusy(true);
    try {
      const answer = await checkInvoices(rows.map(toInvoice));
      setReport(answer);
      addActivity(`Checked ${answer.summary.invoices} invoice${answer.summary.invoices === 1 ? "" : "s"}: ${answer.summary.with_errors} with errors`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  const resultOf = (index) => (report ? report.results.find((result) => result.position === index + 1) : null);

  return (
    <div className="page">
      <PageHeader
        title="GST invoice checker"
        subtitle="Enter your invoices and the checker flags wrong tax, wrong GSTINs and duplicates."
      />

      <section className="card">
        <div className="card-head">
          <h2>Invoices</h2>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => { setRows(sampleRows()); setReport(null); }}>
              Load sample invoices
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setRows((current) => [...current, emptyRow()])}>
              <Icon name="plus" size={16} /> Add invoice
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="inv">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
                <th scope="col">Result</th>
                <th scope="col">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const result = resultOf(index);
                return (
                  <tr key={row.id} className={result && !result.ok ? "has-error" : ""}>
                    {COLUMNS.map((column) => (
                      <td key={column.key}>
                        <input
                          className={`input input-sm ${column.cls}`}
                          type={column.type}
                          inputMode={column.type === "text" && column.cls === "w-num" ? "decimal" : undefined}
                          aria-label={`${column.label}, invoice ${index + 1}`}
                          value={row[column.key]}
                          onChange={(event) => change(row.id, column.key, event.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      {result ? (
                        <Pill tone={result.ok ? "good" : "bad"}>{result.ok ? "OK" : "Errors"}</Pill>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        aria-label={`Remove invoice ${index + 1}`}
                        disabled={rows.length === 1}
                        onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-dark" onClick={check} disabled={busy}>
            {busy ? "Checking…" : "Check invoices"}
          </button>
          {busy ? <Spinner label="Checking…" /> : null}
        </div>
      </section>

      {error ? (
        <div style={{ marginTop: 20 }}>
          <Notice kind="error" title="The invoices could not be checked">
            {error}
          </Notice>
        </div>
      ) : null}

      {report ? (
        <section style={{ marginTop: 26 }} aria-live="polite" data-testid="gst-report">
          <div className="summary-grid">
            <div className="total">
              <span>Invoices checked</span>
              <strong>{report.summary.invoices}</strong>
            </div>
            <div className="total" style={{ background: report.summary.with_errors ? "var(--coral-bg)" : "var(--ok-bg)" }}>
              <span>With errors</span>
              <strong>{report.summary.with_errors}</strong>
            </div>
            <div className="total" style={{ background: "var(--sky)" }}>
              <span>Total taxable value</span>
              <strong>{rupees(report.summary.total_taxable_value)}</strong>
            </div>
            <div className="total" style={{ background: "var(--accent-soft)" }}>
              <span>Total GST</span>
              <strong>{rupees(report.summary.total_gst)}</strong>
            </div>
          </div>

          {report.results.map((result) => (
            <article className="invoice-result" key={result.position}>
              <header>
                <span>
                  Row {result.position}: {result.invoice_no || "no number"}
                </span>
                <Pill tone={result.ok ? "good" : "bad"}>{result.ok ? "No errors" : "Needs fixing"}</Pill>
              </header>
              {result.issues.length > 0 ? (
                <ul className="issue-list">
                  {result.issues.map((issue) => (
                    <li className="issue" key={issue.code + issue.message}>
                      <Pill tone={issue.severity === "error" ? "bad" : "warn"}>
                        {issue.severity === "error" ? "Error" : "Warning"}
                      </Pill>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      <Disclaimer />
    </div>
  );
}
