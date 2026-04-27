"""Embedding helper — Langchain OpenAI integration."""
import hashlib, json
from typing import List
from langchain_openai import OpenAIEmbeddings
from config import CACHE_FILE, api_endpoint, api_key, client, MODEL_EMBEDDING


_model = None
_cache: dict = {}


def _get_model():
    global _model
    if _model is None:
        print(f"[Embedder] Loading {MODEL_EMBEDDING}...")
        _model = OpenAIEmbeddings(
            base_url=api_endpoint,
            api_key=api_key,
            model=MODEL_EMBEDDING,
            http_client=client
        )
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
        vecs = model.embed_documents(to_fetch_texts)
        for j, vec in enumerate(vecs):
            _cache[to_fetch_keys[j]] = vec
            results[to_fetch_idx[j]] = vec
        _save_cache()
        print(f"[Embedder] Encoded {len(to_fetch_texts)} new texts, {len(texts) - len(to_fetch_texts)} from cache.")

    return results


def embed_one(text: str) -> List[float]:
    return embed([text])[0]


def cache_stats() -> dict:
    return {"embed_cache_entries": len(_cache), "embed_cache_file": str(CACHE_FILE)}