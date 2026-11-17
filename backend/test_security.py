from fastapi.testclient import TestClient

import answerer
import main

client = TestClient(main.app)


def test_browser_requests_from_the_website_are_allowed():
    response = client.options(
        "/tax/calculate",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_other_websites_are_not_allowed():
    response = client.options(
        "/tax/calculate",
        headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers


def test_service_failure_does_not_leak_internal_details(monkeypatch):
    class Boom:
        chat = None

        def __init__(self):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            raise RuntimeError("POST https://router.internal.example/v1 failed, request id abc-123, token hf_secret")

    passage = [{"text": "t", "source": "s.pdf", "page": 1}]
    result = answerer.generate_answer("question?", passage, client=Boom())
    text = str(result)
    assert "router.internal" not in text and "abc-123" not in text and "hf_secret" not in text
    assert result["answered"] is False and result["error"] == "RuntimeError"


def test_usage_limit_gets_a_friendly_message(monkeypatch):
    class Response:
        status_code = 402

    class LimitError(Exception):
        response = Response()

    class Limited:
        def __init__(self):
            self.chat = self
            self.completions = self

        def create(self, **kwargs):
            raise LimitError("payment required")

    passage = [{"text": "t", "source": "s.pdf", "page": 1}]
    result = answerer.generate_answer("question?", passage, client=Limited())
    assert "usage limit" in result["answer"] and result["error"] == "LimitError (HTTP 402)"


def test_search_endpoint_rejects_silly_parameters():
    assert client.get("/knowledge/search", params={"q": "x"}).status_code == 422
    assert client.get("/knowledge/search", params={"q": "tax", "k": 500}).status_code == 422
