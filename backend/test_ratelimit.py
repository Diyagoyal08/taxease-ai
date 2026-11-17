import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import auth
import ratelimit


def make_client(user_id, limiter):
    app = FastAPI()
    app.dependency_overrides[auth.require_user] = lambda: {"id": user_id, "email": None, "role": "user"}

    @app.get("/ask", dependencies=[Depends(limiter)])
    def ask():
        return {"ok": True}

    return TestClient(app)


def test_calls_over_the_limit_are_refused():
    client = make_client("u1", ratelimit.RateLimiter(2, 60))
    assert client.get("/ask").status_code == 200
    assert client.get("/ask").status_code == 200
    third = client.get("/ask")
    assert third.status_code == 429
    assert int(third.headers["Retry-After"]) > 0


def test_each_user_has_their_own_allowance():
    limiter = ratelimit.RateLimiter(1, 60)
    assert make_client("a", limiter).get("/ask").status_code == 200
    assert make_client("b", limiter).get("/ask").status_code == 200
    assert make_client("a", limiter).get("/ask").status_code == 429


def test_allowance_comes_back_after_the_window(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(ratelimit.time, "monotonic", lambda: clock[0])
    client = make_client("u", ratelimit.RateLimiter(1, 60))
    assert client.get("/ask").status_code == 200
    assert client.get("/ask").status_code == 429
    clock[0] += 61
    assert client.get("/ask").status_code == 200


def test_the_real_chat_endpoint_has_a_limiter_attached():
    import main

    route = next(r for r in main.app.routes if getattr(r, "path", "") == "/chat")
    attached = [dependency.call for dependency in route.dependant.dependencies]
    assert main.chat_limiter in attached
