# API reference

Base address: `http://127.0.0.1:8000`. Interactive docs: `/docs` (the page opens without a login, but every
endpoint except `/` needs one).

**Every endpoint except `GET /` needs the header `Authorization: Bearer <access token>`** from Supabase Auth.

| Status | Meaning |
|---|---|
| 401 | No token, or the token is invalid or expired |
| 403 | Signed in but not allowed (admin-only routes) |
| 413 | Upload too large (10 MB per file) or too many files (10) |
| 422 | The request body or file could not be used |
| 429 | Too many assistant questions (20 per 10 minutes per user) |
| 503 | The server has no `SUPABASE_URL`, so it refuses everything (fail closed) |

| Method and path | Purpose | Body | Main response |
|---|---|---|---|
| `GET /` | Health check (public) | none | `{"message": "TaxEase AI is running"}` |
| `GET /deadlines` | Upcoming deadlines, soonest first | none | `[{id, name, category, due_date, days_left, urgent}]` |
| `POST /tax/calculate` | Old vs new regime | JSON: `gross_salary` (required), `other_income`, `hra_exemption`, `deduction_80c`, `nps_80ccd_1b`, `deduction_80d`, `home_loan_interest`, `tds_paid` (all numbers, 0 or more) | `{rules_year, new_regime, old_regime, recommended, savings, disclaimer}`; each regime has `taxable_income, tax_on_slabs, rebate, marginal_relief, cess, total_tax, tds_paid, net_payable_or_refund, steps` |
| `POST /summary/tax-pdf` | Summary PDF | same as `/tax/calculate` | `application/pdf` download |
| `POST /validate/pan` | PAN check | `{"value": "..."}` | `{value, valid, holder_type, errors}` |
| `POST /validate/gstin` | GSTIN check | `{"value": "..."}` | `{value, valid, state_code, pan, errors}` |
| `POST /documents/form16` | Read a Form 16 | multipart, field `file` (PDF) | `{fields: {name: {value, confidence}}, warnings, tax_input, note}` |
| `POST /documents/bills` | Read bills | multipart, field `files` (PDF, PNG, JPG; up to 10) | `{bills: [{filename, method, category, amount, date, needs_review, problem}], tax_input_suggestion, rent_paid, needs_review, note}`; a bad file gets its own `error` and does not stop the others |
| `POST /gst/validate` | Check invoices | JSON list of invoices: `invoice_no, invoice_date (YYYY-MM-DD), supplier_gstin, buyer_gstin?, place_of_supply?, taxable_value, gst_rate, cgst, sgst, igst, total` | `{summary: {invoices, with_errors, total_taxable_value, total_gst}, results: [{position, invoice_no, ok, issues: [{severity, code, message}]}]}` |
| `GET /knowledge/search?q=...&k=3` | Search the official documents | none (`q` 2 to 500 characters, `k` 1 to 10) | `{query, found, results: [{text, source, page, score}], message}` |
| `POST /chat` | Ask a question | `{"question": "..."}` (3 to 500 characters) | `{answer, answered, sources: [{number, source, page, score, excerpt}], error, disclaimer}` |

Notes:
- `form16` and `bills` read the file from a temporary location and delete it straight away. Files are never stored.
- `chat`: when the language model is unavailable, `answered` is false, `sources` still lists the matching
  passages, and `error` holds only a short code such as `HfHubHTTPError (HTTP 402)`. Full details go to the
  server log, not to the browser.
