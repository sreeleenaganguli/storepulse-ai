# mock/responses.py
from models.schemas import (TriageOutput, ActionStep, RunbookChunk,     # ← RunbookChunk
                             SimilarIncident, ConflictItem)

_PAYMENT_TIMEOUT = TriageOutput(
    incident_id="DEMO-INC-001",
    incident_summary=(
        "18 self-checkout units are failing at payment confirmation stage due to "
        "repeated gateway connection timeouts (GW_TIMEOUT_503). Customers cannot "
        "complete basket payment; checkout throughput is severely impacted."
    ),
    probable_category="payment_timeout",
    root_cause="Payment gateway is unreachable from store network — all retry attempts exhausted after 30s timeout on pos-payment service.",
    top_causes=[
        "Payment gateway upstream outage or maintenance window (highest probability — matches GW_TIMEOUT_503 across all terminals)",
        "Store network latency spike causing TCP connections to gateway to time out before response",
        "SSL certificate rotation on gateway causing TLS handshake failures"
    ],
    conflicts=[],
    action_plan=[
        ActionStep(step=1, action="Activate cash-only checkout mode on all tills immediately via Store Admin Console → POS Settings → Emergency Cash Mode. Notify all cashiers.", rationale="Sev1 business continuity — unblocks customer queues within 2 minutes while root cause is investigated.", is_bcp=True, requires_confirm=True),
        ActionStep(step=2, action="Check payment gateway status page at https://gateway-status.internal and confirm with payment provider incident channel #payment-ops.", rationale="Determines if outage is provider-side (no local fix possible) or local network issue (actionable).", is_bcp=False, requires_confirm=True),
        ActionStep(step=3, action="Switch 2 terminals to fallback payment processor via POS Admin → Payment Config → Provider → Fallback. Test a card transaction.", rationale="Fallback processor bypasses primary gateway — validates if issue is gateway-specific or network-wide.", is_bcp=False, requires_confirm=True),
        ActionStep(step=4, action="Capture gateway connectivity trace: run 'curl -v https://gateway.internal/health' from store network switch and share output in incident channel.", rationale="TCP-level trace distinguishes DNS failure, connection refused, and timeout — focuses L2 investigation.", is_bcp=False, requires_confirm=True),
        ActionStep(step=5, action="Escalate to L2 Integration Support if fallback processor also fails or gateway unreachable for >15 minutes. Use template: 'Sev1 GW_TIMEOUT_503 on {store_id}, {affected_units} terminals, fallback tested: {result}'.", rationale="L2 has gateway configuration access and can perform emergency routing changes.", is_bcp=False, requires_confirm=True),
    ],
    escalation_path="L1 Store Support (immediate) → L2 Integration Support at +15min if fallback fails → L3 Platform Engineering + Payment Provider TAM at +30min if gateway confirms outage",
    handoff_note=(
    "INC OPEN: GW_TIMEOUT_503 on 18 SCO units. Cash-only mode activated.\n"
    "DONE: Fallback processor tested — also failing.\n"
    "PENDING: L2 Integration Support investigating network path to gateway."),
DONE: Fallback processor tested — also failing. Gateway unreachable from store network.
PENDING: L2 Integration Support investigating network path to gateway.",
    confidence=0.91,
    confidence_rationale="GW_TIMEOUT_503 matches exactly the payment_timeout runbook pattern. 18/18 terminals affected confirms upstream gateway issue rather than terminal-specific fault. Three similar past incidents all resolved via gateway failover.",
    reasoning_trace="Log pattern GW_TIMEOUT_503 on pos-payment service is the canonical gateway timeout signature. Error appears on all 18 terminals simultaneously — rules out device-specific fault. No NET_LINK_FLAP codes present — rules out store network. Confidence is high (0.91) as this is the textbook pattern.",
    retrieved_runbooks=[
        RetrievedChunk(id="payment_timeout_chunk_0", filename="payment_timeout.md", pattern_id="payment_timeout", text="# Payment Gateway Timeout — SCO/POS
## Symptoms
- Repeated GW_TIMEOUT_503 in pos-payment logs
- Customer basket stuck at payment confirmation
## First Actions
1. Check gateway status page
2. Switch terminal to fallback payment mode
3. Escalate to integration team if >5 terminals affected", semantic_score=0.94, keyword_score=0.98, combined_score=0.96),
        RetrievedChunk(id="store_network_flap_chunk_1", filename="store_network_flap.md", pattern_id="store_network_flap", text="## Network Flap Impact on Payment
Network instability can cause gateway timeouts. Check for NET_LINK_FLAP codes in store-network logs.", semantic_score=0.71, keyword_score=0.45, combined_score=0.61),
        RetrievedChunk(id="payment_timeout_chunk_1", filename="payment_timeout.md", pattern_id="payment_timeout", text="## Escalation Path
If >5 terminals affected and fallback fails:
1. Page L2 Integration on-call
2. Open bridge with payment provider
3. Document terminal IDs and error timestamps", semantic_score=0.88, keyword_score=0.76, combined_score=0.83),
    ],
    similar_incidents=[
        SimilarIncident(id="INC-POS-20241108-0012", service="pos-payment", severity="Sev1", symptoms="Payment gateway unreachable on all 24 POS tills — GW_TIMEOUT_503 after 30s", resolution_code="PAYMENT_TIMEOUT_GATEWAY", similarity=0.97),
        SimilarIncident(id="INC-SCO-20241022-0031", service="sco-ui", severity="Sev2", symptoms="14 SCO units failing at card payment — gateway timeout", resolution_code="PAYMENT_TIMEOUT_GATEWAY", similarity=0.93),
        SimilarIncident(id="INC-POS-20240930-0007", service="pos-payment", severity="Sev2", symptoms="Intermittent payment failures — 8 tills affected — retry exhausted", resolution_code="FALLBACK_PROCESSOR_ACTIVATED", similarity=0.88),
    ],
    raw_logs=[
        {"time":"2024-11-15T13:21:44Z","service":"pos-payment","level":"ERROR","message":"Gateway connection timed out after 30s; retry 3/3 failed","error_code":"GW_TIMEOUT_503"},
        {"time":"2024-11-15T13:21:47Z","service":"pos-payment","level":"ERROR","message":"Gateway connection timed out after 30s; retry 3/3 failed","error_code":"GW_TIMEOUT_503"},
        {"time":"2024-11-15T13:22:01Z","service":"sco-ui","level":"WARN","message":"Payment service returning 503 — customer basket held","error_code":"PAYMENT_SVC_UNAVAILABLE"},
        {"time":"2024-11-15T13:22:15Z","service":"pos-payment","level":"ERROR","message":"Circuit breaker OPEN — all gateway connections halted","error_code":"GW_TIMEOUT_503"},
    ],
    entities={"store_id":"STORE-104","terminal_ids":["SCO-01","SCO-02","SCO-03","SCO-18"],"error_codes":["GW_TIMEOUT_503","PAYMENT_SVC_UNAVAILABLE"],"affected_count":18,"primary_error_code":"GW_TIMEOUT_503"},
    validation_passed=True,
    validation_notes=[]
)

MOCK_RESPONSES = {
    "payment_timeout": _PAYMENT_TIMEOUT,
}

def get_mock_events(incident_input) -> list:
    """Yields SSE events with realistic delays for demo."""
    resp = MOCK_RESPONSES.get("payment_timeout", _PAYMENT_TIMEOUT)
    resp.incident_id = incident_input.incident_id

    events = [
        {"type":"agent_step","agent":"ingestor","status":"running","message":"Parsing incident entities and log structure..."},
        {"type":"agent_step","agent":"ingestor","status":"done","message":f"Extracted {len(resp.entities.get('error_codes',[]))} error codes, {len(resp.entities.get('terminal_ids',[]))} terminal IDs, Store {resp.entities.get('store_id')}","data":{"entities":resp.entities}},
        {"type":"agent_step","agent":"researcher","status":"running","message":"Running hybrid retrieval (attempt 1)..."},
        {"type":"agent_step","agent":"researcher","status":"done","message":f"Top match: {resp.retrieved_runbooks[0].filename} (96% combined score) — 3 similar past incidents found","data":{"top_runbook":resp.retrieved_runbooks[0].filename,"max_score":0.96}},
        {"type":"agent_step","agent":"diagnostician","status":"running","message":"Running conflict detection and root cause analysis..."},
        {"type":"agent_step","agent":"diagnostician","status":"done","message":f"Root cause: {resp.root_cause[:70]} | Confidence: 91% | Model: DeepSeek-R1","data":{"probable_category":resp.probable_category,"confidence":0.91,"conflicts_count":0}},
        {"type":"agent_step","agent":"action_planner","status":"running","message":"Generating structured action plan..."},
        {"type":"agent_step","agent":"action_planner","status":"done","message":"Generated 5-step action plan — BCP step enforced as Action 1","data":{"steps":5,"bcp_enforced":True}},
        {"type":"agent_step","agent":"validator","status":"running","message":"Running validation checks..."},
        {"type":"validated","agent":"validator","status":"done","message":"✅ All checks passed — triage complete","data":{"passed":True}},
        {"type":"final_result","data":resp.model_dump()},
    ]
    return events
