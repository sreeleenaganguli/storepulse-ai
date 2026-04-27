"""StorePulse AI — FastAPI application entry point."""
import json, asyncio, logging, base64
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel


from config import MOCK_MODE, AUDIT_FILE, DATA_DIR
from models.schemas import IncidentInput, ConfirmRequest, TriageOutput
from state import AgentState
from graph import compiled_graph
from rag.indexer import startup_index
from rag.redactor import redact_incident
from rag.feedback_loop import save_feedback, build_feedback_context
from rag.embedder import cache_stats as embed_cache_stats
from rag.response_cache import cache_stats as response_cache_stats


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("storepulse")


app = FastAPI(
    title="StorePulse AI",
    description="AI-Assisted Incident Triage Copilot for Store Systems",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Retry request schema ───────────────────────────────────────────────────────
class RetryRequest(BaseModel):
    incident:       IncidentInput
    feedback:       str
    prior_analysis: dict
    attempt_number: int = 2


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    log.info("StorePulse AI starting up...")
    if not MOCK_MODE:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, startup_index)
    else:
        log.info("MOCK_MODE=true — skipping index build")
    log.info("StorePulse AI ready ✓")


# ── Audit log ──────────────────────────────────────────────────────────────────
def _audit(record: dict):
    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps({**record, "ts": datetime.now(timezone.utc).isoformat()}) + "\n")


# ── Base64 file decoder — merges uploaded files into log_snippet ───────────────
def _decode_uploaded_files(incident: IncidentInput) -> IncidentInput:
    file_refs = incident.log_file_reference or []
    if not file_refs:
        return incident

    _LOG_EXTENSIONS  = {".log", ".txt", ".out", ".err"}
    _SKIP_EXTENSIONS = {".md"}          
    _MAX_BYTES       = 500_000                               

    decoded_parts = []
    for file_obj in file_refs:
        name    = (file_obj.get("name", "") or "").lower()
        content = file_obj.get("content", "")
        size    = file_obj.get("size", 0) or 0

        # Guard 1 — skip JSON/JSONL/Markdown (these are seed data, not logs)
        if any(name.endswith(ext) for ext in _SKIP_EXTENSIONS):
            log.info(f"[FileIngest] Skipping seed/data file: {name}")
            continue

        # Guard 2 — skip files too large to be a real incident log
        if size > _MAX_BYTES:
            log.warning(f"[FileIngest] Skipping oversized file: {name} ({size} bytes)")
            continue

        if not content:
            log.warning(f"[FileIngest] {name} — empty content, skipping")
            continue

        try:
            raw_bytes = base64.b64decode(content)

            # Guard 3 — hard size check on decoded bytes
            if len(raw_bytes) > _MAX_BYTES:
                log.warning(f"[FileIngest] Decoded content too large: {name}")
                continue

            file_text = raw_bytes.decode("utf-8", errors="replace").strip()

            decoded_parts.append(f"# File: {name}\n{file_text}")
            log.info(f"[FileIngest] Decoded {name} — {len(file_text)} chars, "
                     f"{file_text.count(chr(10))+1} lines")
        except Exception as e:
            log.warning(f"[FileIngest] Failed to decode {name}: {e}")

    if not decoded_parts:
        return incident

    merged   = "\n\n".join(decoded_parts)
    existing = (incident.log_snippet or "").strip()
    combined = f"{existing}\n\n{merged}".strip() if existing else merged

    return incident.model_copy(update={"log_snippet": combined})


# ── Fallback triage output ─────────────────────────────────────────────────────
def _fallback_output(incident: IncidentInput, error: str, attempt: int, feedback_context: str) -> TriageOutput:
    return TriageOutput(
        incident_id=incident.incident_id,
        incident_summary=f"Automated triage unavailable for {incident.service} (attempt {attempt}). Manual review required.",
        probable_category="unknown",
        root_cause=f"Fallback: graph execution failed — {error}",
        top_causes=["LLM unavailable", "Graph execution error"],
        conflicts=[],
        action_plan=[{
            "step": 1,
            "action": "Manual triage required — automated analysis failed.",
            "rationale": "Graph execution failed. Review logs and runbooks manually.",
            "is_bcp": False,
        }],
        escalation_path="Escalate to on-call engineer for manual triage.",
        handoff_note=f"Automated triage failed on attempt {attempt}. Error: {error}. Feedback: {feedback_context or 'None'}",
        confidence=0.0,
        confidence_rationale="Fallback response — no automated analysis performed.",
        reasoning_trace=f"Graph error: {error}\n\nPrior feedback:\n{feedback_context or 'None'}",
        retrieved_runbooks=[],
        similar_incidents=[],
        raw_logs=[],
        entities={},
        validation_passed=False,
        validation_notes=["Fallback response — validation skipped."],
    )


