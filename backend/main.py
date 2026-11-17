import json
import logging
import os
from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from answerer import DISCLAIMER, generate_answer
from auth import require_user
from bill_reader import read_bill, summarize_bills
from extractor import extract_fields, extract_text, run_checks
from invoice_checker import check_batch
from knowledge import KnowledgeBase, load_chunks
from ratelimit import RateLimiter
from summary_pdf import build_summary_pdf
from tax_engine import compare_regimes
from uploads import MAX_FILES, UploadProblem, temp_upload
from validators import validate_gstin, validate_pan

logger = logging.getLogger("taxease")

# Every endpoint needs a signed-in user (see auth.py). Only the health check at "/" is public.
app = FastAPI(title="TaxEase AI", dependencies=[Depends(require_user)])

# Only the website may call this API from a browser. Set FRONTEND_ORIGIN in .env for your real address.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

DEADLINES_FILE = Path(__file__).parent / "deadlines.json"
BILL_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
chat_limiter = RateLimiter(max_calls=20, window_seconds=600)


# ---------- Step 2: deadlines ----------

def next_due_date(item, today):
    """Return the next upcoming due date for one deadline."""
    if item["type"] == "monthly":
        candidate = date(today.year, today.month, item["day"])
        if candidate < today:
            if today.month == 12:
                candidate = date(today.year + 1, 1, item["day"])
            else:
                candidate = date(today.year, today.month + 1, item["day"])
    else:  # yearly
        candidate = date(today.year, item["month"], item["day"])
        if candidate < today:
            candidate = date(today.year + 1, item["month"], item["day"])
    return candidate


@app.get("/")
def home():
    return {"message": "TaxEase AI is running"}


@app.get("/deadlines")
def get_deadlines():
    today = date.today()
    items = json.loads(DEADLINES_FILE.read_text(encoding="utf-8"))
    result = []
    for item in items:
        due = next_due_date(item, today)
        days_left = (due - today).days
        result.append({
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "due_date": due.isoformat(),
            "days_left": days_left,
            "urgent": days_left <= 7,
        })
    result.sort(key=lambda x: x["days_left"])
    return result


# ---------- Step 3: tax calculator ----------

class TaxInput(BaseModel):
    gross_salary: float = Field(ge=0)
    other_income: float = Field(0, ge=0)
    hra_exemption: float = Field(0, ge=0)
    deduction_80c: float = Field(0, ge=0)
    nps_80ccd_1b: float = Field(0, ge=0)
    deduction_80d: float = Field(0, ge=0)
    home_loan_interest: float = Field(0, ge=0)
    tds_paid: float = Field(0, ge=0)


@app.post("/tax/calculate")
def tax_calculate(data: TaxInput):
    return compare_regimes(data.model_dump())


# ---------- Step 4: PAN and GSTIN checker ----------

class ValueInput(BaseModel):
    value: str


@app.post("/validate/pan")
def check_pan(data: ValueInput):
    return validate_pan(data.value)


@app.post("/validate/gstin")
def check_gstin(data: ValueInput):
    return validate_gstin(data.value)


# ---------- Step 5: Form 16 reader ----------

@app.post("/documents/form16")
def read_form16(file: UploadFile = File(...)):
    try:
        with temp_upload(file, {".pdf"}) as path:
            text = extract_text(path)
    except UploadProblem as problem:
        raise HTTPException(status_code=problem.status, detail=str(problem)) from None
    except Exception:
        logger.exception("Could not read a Form 16 PDF")
        raise HTTPException(status_code=422, detail="This PDF could not be read. It may be damaged.") from None

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text found. This may be a scanned PDF, which needs OCR (a later step).")

    fields = extract_fields(text)
    warnings = run_checks(fields)
    return {
        "fields": fields,
        "warnings": warnings,
        "tax_input": {
            "gross_salary": fields["gross_salary"]["value"],
            "tds_paid": fields["tds_deducted"]["value"],
        },
        "note": "Please review every value against your document before using it.",
    }


# ---------- Step 6: GST invoice checker ----------

class Invoice(BaseModel):
    invoice_no: str
    invoice_date: str
    supplier_gstin: str
    buyer_gstin: str | None = None
    place_of_supply: str | None = None
    taxable_value: float = Field(ge=0)
    gst_rate: float = Field(ge=0)
    cgst: float = Field(0, ge=0)
    sgst: float = Field(0, ge=0)
    igst: float = Field(0, ge=0)
    total: float = Field(ge=0)


@app.post("/gst/validate")
def gst_validate(invoices: list[Invoice]):
    return check_batch([inv.model_dump() for inv in invoices])


# ---------- Step 7A: tax summary PDF ----------

@app.post("/summary/tax-pdf")
def tax_summary_pdf(data: TaxInput):
    values = data.model_dump()
    pdf_bytes = build_summary_pdf(compare_regimes(values), values)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=tax_summary.pdf"},
    )


# ---------- Step 7B and 7C: bills (text PDFs, scans and photos) ----------

@app.post("/documents/bills")
def read_bills(files: list[UploadFile] = File(...)):
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=413, detail=f"Please upload at most {MAX_FILES} files at a time.")
    bills = []
    for upload in files:
        name = upload.filename or "unnamed file"
        try:
            with temp_upload(upload, BILL_EXTENSIONS) as path:
                bills.append(read_bill(path, name))
        except UploadProblem as problem:
            bills.append({"filename": name, "error": str(problem)})
        except Exception:
            logger.exception("Could not read a bill")
            bills.append({"filename": name, "error": "This file could not be read."})
    return summarize_bills(bills)


# ---------- Step 8A: knowledge search ----------

KNOWLEDGE_FOLDER = Path(__file__).parent.parent / "data" / "knowledge"
_knowledge_base = None


def get_knowledge_base():
    """Build the search index the first time it is needed."""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase(load_chunks(KNOWLEDGE_FOLDER))
    return _knowledge_base


@app.get("/knowledge/search")
def knowledge_search(q: str = Query(min_length=2, max_length=500), k: int = Query(3, ge=1, le=10)):
    results = get_knowledge_base().search(q, k=k)
    return {
        "query": q,
        "found": bool(results),
        "results": results,
        "message": None if results else "I could not find this in the knowledge base.",
    }

# ---------- Step 8B: chatbot ----------

class ChatInput(BaseModel):
    question: str = Field(min_length=3, max_length=500)


@app.post("/chat", dependencies=[Depends(chat_limiter)])
def chat(data: ChatInput):
    passages = get_knowledge_base().search(data.question, k=3)
    result = generate_answer(data.question, passages)
    result["disclaimer"] = DISCLAIMER
    return result