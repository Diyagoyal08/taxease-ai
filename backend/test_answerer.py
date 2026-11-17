from answerer import NOT_FOUND, build_messages, generate_answer

PASSAGES = [{"text": "ITR-1 can be filed by a resident individual whose total income "
                     "does not exceed 50 lakh.",
             "source": "itr1.pdf", "page": 2, "score": 0.5}]


class FakeClient:
    """Pretends to be the Hugging Face client, so tests cost nothing."""

    def __init__(self, reply=None, error=None):
        self.reply, self.error, self.calls = reply, error, 0
        self.chat = self          # lets the code call client.chat.completions.create(...)
        self.completions = self

    def create(self, **kwargs):
        self.calls += 1
        if self.error:
            raise self.error

        class Message:
            content = self.reply

        class Choice:
            message = Message()

        class Completion:
            choices = [Choice()]

        return Completion()


def test_prompt_contains_sources_and_question():
    messages = build_messages("What is the limit?", PASSAGES)
    text = " ".join(m["content"] for m in messages)
    assert "[1]" in text and "itr1.pdf" in text and "What is the limit?" in text
    assert "ONLY" in messages[0]["content"]


def test_no_passages_does_not_call_the_model():
    client = FakeClient("anything")
    result = generate_answer("Capital of Australia?", [], client=client)
    assert result["answered"] is False
    assert result["answer"] == NOT_FOUND
    assert client.calls == 0


def test_good_answer_comes_with_sources():
    client = FakeClient("The limit is 50 lakh [1].")
    result = generate_answer("What is the limit?", PASSAGES, client=client)
    assert result["answered"] is True
    assert result["sources"][0]["source"] == "itr1.pdf"


def test_model_saying_not_found_is_reported_as_unanswered():
    result = generate_answer("Due date?", PASSAGES, client=FakeClient("NOT_FOUND"))
    assert result["answered"] is False
    assert result["sources"] == []


def test_service_error_does_not_crash():
    client = FakeClient(error=RuntimeError("rate limit"))
    result = generate_answer("Anything?", PASSAGES, client=client)
    assert result["answered"] is False
    assert "RuntimeError" in result["error"]


def test_very_long_passage_is_shortened():
    long_passage = [{"text": "x" * 5000, "source": "a.pdf", "page": 1}]
    messages = build_messages("Q?", long_passage)
    assert len(messages[1]["content"]) < 1500