# ── SSE triage stream (shared core) ───────────────────────────────────────────
async def _stream_triage(
    incident:         IncidentInput,
    feedback_context: str = "",
    attempt_number:   int = 1,
) -> AsyncGenerator[dict, None]:

    _audit({
        "event":       "triage_start",
        "incident_id": incident.incident_id,
        "service":     incident.service,
        "severity":    incident.severity,
        "attempt":     attempt_number,
    })

    # ── Step 1: Redact PII from all text fields ────────────────────────────────
    redacted_fields = redact_incident(incident.model_dump())
    incident_clean  = incident.model_copy(update={
        k: redacted_fields[k]
        for k in redacted_fields
        if hasattr(incident, k)
    })

    # ── Step 2: Decode uploaded base64 files → merge into log_snippet ─────────
    incident_clean = _decode_uploaded_files(incident_clean)

    if MOCK_MODE:
        from mock.responses import get_mock_events
        events = get_mock_events(incident_clean)
        for evt in events:
            yield {"event": evt["type"], "data": json.dumps(evt)}
            await asyncio.sleep(0.7)
        _audit({"event": "triage_complete_mock", "incident_id": incident.incident_id})
        return

    if feedback_context:
        yield {
            "event": "feedback_context",
            "data":  json.dumps({
                "type":    "feedback_context",
                "attempt": attempt_number,
                "context": feedback_context,
            })
        }
        await asyncio.sleep(0.05)

    initial_state: AgentState = {
        "incident":            incident_clean,   # ← log_snippet now has decoded file text
        "entities":            {}, "log_timeline": [], "severity_path": "standard",
        "ingestor_done":       False,
        "runbook_chunks":      [], "similar_incidents": [], "raw_logs": [],
        "retrieval_max_score": 0.0, "retrieval_attempts": 0,
        "researcher_done":     False,
        "conflicts":           [], "root_cause": "", "probable_category": "unknown",
        "top_causes":          [], "confidence": 0.0, "confidence_rationale": "",
        "reasoning_trace":     "", "needs_reretrieval": False, "reretrieval_query": "",
        "diagnostician_done":  False,
        "action_plan":         [], "escalation_path": "", "handoff_note": "",
        "incident_summary":    "", "planner_done": False,
        "validation_passed":   False, "validation_notes": [],
        "stream_events":       [],
        "feedback_context":    feedback_context,
        "attempt_number":      attempt_number,
    }

    sent_event_count = 0
    final_state      = None

    try:
        async for state_chunk in compiled_graph.astream(initial_state, stream_mode="values"):
            final_state = state_chunk
            new_events  = state_chunk.get("stream_events", [])
            for evt in new_events[sent_event_count:]:
                yield {"event": evt.get("type", "agent_step"), "data": json.dumps(evt)}
                await asyncio.sleep(0.05)
            sent_event_count = len(new_events)

    except Exception as e:
        log.error(f"Graph execution error (attempt {attempt_number}): {e}")
        _audit({
            "event":       "triage_error",
            "incident_id": incident.incident_id,
            "attempt":     attempt_number,
            "error":       str(e),
        })
        fallback     = _fallback_output(incident_clean, str(e), attempt_number, feedback_context)
        fallback_evt = {"type": "final_result", "is_fallback": True, "data": fallback.model_dump()}
        yield {"event": "final_result", "data": json.dumps(fallback_evt)}
        return

    if final_state:
        output = TriageOutput(
            incident_id=incident.incident_id,
            incident_summary=final_state.get("incident_summary", ""),
            probable_category=final_state.get("probable_category", "unknown"),
            root_cause=final_state.get("root_cause", ""),
            top_causes=final_state.get("top_causes", []),
            conflicts=final_state.get("conflicts", []),
            action_plan=final_state.get("action_plan", []),
            escalation_path=final_state.get("escalation_path", ""),
            handoff_note=final_state.get("handoff_note", ""),
            confidence=final_state.get("confidence", 0.0),
            confidence_rationale=final_state.get("confidence_rationale", ""),
            reasoning_trace=final_state.get("reasoning_trace", ""),
            retrieved_runbooks=final_state.get("runbook_chunks", []),
            similar_incidents=final_state.get("similar_incidents", []),
            raw_logs=final_state.get("raw_logs", []),
            entities=final_state.get("entities", {}),
            validation_passed=final_state.get("validation_passed", False),
            validation_notes=final_state.get("validation_notes", []),
        )
        final_evt = {
            "type":        "final_result",
            "is_fallback": False,
            "attempt":     attempt_number,
            "data":        output.model_dump(),
        }
        yield {"event": "final_result", "data": json.dumps(final_evt)}
        _audit({
            "event":             "triage_complete",
            "incident_id":       incident.incident_id,
            "attempt":           attempt_number,
            "category":          output.probable_category,
            "confidence":        output.confidence,
            "validation_passed": output.validation_passed,
        })


# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.post("/triage/stream")
async def triage_stream(incident: IncidentInput):
    return EventSourceResponse(_stream_triage(incident))


@app.post("/triage/retry")
async def triage_retry(req: RetryRequest):
    save_feedback(req.incident.incident_id, req.prior_analysis, req.feedback)
    feedback_context = build_feedback_context(req.incident.incident_id)
    _audit({
        "event":       "triage_retry",
        "incident_id": req.incident.incident_id,
        "attempt":     req.attempt_number,
        "feedback":    req.feedback,
    })
    return EventSourceResponse(
        _stream_triage(req.incident, feedback_context, req.attempt_number)
    )


@app.get("/health")
async def health():
    from rag.indexer import _raw_runbook_chunks, _raw_incidents
    return {
        "status":    "ok",
        "mock_mode": MOCK_MODE,
        "runbooks":  len(_raw_runbook_chunks),
        "incidents": len(_raw_incidents),
        "version":   "1.0.0",
        "cache":     {
            **embed_cache_stats(),
            **response_cache_stats(),
        },
    }


@app.get("/metrics")
async def metrics():
    from pathlib import Path
    from rag.response_cache import cache_stats as rc_stats
    from rag.embedder import cache_stats as ec_stats

    audit_lines = []
    if Path(AUDIT_FILE).exists():
        audit_lines = [l for l in open(AUDIT_FILE).readlines() if l.strip()]

    events    = [json.loads(l) for l in audit_lines]
    completed = [e for e in events if e.get("event") == "triage_complete"]
    retries   = [e for e in events if e.get("event") == "triage_retry"]
    errors    = [e for e in events if e.get("event") == "triage_error"]

    category_breakdown = {}
    for e in completed:
        cat = e.get("category", "unknown")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    avg_confidence = (
        round(sum(e.get("confidence", 0) for e in completed) / len(completed), 2)
        if completed else 0.0
    )
    validation_pass_rate = (
        f"{round(sum(1 for e in completed if e.get('validation_passed')) / len(completed) * 100)}%"
        if completed else "N/A"
    )

    return {
        "pipeline": {
            "total_triages":        len(completed),
            "total_retries":        len(retries),
            "total_errors":         len(errors),
            "avg_confidence":       avg_confidence,
            "validation_pass_rate": validation_pass_rate,
            "category_breakdown":   category_breakdown,
        },
        "cache": {
            **rc_stats(),
            **ec_stats(),
        },
        "system": {
            "mock_mode": MOCK_MODE,
            "version":   "1.0.0",
        }
    }


@app.get("/incidents")
async def list_incidents(limit: int = 20, offset: int = 0):
    path      = DATA_DIR / "incidents.jsonl"
    incidents = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                incidents.append(json.loads(line))
    return {"total": len(incidents), "incidents": incidents[offset:offset + limit]}


@app.post("/confirm")
async def confirm_actions(req: ConfirmRequest):
    _audit({
        "event":           "human_confirm",
        "incident_id":     req.incident_id,
        "confirmed_steps": req.confirmed_steps,
        "rejected_steps":  req.rejected_steps,
    })
    return {
        "status":          "confirmed",
        "incident_id":     req.incident_id,
        "confirmed_count": len(req.confirmed_steps),
        "rejected_count":  len(req.rejected_steps),
        "receipt":         f"Actions {req.confirmed_steps} confirmed by engineer at {datetime.now(timezone.utc).isoformat()}",
    }
