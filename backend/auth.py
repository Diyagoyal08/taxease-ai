"""Checks the Supabase login token on every request.

The browser sends the signed-in user's token in the Authorization header. This module verifies
the token's signature and claims, so the backend never trusts a user id or role sent by the
frontend. It fails closed: with no configuration, every protected request is refused.

Environment variables (see .env.example):
  SUPABASE_URL         e.g. https://abcdxyz.supabase.co
  SUPABASE_JWT_SECRET  only if your project still uses the older shared-secret (HS256) signing
"""
import os
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

load_dotenv(Path(__file__).parent / ".env")

PUBLIC_PATHS = {"/"}  # the health check used by the sidebar
ASYMMETRIC_ALGORITHMS = ("ES256", "RS256")
bearer = HTTPBearer(auto_error=False)
_jwks_client = None


def _issuer():
    return os.environ.get("SUPABASE_URL", "").rstrip("/") + "/auth/v1"


def _jwks():
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_issuer() + "/.well-known/jwks.json", cache_keys=True, lifespan=3600)
    return _jwks_client


def decode_token(token):
    """Return the verified claims, or raise jwt.InvalidTokenError."""
    algorithm = jwt.get_unverified_header(token).get("alg")
    if algorithm == "HS256":
        secret = os.environ.get("SUPABASE_JWT_SECRET")
        if not secret:
            raise jwt.InvalidTokenError("HS256 token but no SUPABASE_JWT_SECRET is set")
        key = secret
    elif algorithm in ASYMMETRIC_ALGORITHMS:
        key = _jwks().get_signing_key_from_jwt(token).key
    else:  # also rejects alg "none"
        raise jwt.InvalidTokenError("unsupported signing algorithm")
    return jwt.decode(
        token,
        key,
        algorithms=[algorithm],
        audience="authenticated",
        issuer=_issuer(),
        options={"require": ["exp", "sub", "aud", "iss"]},
    )


def user_from_claims(claims):
    # "role" at the top of the token is a database role ("authenticated"), not an app role.
    # The app role lives in app_metadata, which users cannot edit.
    return {
        "id": claims["sub"],
        "email": claims.get("email"),
        "role": (claims.get("app_metadata") or {}).get("role", "user"),
    }


def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    """FastAPI dependency: returns the signed-in user, or answers 401."""
    if request.url.path in PUBLIC_PATHS:
        return None
    if not os.environ.get("SUPABASE_URL"):
        raise HTTPException(status_code=503, detail="Sign-in is not configured on the server.")
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Please sign in.", headers={"WWW-Authenticate": "Bearer"})
    try:
        user = user_from_claims(decode_token(credentials.credentials))
    except (jwt.PyJWTError, jwt.exceptions.PyJWKClientError):
        raise HTTPException(
            status_code=401, detail="Your session is not valid or has expired.", headers={"WWW-Authenticate": "Bearer"}
        ) from None
    request.state.user = user
    return user


def require_admin(user: dict = Depends(require_user)):
    """FastAPI dependency for admin-only routes."""
    if user is None or user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You do not have access to this.")
    return user
