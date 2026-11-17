"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Disclaimer, FileDrop, Notice, PageHeader, Pill, Spinner } from "@/components/ui";
import { readBills } from "@/lib/api";
import { rupees, toNumber } from "@/lib/format";
import { addActivity, saveTaxInput } from "@/lib/store";

const CATEGORIES = [
  ["", "Choose a type"],
  ["investment_80c", "80C investment (PPF, ELSS, LIC)"],
  ["health_insurance", "Health insurance (80D)"],
  ["nps", "NPS contribution (80CCD(1B))"],
  ["home_loan_interest", "Home loan interest"],
  ["rent", "Rent receipt"],
  ["ignore", "Not a tax bill (leave out)"],
];

// which calculator field each bill type feeds
const FIELD_OF = {
  investment_80c: "deduction_80c",
  health_insurance: "deduction_80d",
  nps: "nps_80ccd_1b",
  home_loan_interest: "home_loan_interest",
};

const FIELD_LABEL = {
  deduction_80c: "80C investments",
  deduction_80d: "Health insurance (80D)",
  nps_80ccd_1b: "NPS (80CCD(1B))",
  home_loan_interest: "Home loan interest",
};

let counter = 0;

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    setError("");
    setBusy(true);
    try {
      const answer = await readBills(files);
      const added = answer.bills.map((bill) => ({
        id: `${Date.now()}-${counter++}`,
        filename: bill.filename,
        method: bill.method,
        date: bill.date,
        error: bill.error || "",
        problem: bill.problem || "",
        category: bill.category || "",
        amount: bill.amount !== null && bill.amount !== undefined ? String(bill.amount) : "",
        confirmed: !bill.error && !bill.needs_review,
        needsReview: Boolean(bill.needs_review),
      }));
      setBills((current) => [...current, ...added]);
      addActivity(`Read ${files.length} bill${files.length === 1 ? "" : "s"}`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }

  function change(id, patch) {
    setBills((current) => current.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)));
  }

  function canConfirm(bill) {
    return !bill.error && bill.category && bill.category !== "ignore" && toNumber(bill.amount) > 0;
  }

  const totals = useMemo(() => {
    const sums = {};
    let rent = 0;
    for (const bill of bills) {
      if (!bill.confirmed || !canConfirm(bill)) continue;
      const amount = toNumber(bill.amount);
      if (bill.category === "rent") rent += amount;
      else sums[FIELD_OF[bill.category]] = (sums[FIELD_OF[bill.category]] || 0) + amount;
    }
    return { sums, rent };
  }, [bills]);

  const hasTotals = Object.keys(totals.sums).length > 0;

  function useInCalculator() {
    saveTaxInput(totals.sums, "bills");
    router.push("/tax");
  }

  return (
    <div className="page">
      <PageHeader
        title="Bills"
        subtitle="Upload receipts for investments, insurance and loans. Confirm each one, then send the totals to the calculator."
      />

      <FileDrop
        accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
        multiple
        onFiles={handleFiles}
        busy={busy}
        title="Drop your bills here"
        hint="PDF, PNG or JPG. Photos and scans are read with OCR, which can misread digits."
      />

      {busy ? (
        <p style={{ marginTop: 20 }}>
          <Spinner label="Reading your bills…" />
        </p>
      ) : null}
      {error ? (
        <div style={{ marginTop: 20 }}>
          <Notice kind="error" title="The bills could not be read">
            {error}
          </Notice>
        </div>
      ) : null}

      {bills.length > 0 ? (
        <>
          <div className="bill-list">
            {bills.map((bill) => (
              <article className={"bill" + (bill.confirmed ? " is-confirmed" : "")} key={bill.id}>
                <div>
                  <p className="bill-name">{bill.filename}</p>
                  <div className="bill-meta">
                    {bill.method === "ocr" ? <Pill tone="warn">Read by OCR, check the amount</Pill> : null}
                    {bill.method === "text" ? <Pill tone="good">Read from text</Pill> : null}
                    {bill.date ? <span>{bill.date}</span> : null}
                  </div>
                  {bill.error ? <p style={{ color: "var(--coral-deep)", marginTop: 6 }}>{bill.error}</p> : null}
                  {!bill.error && bill.problem ? (
                    <p style={{ color: "var(--warn-deep)", marginTop: 6 }}>{bill.problem}</p>
                  ) : null}
                </div>

                <div>
                  <label className="muted" htmlFor={`cat-${bill.id}`} style={{ fontSize: 13 }}>
                    Bill type
                  </label>
                  <select
                    id={`cat-${bill.id}`}
                    className="select input-sm"
                    disabled={Boolean(bill.error)}
                    value={bill.category}
                    onChange={(event) => change(bill.id, { category: event.target.value, confirmed: false })}
                  >
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="muted" htmlFor={`amt-${bill.id}`} style={{ fontSize: 13 }}>
                    Amount (₹)
                  </label>
                  <input
                    id={`amt-${bill.id}`}
                    className="input input-sm"
                    inputMode="decimal"
                    disabled={Boolean(bill.error)}
                    value={bill.amount}
                    onChange={(event) => change(bill.id, { amount: event.target.value, confirmed: false })}
                  />
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    style={{ width: 20, height: 20, accentColor: "var(--ink)" }}
                    checked={bill.confirmed}
                    disabled={!canConfirm(bill)}
                    onChange={(event) => change(bill.id, { confirmed: event.target.checked })}
                  />
                  Confirmed
                </label>
              </article>
            ))}
          </div>

          <section className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h2>Totals from confirmed bills</h2>
              <button type="button" className="link-button" onClick={() => setBills([])}>
                Remove all bills
              </button>
            </div>
            {!hasTotals && totals.rent === 0 ? (
              <p className="muted">Confirm at least one bill to see totals here.</p>
            ) : (
              <div className="totals" data-testid="bill-totals">
                {Object.entries(totals.sums).map(([field, sum]) => (
                  <div className="total" key={field}>
                    <span>{FIELD_LABEL[field]}</span>
                    <strong>{rupees(sum)}</strong>
                  </div>
                ))}
                {totals.rent > 0 ? (
                  <div className="total" style={{ background: "var(--accent-soft)" }}>
                    <span>Rent paid (information only)</span>
                    <strong>{rupees(totals.rent)}</strong>
                  </div>
                ) : null}
              </div>
            )}
            {totals.rent > 0 ? (
              <p className="help" style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
                Rent paid is not the HRA exemption. The HRA exemption also depends on your basic salary and city, so
                enter that amount yourself on the calculator page.
              </p>
            ) : null}
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-dark" disabled={!hasTotals} onClick={useInCalculator}>
                Use these totals in the tax calculator
              </button>
            </div>
          </section>
        </>
      ) : null}
      <Disclaimer />
    </div>
  );
}
