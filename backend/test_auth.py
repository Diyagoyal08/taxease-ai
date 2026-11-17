import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import auth

SUPABASE_URL = "https://testproject.supabase.co"
ISSUER = SUPABASE_URL + "/auth/v1"
SECRET = "a-long-test-secret-that-is-at-least-32-bytes-long"
PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeSigningKey:
    key = PRIVATE_KEY.public_key()


class FakeJwks:
    def get_signing_key_from_jwt(self, token):
        return FakeSigningKey()


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setattr(auth, "_jwks_client", FakeJwks())


def make_app():
    app = FastAPI(dependencies=[Depends(auth.require_user)])

    @app.get("/")
    def health():
        return {"ok": True}

    @app.get("/private")
    def private(request_user: dict = Depends(auth.require_user)):
        return request_user

    @app.get("/admin-only")
    def admin_only(user: dict = Depends(auth.require_admin)):
        return user

    return TestClient(app)


def token(key=PRIVATE_KEY, alg="ES256", **overrides):
    claims = {
        "sub": "user-1", "email": "a@example.com", "aud": "authenticated", "iss": ISSUER,
        "exp": int(time.time()) + 600, "role": "authenticated", "app_metadata": {"role": "user"},
    }
    claims.update(overrides)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm=alg)


def get(path, bearer=None):
    headers = {"Authorization": f"Bearer {bearer}"} if bearer else {}
    return make_app().get(path, headers=headers)


def test_health_check_is_public():
    assert get("/").status_code == 200


def test_missing_token_is_refused():
    assert get("/private").status_code == 401


def test_valid_asymmetric_token_is_accepted():
    response = get("/private", token())
    assert response.status_code == 200
    assert response.json() == {"id": "user-1", "email": "a@example.com", "role": "user"}


def test_valid_shared_secret_token_is_accepted():
    assert get("/private", token(SECRET, "HS256")).status_code == 200


def test_expired_token_is_refused():
    assert get("/private", token(exp=int(time.time()) - 10)).status_code == 401


def test_token_signed_with_another_key_is_refused():
    assert get("/private", token(OTHER_KEY)).status_code == 401


def test_wrong_audience_is_refused():
    assert get("/private", token(aud="something-else")).status_code == 401


def test_wrong_issuer_is_refused():
    assert get("/private", token(iss="https://evil.example.com/auth/v1")).status_code == 401


def test_token_without_expiry_is_refused():
    assert get("/private", token(exp=None)).status_code == 401


def test_unsigned_alg_none_token_is_refused():
    forged = jwt.encode({"sub": "x", "aud": "authenticated", "iss": ISSUER, "exp": int(time.time()) + 600}, None, algorithm="none")
    assert get("/private", forged).status_code == 401


def test_shared_secret_token_is_refused_when_no_secret_is_configured(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWT_SECRET")
    assert get("/private", token(SECRET, "HS256")).status_code == 401


def test_garbage_token_is_refused():
    assert get("/private", "not-a-token").status_code == 401


def test_error_message_does_not_leak_details():
    body = get("/private", token(exp=int(time.time()) - 10)).json()
    assert body == {"detail": "Your session is not valid or has expired."}


def test_server_without_configuration_refuses_everything(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL")
    assert get("/private", token()).status_code == 503


def test_normal_user_cannot_use_admin_routes():
    assert get("/admin-only", token()).status_code == 403


def test_admin_role_comes_from_app_metadata():
    assert get("/admin-only", token(app_metadata={"role": "admin"})).status_code == 200


def test_user_cannot_become_admin_through_editable_metadata():
    forged = token(user_metadata={"role": "admin"}, role="admin")
    assert get("/admin-only", forged).status_code == 403


def test_a_request_with_a_body_gets_401_not_a_validation_error():
    from pydantic import BaseModel

    class Payload(BaseModel):
        value: str

    app = FastAPI(dependencies=[Depends(auth.require_user)])

    @app.post("/echo")
    def echo(payload: Payload):
        return payload

    client = TestClient(app)
    assert client.post("/echo", json={"wrong": 1}).status_code == 401
    ok = client.post("/echo", json={"value": "x"}, headers={"Authorization": f"Bearer {token()}"})
    assert ok.status_code == 200
