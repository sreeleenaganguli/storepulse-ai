"""ChromaDB + BM25 indexer. Fixes Python <3.10 union type annotation."""
from __future__ import annotations
import json, re
from pathlib import Path
from typing import Optional, List, Dict, Any

import chromadb
from chromadb.config import Settings

from config import DATA_DIR, CHROMA_DIR, CHUNK_SIZE, CHUNK_OVERLAP, TOP_K_RUNBOOKS, TOP_K_INCIDENTS
from rag.embedder import embed, embed_one
from rag.bm25 import BM25Index
from models.schemas import RunbookChunk, SimilarIncident

# ── globals ───────────────────────────────────────────────────────────────────
_chroma_client: Optional[chromadb.PersistentClient] = None
_runbook_collection = None
_incident_collection = None
_bm25_runbooks: Optional[BM25Index] = None
_bm25_incidents: Optional[BM25Index] = None
_raw_runbook_chunks: List[Dict[str, Any]] = []
_raw_incidents: List[Dict[str, Any]] = []
_log_index: Dict[str, List[Dict[str, Any]]] = {}


def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += size - overlap
    return chunks


def startup_index():
    global _chroma_client, _runbook_collection, _incident_collection
    global _bm25_runbooks, _bm25_incidents, _raw_runbook_chunks, _raw_incidents, _log_index

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    _chroma_client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False)
    )

    _runbook_collection  = _chroma_client.get_or_create_collection("runbooks")
    _incident_collection = _chroma_client.get_or_create_collection("incidents")

    # ── Index runbooks ────────────────────────────────────────────────────────
    runbook_dir = DATA_DIR / "runbooks"
    chunk_texts, chunk_metas, chunk_ids = [], [], []

    for md_file in sorted(runbook_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        pattern_id = md_file.stem
        for ci, chunk in enumerate(_chunk_text(text)):
            cid = f"{pattern_id}_chunk_{ci}"
            chunk_ids.append(cid)
            chunk_texts.append(chunk)
            chunk_metas.append({"filename": md_file.name, "pattern_id": pattern_id, "chunk_index": ci})
            _raw_runbook_chunks.append({"id": cid, "text": chunk, "filename": md_file.name, "pattern_id": pattern_id})

    if chunk_texts and _runbook_collection.count() == 0:
        vecs = embed(chunk_texts)
        _runbook_collection.add(ids=chunk_ids, embeddings=vecs,
                                documents=chunk_texts, metadatas=chunk_metas)

    _bm25_runbooks = BM25Index([c["text"] for c in _raw_runbook_chunks])
    print(f"[Indexer] Loaded {len(_raw_runbook_chunks)} runbook chunks")

    # ── Index incidents ───────────────────────────────────────────────────────
    inc_file = DATA_DIR / "incidents.jsonl"
    inc_texts, inc_ids, inc_metas = [], [], []

    for line in inc_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        inc = json.loads(line)
        if inc.get("resolution_code"):
            _raw_incidents.append(inc)
            inc_texts.append(inc.get("symptoms", ""))
            inc_ids.append(inc["id"])
            inc_metas.append({
                "service": inc.get("service", ""),
                "severity": inc.get("severity", ""),
                "resolution_code": inc.get("resolution_code", ""),
                "pattern": inc.get("pattern", ""),
            })

    if inc_texts and _incident_collection.count() == 0:
        vecs = embed(inc_texts)
        _incident_collection.add(ids=inc_ids, embeddings=vecs,
                                  documents=inc_texts, metadatas=inc_metas)

    _bm25_incidents = BM25Index(inc_texts)
    print(f"[Indexer] Loaded {len(_raw_incidents)} resolved incidents")

    # ── Build log index ───────────────────────────────────────────────────────
    log_file = DATA_DIR / "service_logs.json"
    if log_file.exists():
        all_logs = json.loads(log_file.read_text(encoding="utf-8"))
        for log in all_logs:
            iid = log.get("incident_id", "")
            _log_index.setdefault(iid, []).append(log)
    print(f"[Indexer] Log index built for {len(_log_index)} incidents")


def _cosine(a: List[float], b: List[float]) -> float:
    import numpy as np
    a, b = np.array(a), np.array(b)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def hybrid_search_runbooks(query: str, top_k: int = TOP_K_RUNBOOKS) -> List[RunbookChunk]:
    if not _runbook_collection or not _raw_runbook_chunks:
        return []

    q_vec = embed_one(query)
    sem_results = _runbook_collection.query(query_embeddings=[q_vec], n_results=min(top_k*3, len(_raw_runbook_chunks)))
    sem_ids   = sem_results["ids"][0]
    sem_dists = sem_results["distances"][0]
    sem_scores = {sid: 1 - d for sid, d in zip(sem_ids, sem_dists)}

    # ✅ FIX: .search() returns List[Tuple[int, float]] — unpack properly
    kw_results = _bm25_runbooks.search(query, top_k=len(_raw_runbook_chunks))
    kw_scores = {_raw_runbook_chunks[idx]["id"]: score for idx, score in kw_results}

    all_ids = set(sem_scores) | set(kw_scores)
    combined = {cid: 0.6 * sem_scores.get(cid, 0.0) + 0.4 * kw_scores.get(cid, 0.0)
                for cid in all_ids}
    top_ids = sorted(combined, key=lambda x: combined[x], reverse=True)[:top_k]

    chunks = []
    for cid in top_ids:
        meta = next((c for c in _raw_runbook_chunks if c["id"] == cid), None)
        if meta:
            chunks.append(RunbookChunk(
                id=cid,
                text=meta["text"],
                filename=meta["filename"],
                pattern_id=meta["pattern_id"],
                semantic_score=round(sem_scores.get(cid, 0.0), 3),
                keyword_score=round(kw_scores.get(cid, 0.0), 3),
                combined_score=round(combined[cid], 3),
            ))
    return chunks


def hybrid_search_incidents(query: str, top_k: int = TOP_K_INCIDENTS) -> List[SimilarIncident]:
    if not _incident_collection or not _raw_incidents:
        return []

    q_vec = embed_one(query)
    results = _incident_collection.query(query_embeddings=[q_vec], n_results=min(top_k*2, len(_raw_incidents)))
    ids   = results["ids"][0]
    dists = results["distances"][0]
    scores = {iid: round(1 - d, 3) for iid, d in zip(ids, dists)}

    out = []
    for iid in ids[:top_k]:
        inc = next((i for i in _raw_incidents if i["id"] == iid), None)
        if inc:
            out.append(SimilarIncident(
                id=iid,
                service=inc.get("service", ""),
                severity=inc.get("severity", ""),
                symptoms=inc.get("symptoms", ""),
                resolution_code=inc.get("resolution_code", ""),
                similarity=scores.get(iid, 0.0),
            ))
    return out


def get_logs_for_incident(incident_id: str) -> List[Dict[str, Any]]:
    return _log_index.get(incident_id, [])


def get_stats() -> Dict[str, int]:
    return {
        "runbook_chunks": len(_raw_runbook_chunks),
        "incidents_indexed": len(_raw_incidents),
        "log_entries": sum(len(v) for v in _log_index.values()),
    }