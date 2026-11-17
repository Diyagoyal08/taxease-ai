from knowledge import KnowledgeBase, split_text

CHUNKS = [
    {"text": "The due date for filing ITR-1 for salaried individuals is 31 July.",
     "source": "itr.txt", "page": None},
    {"text": "GSTR-3B is the monthly summary return and tax payment, due on the 20th of the next month.",
     "source": "gst.txt", "page": None},
    {"text": "The standard deduction for salaried employees is a flat amount subtracted from salary.",
     "source": "tax.txt", "page": None},
]


def test_relevant_question_finds_the_right_source():
    results = KnowledgeBase(CHUNKS).search("when is GSTR-3B due")
    assert results[0]["source"] == "gst.txt"


def test_irrelevant_question_finds_nothing():
    assert KnowledgeBase(CHUNKS).search("best pizza recipe in Jaipur") == []


def test_empty_knowledge_base_is_safe():
    assert KnowledgeBase([]).search("anything") == []


def test_split_text_makes_several_chunks_of_limited_size():
    text = "\n".join(f"line number {i} with some words" for i in range(100))
    chunks = split_text(text, size=200, overlap=50)
    assert len(chunks) > 1
    assert all(len(chunk) <= 260 for chunk in chunks)