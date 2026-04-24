"""Response cache — exact-match + semantic fallback for diagnostician LLM calls."""
import json, hashlib
import numpy as np
from pathlib import Path
from typing import Optional

_CACHE_FILE          = Path("data/response_cache.json")
_SEMANTIC_CACHE_FILE = Path("data/semantic_cache.json")
_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

# ── In-memory stores ───────────────────────────────────────────────────────────
_exact_cache: dict = {}       # sig → result
_semantic_store: list = []    # [{sig, service, embedding, result}]

_SEMANTIC_THRESHOLD = 0.88    # cosine similarity floor for a cache hit


# ── Persistence helpers ────────────────────────────────────────────────────────
def _load():
    global _exact_cache, _semantic_store
    if _CACHE_FILE.exists():
        try:
            _exact_cache = json.loads(_CACHE_FILE.read_text())
        except Exception:
            _exact_cache = {}

    if _SEMANTIC_CACHE_FILE.exists():
        try:
            raw = json.loads(_SEMANTIC_CACHE_FILE.read_text())
            # Restore numpy arrays from lists
            _semantic_store = [
                {**entry, "embedding": np.array(entry["embedding"])}
                for entry in raw
            ]
        except Exception:
            _semantic_store = []


def _save_exact():
    _CACHE_FILE.write_text(json.dumps(_exact_cache, indent=2, default=str))


def _save_semantic():
    # Serialise numpy arrays back to lists
    serialisable = [
        {**entry, "embedding": entry["embedding"].tolist()}
        for entry in _semantic_store
    ]
    _SEMANTIC_CACHE_FILE.write_text(json.dumps(serialisable, indent=2, default=str))


_load()


# ── Signature ──────────────────────────────────────────────────────────────────
def _signature(service: str, symptoms: str, error_codes: list) -> str:
    key = f"{service}|{sorted(error_codes)}|{symptoms[:120]}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


# ── Cosine similarity ──────────────────────────────────────────────────────────
def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0


# ── Public API ─────────────────────────────────────────────────────────────────
def get_cached(
    service:     str,
    symptoms:    str,
    error_codes: list,
) -> Optional[dict]:
    """
    Two-tier lookup:
      1. Exact match  — instant, zero compute
      2. Semantic match — embed query, cosine vs stored embeddings (same service only)
    Returns (result, hit_type) tuple or None.
    """
    sig = _signature(service, symptoms, error_codes)

    # ── Tier 1: exact ─────────────────────────────────────────────────────────
    if sig in _exact_cache:
        print(f"[ResponseCache] ⚡ Exact hit  ({service})")
        return _exact_cache[sig]

    # ── Tier 2: semantic ──────────────────────────────────────────────────────
    from rag.embedder import embed_one   # lazy import — avoids circular import
    query_text = f"{service} {' '.join(sorted(error_codes))} {symptoms[:200]}"
    query_vec  = np.array(embed_one(query_text))

    best_sim    = 0.0
    best_result = None
    for entry in _semantic_store:
        if entry["service"] != service:
            continue                    # never cross-match different services
        sim = _cosine(query_vec, entry["embedding"])
        if sim > best_sim:
            best_sim    = sim
            best_result = entry["result"]

    if best_sim >= _SEMANTIC_THRESHOLD and best_result is not None:
        print(f"[ResponseCache] 🔍 Semantic hit ({service}) similarity={best_sim:.3f}")
        # Promote to exact cache so next identical call is free
        _exact_cache[sig] = best_result
        _save_exact()
        return best_result

    print(f"[ResponseCache] ✗ Miss ({service}) best_sim={best_sim:.3f}")
    return None


def set_cached(
    service:     str,
    symptoms:    str,
    error_codes: list,
    result:      dict,
):
    """Store in both exact cache and semantic store."""
    sig = _signature(service, symptoms, error_codes)

    # ── Exact store ───────────────────────────────────────────────────────────
    _exact_cache[sig] = result
    _save_exact()

    # ── Semantic store (embed once, store forever) ────────────────────────────
    # Skip if this sig is already in semantic store
    existing_sigs = {e["sig"] for e in _semantic_store}
    if sig not in existing_sigs:
        from rag.embedder import embed_one
        query_text = f"{service} {' '.join(sorted(error_codes))} {symptoms[:200]}"
        embedding  = np.array(embed_one(query_text))
        _semantic_store.append({
            "sig":       sig,
            "service":   service,
            "symptoms":  symptoms[:120],
            "embedding": embedding,
            "result":    result,
        })
        _save_semantic()
        print(f"[ResponseCache] Stored exact+semantic for sig={sig} ({service})")
    else:
        print(f"[ResponseCache] Stored exact only (semantic already exists) sig={sig}")


def cache_stats() -> dict:
    return {
        "response_cache_entries":  len(_exact_cache),
        "semantic_cache_entries":  len(_semantic_store),
        "semantic_threshold":      _SEMANTIC_THRESHOLD,
        "response_cache_file":     str(_CACHE_FILE),
        "semantic_cache_file":     str(_SEMANTIC_CACHE_FILE),
    }


def clear_cache():
    """Dev utility — wipe both caches."""
    global _exact_cache, _semantic_store
    _exact_cache    = {}
    _semantic_store = []
    _CACHE_FILE.unlink(missing_ok=True)
    _SEMANTIC_CACHE_FILE.unlink(missing_ok=True)
    print("[ResponseCache] Both caches cleared.")