from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_app_starts():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "TaxEase AI is running"


def test_tax_endpoint_gives_known_answer():
    response = client.post("/tax/calculate", json={"gross_salary": 1500000, "deduction_80c": 150000})
    body = response.json()
    assert body["new_regime"]["total_tax"] == 97500
    assert body["old_regime"]["total_tax"] == 210600


def test_deadlines_endpoint_returns_a_list():
    response = client.get("/deadlines")
    assert response.status_code == 200
    assert len(response.json()) > 0
    