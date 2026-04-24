"""BM25Okapi keyword search — preserves ALL_CAPS_ERR codes for exact matching."""
import re
from typing import List, Tuple
from rank_bm25 import BM25Okapi

def _tokenize(text: str) -> List[str]:
    # Keep error codes (ALL_CAPS with underscores) as-is + standard lowercase tokens
    caps = re.findall(r"[A-Z][A-Z0-9_]{2,}", text)
    lower = re.findall(r"[a-z0-9]+", text.lower())
    return caps + lower

class BM25Index:
    def __init__(self, docs: List[str]):
        self.docs = docs
        self.bm25 = BM25Okapi([_tokenize(d) for d in docs])

    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        scores = self.bm25.get_scores(_tokenize(query))
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
        max_s = ranked[0][1] if ranked and ranked[0][1] > 0 else 1.0
        return [(idx, round(float(s) / max_s, 4)) for idx, s in ranked]
