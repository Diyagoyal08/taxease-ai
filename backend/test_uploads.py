import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
import uploads

DATA = Path(__file__).parent.parent / "data"
PDF = (DATA / "sample_form16_a.pdf").read_bytes()
PNG = (DATA / "scan_ppf_clean.png").read_bytes()
client = TestClient(main.app)


class Fake:
    """Imitates the upload object FastAPI hands over."""

    def __init__(self, name, content):
        self.filename = name
        self.file = io.BytesIO(content)


def use(name, content, allowed={".pdf"}):
    with uploads.temp_upload(Fake(name, content), allowed) as path:
        return Path(path)


def test_valid_pdf_is_saved_then_deleted():
    path = use("a.pdf", PDF)
    assert not path.exists()  # deleted when the block ended


def test_file_exists_while_in_use():
    with uploads.temp_upload(Fake("a.pdf", PDF), {".pdf"}) as path:
        assert Path(path).read_bytes() == PDF


def test_wrong_extension_is_refused():
    with pytest.raises(uploads.UploadProblem, match="Supported files"):
        use("notes.txt", b"hello")


def test_missing_filename_is_refused():
    with pytest.raises(uploads.UploadProblem):
        use(None, PDF)


def test_renamed_file_is_refused():
    with pytest.raises(uploads.UploadProblem, match="not a real PDF"):
        use("bill.pdf", PNG)


def test_empty_file_is_refused():
    with pytest.raises(uploads.UploadProblem, match="empty"):
        use("a.pdf", b"")


def test_oversized_file_is_refused_and_cleaned_up(monkeypatch):
    monkeypatch.setattr(uploads, "MAX_UPLOAD_BYTES", 100)
    with pytest.raises(uploads.UploadProblem) as problem:
        use("a.pdf", PDF)
    assert problem.value.status == 413


def test_no_temp_file_is_left_after_a_refusal(monkeypatch, tmp_path):
    monkeypatch.setattr(uploads.tempfile, "tempdir", str(tmp_path))
    with pytest.raises(uploads.UploadProblem):
        use("bill.pdf", PNG)
    assert list(tmp_path.iterdir()) == []


# ---- through the real endpoints ----

def test_form16_reads_a_real_sample():
    response = client.post("/documents/form16", files={"file": ("f.pdf", PDF, "application/pdf")})
    assert response.status_code == 200
    assert response.json()["fields"]["gross_salary"]["value"] == 1500000


def test_form16_refuses_a_disguised_png():
    response = client.post("/documents/form16", files={"file": ("f.pdf", PNG, "application/pdf")})
    assert response.status_code == 400


def test_form16_refuses_a_non_pdf_extension():
    response = client.post("/documents/form16", files={"file": ("f.txt", b"hello", "text/plain")})
    assert response.status_code == 400


def test_form16_answers_422_for_a_damaged_pdf():
    response = client.post("/documents/form16", files={"file": ("f.pdf", b"%PDF-1.4 broken", "application/pdf")})
    assert response.status_code in (422,)


def test_form16_too_large_gives_413(monkeypatch):
    monkeypatch.setattr(uploads, "MAX_UPLOAD_BYTES", 100)
    response = client.post("/documents/form16", files={"file": ("f.pdf", PDF, "application/pdf")})
    assert response.status_code == 413


def test_bills_marks_each_bad_file_but_reads_the_good_ones():
    good = (DATA / "bill_ppf.pdf").read_bytes()
    response = client.post(
        "/documents/bills",
        files=[("files", ("bill_ppf.pdf", good, "application/pdf")), ("files", ("x.txt", b"hi", "text/plain")), ("files", ("fake.pdf", PNG, "application/pdf"))],
    )
    assert response.status_code == 200
    bills = {bill["filename"]: bill for bill in response.json()["bills"]}
    assert bills["bill_ppf.pdf"]["category"] == "investment_80c"
    assert "Supported files" in bills["x.txt"]["error"]
    assert "not a real PDF" in bills["fake.pdf"]["error"]
    assert response.json()["tax_input_suggestion"] == {"deduction_80c": 100000.0}


def test_bills_refuses_too_many_files():
    files = [("files", (f"b{i}.pdf", PDF, "application/pdf")) for i in range(uploads.MAX_FILES + 1)]
    assert client.post("/documents/bills", files=files).status_code == 413
