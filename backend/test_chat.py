from fastapi.testclient import TestClient

import main


class EmptyBase:
    def search(self, query, k=3, min_score=0.1):
        return []


def test_chat_without_passages_refuses_and_adds_disclaimer(monkeypatch):
    monkeypatch.setattr(main, "get_knowledge_base", lambda: EmptyBase())
    client = TestClient(main.app)
    body = client.post("/chat", json={"question": "What is the capital of Australia?"}).json()
    assert body["answered"] is False
    assert "disclaimer" in body


def test_chat_rejects_an_empty_question():
    client = TestClient(main.app)
    assert client.post("/chat", json={"question": ""}).status_code == 422