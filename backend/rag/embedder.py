"""Embedding helper — local SentenceTransformer with persistent MD5 cache."""
import hashlib, json
from typing import List
from config import CACHE_FILE


_model = None
_cache: dict = {}


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("[Embedder] Loading all-MiniLM-L6-v2 (downloads once ~80MB)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[Embedder] Model loaded ✓")
    return _model


def _load_cache():
    global _cache
    if CACHE_FILE.exists():
        try:
            _cache = json.loads(CACHE_FILE.read_text())
        except Exception:
            _cache = {}


def _save_cache():
    CACHE_FILE.write_text(json.dumps(_cache))


_load_cache()


def embed(texts: List[str]) -> List[List[float]]:
    results        = [None] * len(texts)
    to_fetch_idx   = []
    to_fetch_texts = []
    to_fetch_keys  = []

    for i, t in enumerate(texts):
        key = hashlib.md5(t.encode()).hexdigest()
        if key in _cache:
            results[i] = _cache[key]
        else:
            to_fetch_idx.append(i)
            to_fetch_texts.append(t)
            to_fetch_keys.append(key)

    if to_fetch_texts:
        model = _get_model()
        vecs  = model.encode(to_fetch_texts, convert_to_numpy=True, show_progress_bar=False)
        for j, vec in enumerate(vecs):
            _cache[to_fetch_keys[j]] = vec.tolist()
            results[to_fetch_idx[j]] = vec.tolist()
        _save_cache()
        print(f"[Embedder] Encoded {len(to_fetch_texts)} new texts, {len(texts) - len(to_fetch_texts)} from cache.")

    return results


def embed_one(text: str) -> List[float]:
    return embed([text])[0]


def cache_stats() -> dict:
    return {"embed_cache_entries": len(_cache), "embed_cache_file": str(CACHE_FILE)}