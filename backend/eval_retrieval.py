import json
from pathlib import Path

from knowledge import KnowledgeBase, load_chunks

ROOT = Path(__file__).parent.parent


def main(k=3):
    base = KnowledgeBase(load_chunks(ROOT / "data" / "knowledge"))
    questions = json.loads((ROOT / "data" / "eval_questions.json").read_text(encoding="utf-8"))
    correct = 0
    for item in questions:
        results = base.search(item["question"], k=k)
        sources = [r["source"] for r in results]
        expected = item["expected_source"]
        # expected_source is null for questions that should NOT be answerable
        if expected is None:
            ok = not results
        else:
            wanted = expected if isinstance(expected, list) else [expected]
            ok = any(w in s for w in wanted for s in sources)
        correct += ok
        print(("PASS " if ok else "FAIL ") + item["question"] + "  ->  " + (", ".join(sources) or "no result"))
    print(f"\nHit rate: {correct}/{len(questions)} = {correct / len(questions):.0%}")


if __name__ == "__main__":
    main()