"""Researcher Agent — hybrid BM25 + semantic search. No LLM calls."""
from __future__ import annotations
from config import TOP_K_RUNBOOKS, TOP_K_INCIDENTS, RETRIEVAL_MIN_SCORE, MAX_RETRIEVAL_ATTEMPTS
from state import AgentState
from rag.indexer import hybrid_search_runbooks, hybrid_search_incidents, get_logs_for_incident

def run_researcher(state: AgentState) -> dict:
    inc      = state["incident"]
    entities = state.get("entities", {})
    attempt  = state.get("retrieval_attempts", 0)
    requery  = state.get("reretrieval_query", "")

    event_start = {"type":"agent_step","agent":"researcher","status":"running",
                   "message":f"Hybrid retrieval — attempt {attempt+1}..."}

    # Build query
    if requery:
        query = requery
    else:
        error_codes = " ".join(entities.get("error_codes", []))
        keywords    = " ".join(entities.get("keywords", [])[:5])
        query = f"{inc.service} {inc.symptoms[:120]} {error_codes} {keywords}".strip()

    runbook_chunks   = hybrid_search_runbooks(query, TOP_K_RUNBOOKS)
    similar_incidents = hybrid_search_incidents(f"{inc.service} {inc.symptoms[:120]}", TOP_K_INCIDENTS)
    raw_logs         = get_logs_for_incident(inc.incident_id or "")

    top_score = runbook_chunks[0].combined_score if runbook_chunks else 0.0
    low_confidence = top_score < RETRIEVAL_MIN_SCORE and attempt < MAX_RETRIEVAL_ATTEMPTS - 1

    event_done = {
        "type": "agent_step", "agent": "researcher", "status": "done",
        "message": (
            f"Retrieved {len(runbook_chunks)} runbook chunks "
            f"(top score: {round(top_score*100)}%) · "
            f"{len(similar_incidents)} similar incidents"
        )
    }

    return {
        "runbook_chunks": runbook_chunks,
        "similar_incidents": similar_incidents,
        "raw_logs": raw_logs or state.get("raw_logs", []),
        "retrieval_attempts": attempt + 1,
        "low_retrieval_confidence": low_confidence,
        "researcher_done": True,
        "stream_events": [event_start, event_done],
    }
