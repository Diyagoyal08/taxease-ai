"""A small per-user rate limit, kept in memory.

It protects the language-model credits from one person asking in a loop. Limits are counted per
backend process, so with several worker processes each one keeps its own count.
"""
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from auth import require_user


class RateLimiter:
    def __init__(self, max_calls, window_seconds):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls = defaultdict(deque)

    def __call__(self, user: dict | None = Depends(require_user)):
        key = user["id"] if user else "anonymous"
        now = time.monotonic()
        calls = self._calls[key]
        while calls and now - calls[0] >= self.window_seconds:
            calls.popleft()
        if len(calls) >= self.max_calls:
            wait = int(self.window_seconds - (now - calls[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"You have asked a lot of questions. Please wait about {max(1, wait // 60)} minute(s).",
                headers={"Retry-After": str(wait)},
            )
        calls.append(now)
