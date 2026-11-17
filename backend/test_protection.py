"""Every real endpoint of main.app must refuse requests that carry no login token."""
import pytest
from fastapi.testclient import TestClient

import main

PROTECTED = [
    ("get", "/deadlines"),
    ("get", "/knowledge/search?q=test"),
    ("post", "/tax/calculate"),
    ("post", "/summary/tax-pdf"),
    ("post", "/validate/pan"),
    ("post", "/validate/gstin"),
    ("post", "/gst/validate"),
    ("post", "/documents/form16"),
    ("post", "/documents/bills"),
    ("post", "/chat"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_endpoint_refuses_requests_without_login(monkeypatch, method, path):
    main.app.dependency_overrides.clear()  # remove the pretend user from conftest.py
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    response = TestClient(main.app).request(method, path)
    assert response.status_code == 401


def test_health_check_stays_public(monkeypatch):
    main.app.dependency_overrides.clear()
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    assert TestClient(main.app).get("/").status_code == 200
