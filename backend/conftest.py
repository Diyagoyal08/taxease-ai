"""Put this file next to your other tests in backend/.

It signs a pretend user in for every test that uses the real app (main.app), so the older tests keep
working now that every endpoint needs a login. Tests that check the protection itself clear it again.
"""
import pytest

import auth
import main


@pytest.fixture(autouse=True)
def signed_in_user():
    main.app.dependency_overrides[auth.require_user] = lambda: {"id": "test-user", "email": "test@example.com", "role": "user"}
    yield
    main.app.dependency_overrides.clear()
