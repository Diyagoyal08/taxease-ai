import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger("taxease")

DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
NOT_FOUND = ("I could not find this in the official documents I have. "
             "Please check the Income Tax or GST portal.")
DISCLAIMER = ("General information only, not tax advice. "
              "Verify with the official portal or a qualified professional.")
MAX_PASSAGE_CHARS = 900

SYSTEM_PROMPT = """You answer questions about Indian income tax and GST using ONLY the numbered sources provided.
Rules:
- Use only facts stated in the sources. Do not use outside knowledge.
- If the sources do not contain the answer, reply with exactly: NOT_FOUND
- Cite sources like [1] or [2] after each fact.
- Keep the answer under 120 words, in simple language.
- Never calculate tax yourself and never give personal tax advice."""


def build_messages(question, passages):
    """Put the passages and the question into the chat format."""
    blocks = []
    for number, p in enumerate(passages, start=1):
        text = p["text"][:MAX_PASSAGE_CHARS]
        blocks.append(f"[{number}] ({p['source']}, page {p['page']})\n{text}")
    user = "Sources:\n\n" + "\n\n".join(blocks) + f"\n\nQuestion: {question}"
    return [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user}]


def sources_list(passages):
    return [{"number": number, "source": p["source"], "page": p["page"],
             "score": p.get("score"), "excerpt": p["text"][:200]}
            for number, p in enumerate(passages, start=1)]


def generate_answer(question, passages, client=None, model=None):
    # No passages found: do not spend credits, just say so
    if not passages:
        return {"answer": NOT_FOUND, "answered": False, "sources": [], "error": None}

    if client is None:
        token = os.environ.get("HF_TOKEN")
        if not token:
            return {"answer": "The answer service is not set up (HF_TOKEN is missing).",
                    "answered": False, "sources": sources_list(passages),
                    "error": "HF_TOKEN missing"}
        from huggingface_hub import InferenceClient
        client = InferenceClient(api_key=token)

    model = model or os.environ.get("HF_MODEL", DEFAULT_MODEL)
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=build_messages(question, passages),
            max_tokens=250,
            temperature=0.0,
        )
        text = (completion.choices[0].message.content or "").strip()
    except Exception as exc:  # rate limit, out of credits, model unavailable...
        # The full message can contain addresses and request ids, so it goes to the server log only.
        logger.warning("Answer service failed: %s", exc)
        status = getattr(getattr(exc, "response", None), "status_code", None)
        reason = "has reached its usage limit for now" if status in (402, 429) else "is not available right now"
        return {"answer": f"The answer service {reason}. These passages may still help you.",
                "answered": False, "sources": sources_list(passages),
                "error": type(exc).__name__ + (f" (HTTP {status})" if status else "")}

    if not text or "NOT_FOUND" in text:
        return {"answer": NOT_FOUND, "answered": False, "sources": [], "error": None}
    return {"answer": text, "answered": True,
            "sources": sources_list(passages), "error": None}