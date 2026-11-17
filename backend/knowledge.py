from pathlib import Path

import pdfplumber
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def split_text(text, size=800, overlap=150):
    """Cut text into chunks of about `size` characters.

    The last few lines of each chunk are repeated at the start of the next one,
    so a sentence that falls on the boundary is not lost.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    chunks, current, length = [], [], 0
    for line in lines:
        if length + len(line) > size and current:
            chunks.append(" ".join(current))
            keep, kept = [], 0
            for old in reversed(current):
                if kept + len(old) > overlap:
                    break
                keep.insert(0, old)
                kept += len(old)
            current, length = keep, kept
        current.append(line)
        length += len(line)
    if current:
        chunks.append(" ".join(current))
    return chunks


def load_chunks(folder):
    """Read every PDF and text file in a folder into chunks with their source."""
    chunks = []
    for path in sorted(Path(folder).glob("*")):
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            with pdfplumber.open(path) as pdf:
                for number, page in enumerate(pdf.pages, start=1):
                    for piece in split_text(page.extract_text() or ""):
                        chunks.append({"text": piece, "source": path.name, "page": number})
        elif suffix in (".txt", ".md"):
            for piece in split_text(path.read_text(encoding="utf-8")):
                chunks.append({"text": piece, "source": path.name, "page": None})
    return chunks


class KnowledgeBase:
    def __init__(self, chunks):
        self.chunks = chunks
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english",
                                          sublinear_tf=True)
        self.matrix = None
        if chunks:
            self.matrix = self.vectorizer.fit_transform([c["text"] for c in chunks])

    def search(self, query, k=3, min_score=0.1):
        """Return the best matching chunks. An empty list means 'I don't know'."""
        if self.matrix is None or not query.strip():
            return []
        scores = cosine_similarity(self.vectorizer.transform([query]), self.matrix)[0]
        best = scores.argsort()[::-1][:k]
        return [{**self.chunks[i], "score": round(float(scores[i]), 3)}
                for i in best if scores[i] >= min_score]