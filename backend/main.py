"""StorePulse AI â€” FastAPI application entry point.
Exposes SSE triage stream, health check, incident browser, and confirm endpoint."""
import json, asyncio, logging
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from config import MOCK_MODE, AUDIT_FILE, DATA_DIR
from models.schemas import IncidentInput, ConfirmRequest, TriageOutput
from state import AgentState
from graph import compiled_graph
from rag.indexer import startup_index

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

# â”€â”€ Startup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.on_event("startup")
async def startup():
    log.info("StorePulse AI starting up...")
    if not MOCK_MODE:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, startup_index)
    else:
        log.info("MOCK_MODE=true â€” skipping index build")
    log.info("StorePulse AI ready âœ“")

# â”€â”€ Audit log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _audit(record: dict):
    with open(AUDIT_FILE, "a") as f:
        f.write(json.dumps({**record, "ts": datetime.now(timezone.utc).isoformat()}) + "")

# â”€â”€ SSE triage stream â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async def _stream_triage(incident: IncidentInput) -> AsyncGenerator[dict, None]:
    _audit({"event": "triage_start", "incident_id": incident.incident_id,
            "service": incident.service, "severity": incident.severity})

    if MOCK_MODE:
        from mock.responses import get_mock_events
        events = get_mock_events(incident)
        for evt in events:
            yield {"event": evt["type"], "data": json.dumps(evt)}
            await asyncio.sleep(0.7)
        _audit({"event": "triage_complete_mock", "incident_id": incident.incident_id})
        return

    # Build initial state
    initial_state: AgentState = {
        "incident": incident,
        "entities": {}, "log_timeline": [], "severity_path": "standard",
        "ingestor_done": False,
        "runbook_chunks": [], "similar_incidents": [], "raw_logs": [],
        "retrieval_max_score": 0.0, "retrieval_attempts": 0,
        "researcher_done": False,
        "conflicts": [], "root_cause": "", "probable_category": "unknown",
        "top_causes": [], "confidence": 0.0, "confidence_rationale": "",
        "reasoning_trace": "", "needs_reretrieval": False, "reretrieval_query": "",
        "diagnostician_done": False,
        "action_plan": [], "escalation_path": "", "handoff_note": "",
        "incident_summary": "", "planner_done": False,
        "validation_passed": False, "validation_notes": [],
        "stream_events": [],
    }

    sent_event_count = 0
    final_state = None

    try:
        async for state_chunk in compiled_graph.astream(initial_state, stream_mode="values"):
            final_state = state_chunk
            new_events = state_chunk.get("stream_events", [])
            for evt in new_events[sent_event_count:]:
                yield {"event": evt.get("type", "agent_step"), "data": json.dumps(evt)}
                await asyncio.sleep(0.05)
            sent_event_count = len(new_events)
    except Exception as e:
        log.error(f"Graph execution error: {e}")
        err_evt = {"type": "error", "message": str(e)}
        yield {"event": "error", "data": json.dumps(err_evt)}
        _audit({"event": "triage_error", "incident_id": incident.incident_id, "error": str(e)})
        return

    if final_state:
        # Build final TriageOutput
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
        final_evt = {"type": "final_result", "data": output.model_dump()}
        yield {"event": "final_result", "data": json.dumps(final_evt)}
        _audit({"event": "triage_complete", "incident_id": incident.incident_id,
                "category": output.probable_category, "confidence": output.confidence,
                "validation_passed": output.validation_passed})

# â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.post("/triage/stream")
async def triage_stream(incident: IncidentInput):
    return EventSourceResponse(_stream_triage(incident))

@app.get("/health")
async def health():
    from rag.indexer import _raw_runbook_chunks, _raw_incidents
    return {
        "status": "ok",
        "mock_mode": MOCK_MODE,
        "runbooks": len(_raw_runbook_chunks),
        "incidents": len(_raw_incidents),
        "version": "1.0.0"
    }

@app.get("/incidents")
async def list_incidents(limit: int = 20, offset: int = 0):
    path = DATA_DIR / "incidents.jsonl"
    incidents = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                incidents.append(json.loads(line))
    return {"total": len(incidents), "incidents": incidents[offset:offset+limit]}

@app.post("/confirm")
async def confirm_actions(req: ConfirmRequest):
    _audit({
        "event": "human_confirm",
        "incident_id": req.incident_id,
        "confirmed_steps": req.confirmed_steps,
        "rejected_steps": req.rejected_steps
    })
    return {
        "status": "confirmed",
        "incident_id": req.incident_id,
        "confirmed_count": len(req.confirmed_steps),
        "rejected_count": len(req.rejected_steps),
        "receipt": f"Actions {req.confirmed_steps} confirmed by engineer at {datetime.now(timezone.utc).isoformat()}"
    }
