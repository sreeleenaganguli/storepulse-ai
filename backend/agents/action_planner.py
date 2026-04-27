"""Action Planner Agent — new google.genai SDK."""
from __future__ import annotations
import json, re, logging
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, MODEL_PLANNER
from state import AgentState

log = logging.getLogger("storepulse.planner")  # FIX 1: add logger

_client = genai.Client(api_key=GEMINI_API_KEY)

_SYSTEM = """You are an expert store-systems incident commander. Write clear 5-step action plans.
Return ONLY valid JSON:
{
  "action_plan": [{"step":1,"action":"specific action","rationale":"why","is_bcp":false}],
  "escalation_path": "who to call, when, via what channel",
  "handoff_note": "4-6 line shift handoff summary",
  "incident_summary": "one paragraph plain-English summary"
}
Rules: exactly 5 steps. All advisory — never auto-executed. BCP step must be step 1 if flagged.
IMPORTANT: Each action must be specific to the incident category, error codes, and symptoms provided.
Do NOT use generic steps like "Check service health" or "Review logs" — use the runbook and diagnosis context."""

_BCP_STEP = {
    "step": 1,
    "action": "Immediately switch all affected payment terminals to standalone/offline mode to unblock customer checkout.",
    "rationale": "Sev1 payment impact — business continuity. Customers must not be left unable to pay.",
    "is_bcp": True,
}


def run_action_planner(state: AgentState) -> dict:
    inc          = state["incident"]
    root_cause   = state.get("root_cause", "Unknown")
    top_causes   = state.get("top_causes", [])
    category     = state.get("probable_category", "unknown")
    confidence   = state.get("confidence", 0.5)
    chunks       = state.get("runbook_chunks", [])
    similar      = state.get("similar_incidents", [])
    conflicts    = state.get("conflicts", [])
    prior_events = state.get("stream_events", [])
    entities     = state.get("entities", {})  # FIX 2: pull entities for error codes

    feedback_context = state.get("feedback_context", "")
    attempt_number   = state.get("attempt_number", 1)

    # FIX 3: log what the planner is receiving so you can debug
    log.info(
        f"[ActionPlanner] Starting — category={category} confidence={round(confidence*100)}% "
        f"model={MODEL_PLANNER} chunks={len(chunks)} similar={len(similar)} "
        f"error_codes={entities.get('error_codes', [])} attempt={attempt_number}"
    )

    event_start = {
        "type": "agent_step", "agent": "action_planner", "status": "running",
        "message": f"Generating 5-step action plan (attempt {attempt_number})...",
    }

    force_bcp = (inc.severity == "Sev1" and
                 any(kw in inc.symptoms.lower() for kw in ["payment", "checkout", "pos", "basket"]))

    runbook_ctx  = "\n\n".join(f"[{c.filename}]\n{c.text[:800]}" for c in chunks)
    similar_ctx  = "\n".join(f"- {s.id} resolved by: {s.resolution_code}" for s in similar)
    conflict_ctx = "\n".join(f"- {c.log_error_code}: {c.interpretation}" for c in conflicts) or "(none)"

    # FIX 4: include error codes and raw log timeline in the prompt
    error_codes  = entities.get("error_codes", [])
    severity_path = entities.get("severity_path", "")
    log_timeline  = state.get("log_timeline", [])
    timeline_ctx  = "\n".join(
        f"  {e.get('time','')} [{e.get('level','')}] {e.get('service','')} — {e.get('message','')} ({e.get('error_code','')})"
        for e in log_timeline[:10]  # top 10 log lines for context
    ) or "(no logs provided)"

    prompt = f"""INCIDENT: {inc.service} / {inc.severity}
Incident ID: {inc.incident_id or "N/A"}
Symptoms: {inc.symptoms}
Root Cause: {root_cause}
Category: {category} | Confidence: {round(confidence * 100)}%
Error Codes Detected: {", ".join(error_codes) if error_codes else "none"}
Severity Path: {severity_path or "standard"}
Top Causes:
{chr(10).join(f"{i+1}. {c}" for i, c in enumerate(top_causes)) or "  (none identified)"}
Conflicts: {conflict_ctx}
BCP REQUIRED: {"YES — step 1 MUST be the BCP action exactly as specified" if force_bcp else "NO"}

LOG TIMELINE (most recent errors):
{timeline_ctx}

RUNBOOKS (use these for specific actions):
{runbook_ctx or "(no runbooks retrieved)"}

SIMILAR INCIDENTS RESOLVED BY:
{similar_ctx or "(none)"}
{f"{chr(10)}{feedback_context}" if feedback_context else ""}

INSTRUCTIONS:
- Write 5 concrete actions specific to {category} and error codes {error_codes}
- Reference the runbook steps above directly — do not invent generic steps
- Each action must name the specific service, error code, or runbook step it addresses
- Rationale must explain WHY this specific action for this specific incident
Return JSON only."""

    is_llm_fallback = False  # FIX 5: track whether LLM was used

    try:
        log.info(f"[ActionPlanner] Calling model: {MODEL_PLANNER}")
        resp = _client.models.generate_content(
            model=MODEL_PLANNER,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM,
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        log.info(f"[ActionPlanner] LLM response received — {len(resp.text)} chars")

        raw    = re.sub(r"^```(?:json)?\s*", "", resp.text.strip())
        raw    = re.sub(r"\s*```$", "", raw)
        result = json.loads(raw)

        log.info(f"[ActionPlanner] Plan parsed — {len(result.get('action_plan', []))} steps")

    except Exception as e:
        # FIX 6: log the actual error — was silently swallowed before
        log.error(f"[ActionPlanner] LLM call FAILED: {type(e).__name__}: {e}")
        is_llm_fallback = True

        # FIX 7: fallback plan is now category-aware instead of always generic
        fallback_actions = _category_fallback(category, inc, root_cause, error_codes)
        result = {
            "action_plan":      fallback_actions,
            "escalation_path":  f"Escalate to Integration Support → Store Ops Manager if >{15}min unresolved.",
            "handoff_note":     f"Incident {inc.incident_id}: {category}. Root: {root_cause}. LLM unavailable — rule-based fallback used.",
            "incident_summary": f"Store system incident: {inc.symptoms}. Detected pattern: {category}.",
        }

    if force_bcp:
        plan = result.get("action_plan", [])
        if plan:
            plan[0] = {**plan[0], **_BCP_STEP}
        result["action_plan"] = plan

    return {
        "action_plan":      result.get("action_plan", []),
        "escalation_path":  result.get("escalation_path", ""),
        "handoff_note":     result.get("handoff_note", ""),
        "incident_summary": result.get("incident_summary", inc.symptoms),
        "planner_done":     True,
        "stream_events":    prior_events + [
            event_start,
            {
                "type":             "agent_step",
                "agent":            "action_planner",
                "status":           "done",
                "message":          f"Plan ready — BCP enforced: {force_bcp}",
                "is_llm_fallback":  is_llm_fallback,  # FIX 8: surface fallback to frontend
            }
        ],
    }


# FIX 9: category-aware fallback so even without LLM the steps make sense
def _category_fallback(category: str, inc, root_cause: str, error_codes: list) -> list:
    ec = ", ".join(error_codes) if error_codes else "unknown error code"

    plans = {
        "payment_timeout": [
            {"step": 1, "action": f"Check payment gateway status page and health endpoint; error: {ec}", "rationale": "Confirm if outage is gateway-side or network-side", "is_bcp": False},
            {"step": 2, "action": "Switch affected SCO/POS terminals to fallback payment mode", "rationale": "Unblocks customer checkout immediately while root cause is investigated", "is_bcp": False},
            {"step": 3, "action": "Review pos-payment and payment-gateway service logs for GW_TIMEOUT_503 frequency and first occurrence", "rationale": "Establishes timeline and scope of the outage", "is_bcp": False},
            {"step": 4, "action": "Escalate to Integration Support if >5 terminals affected or >10 min duration", "rationale": "Gateway outages affecting >5 units require L2 bridge call", "is_bcp": False},
            {"step": 5, "action": "Document resolution, restore terminals from fallback mode, update incident ticket", "rationale": "Audit trail and service restoration", "is_bcp": False},
        ],
        "receipt_printer_failure": [
            {"step": 1, "action": f"Check physical printer on affected lanes; error: {ec}", "rationale": "Paper jam or offline state is the most common cause of PRINTER_OFFLINE_ERR", "is_bcp": False},
            {"step": 2, "action": "Flush CUPS print queue: sudo cancel -a on affected printer", "rationale": "CUPS_QUEUE_BLOCKED clears only when the queue is explicitly purged", "is_bcp": False},
            {"step": 3, "action": "Restart printer-daemon service on affected lane", "rationale": "Daemon restart re-establishes USB connection and clears socket timeout", "is_bcp": False},
            {"step": 4, "action": "If >3 printers affected, check USB hub for power issues", "rationale": "Multi-lane printer failure often indicates USB hub or power rail fault", "is_bcp": False},
            {"step": 5, "action": "Document lanes affected, actions taken, and resolution code", "rationale": "Audit trail and pattern tracking for hardware replacement planning", "is_bcp": False},
        ],
        "barcode_scanner_issue": [
            {"step": 1, "action": f"Check physical USB connection of scanners on affected lanes; error: {ec}", "rationale": "SCAN_DEVICE_LOST and USB_ENUM_FAILURE are most commonly caused by loose USB connections", "is_bcp": False},
            {"step": 2, "action": "Force USB re-enumeration: unplug and replug scanner; restart scan-service", "rationale": "Re-enumeration resolves USB_ENUM_FAILURE without hardware replacement", "is_bcp": False},
            {"step": 3, "action": "Check /dev/hidraw* devices to confirm scanner visibility at OS level", "rationale": "If device is missing from /dev/, driver or USB hub is the issue not scan-service", "is_bcp": False},
            {"step": 4, "action": "If >3 lanes affected, check USB hub — replace if power indicator is off", "rationale": "Mass scanner failure points to hub fault, not individual scanner units", "is_bcp": False},
            {"step": 5, "action": "Document affected lanes, resolution steps, and whether hardware replacement is required", "rationale": "Audit trail and escalation to hardware team if RMA needed", "is_bcp": False},
        ],
        "loyalty_api_unavailable": [
            {"step": 1, "action": f"Enable offline loyalty cache mode via store config portal; error: {ec}", "rationale": "CIRCUIT_OPEN means API is down — cache mode unblocks checkout immediately", "is_bcp": False},
            {"step": 2, "action": "Check loyalty-api health endpoint /health — confirm HTTP status and response time", "rationale": "Determines if outage is network or service-side", "is_bcp": False},
            {"step": 3, "action": "Reset circuit breaker via ops portal if loyalty-api health recovers", "rationale": "Circuit breaker stays OPEN until manually reset even after service recovers", "is_bcp": False},
            {"step": 4, "action": "Validate API key and certificate expiry for loyalty-api", "rationale": "LOYALTY_API_503 after a healthy period can indicate expired credentials", "is_bcp": False},
            {"step": 5, "action": "Escalate to Loyalty Engineering if API health does not recover within 15 min", "rationale": "Persistent 503s require service-level investigation", "is_bcp": False},
        ],
        "promotion_engine_latency": [
            {"step": 1, "action": f"Check promo-engine CPU and memory metrics; error: {ec}", "rationale": "PROMO_ENGINE_CPU_HIGH at 98% is the primary cause of BASKET_EVAL_TIMEOUT", "is_bcp": False},
            {"step": 2, "action": "Identify slow promotion rule via promo-engine logs — look for RULE-XXX in PROMO_TIMEOUT lines", "rationale": "One runaway rule typically causes cascading timeouts across all baskets", "is_bcp": False},
            {"step": 3, "action": "Restart promo-engine service to clear CPU saturation and rule cache", "rationale": "Service restart drops queued evaluation requests and resets rule cache", "is_bcp": False},
            {"step": 4, "action": "Disable identified slow promotion rule in promo admin console", "rationale": "Prevents recurrence without full service restart if rule is misconfigured", "is_bcp": False},
            {"step": 5, "action": "Escalate to Promotions Engineering for rule optimisation or emergency rollback", "rationale": "Rule-level fix required to prevent recurrence on next promotion cycle", "is_bcp": False},
        ],
        "store_network_flap": [
            {"step": 1, "action": f"Activate standalone mode on POS systems (offline payment pre-auth); error: {ec}", "rationale": "NET_LINK_FLAP causes intermittent checkout failure — standalone mode ensures continuity", "is_bcp": False},
            {"step": 2, "action": "Check physical layer in comms room — inspect core-sw-01 port indicator lights", "rationale": "SWITCH_PORT_DOWN and NET_LINK_FLAP are often caused by a faulty patch cable or SFP", "is_bcp": False},
            {"step": 3, "action": "Review BGP session logs and check PACKET_LOSS_HIGH on store uplink to DC", "rationale": "45% packet loss on uplink requires ISP liaison if physical layer is healthy", "is_bcp": False},
            {"step": 4, "action": "Page Network Operations team for switch-level diagnostics and ISP escalation", "rationale": "BGP reconvergence and uplink issues require NOC-level access", "is_bcp": False},
            {"step": 5, "action": "Document impacted services, timeline of flaps, and hardware/ISP actions taken", "rationale": "Audit trail and post-incident review for network resilience improvements", "is_bcp": False},
        ],
    }

    # Return category-specific plan or a meaningful generic one
    return plans.get(category, [
        {"step": 1, "action": f"Identify affected services for {inc.service} — check health endpoints", "rationale": f"Detected error codes: {ec}", "is_bcp": False},
        {"step": 2, "action": f"Review {inc.service} logs for {ec} — establish first occurrence and frequency", "rationale": "Timeline helps isolate whether this is new or recurring", "is_bcp": False},
        {"step": 3, "action": f"Apply runbook steps for {category} pattern", "rationale": "Follow documented resolution for this failure pattern", "is_bcp": False},
        {"step": 4, "action": "Escalate to L2 Integration Support if unresolved after 15 min", "rationale": "Threshold for senior engineer involvement", "is_bcp": False},
        {"step": 5, "action": "Document resolution steps and update incident ticket with root cause", "rationale": "Audit trail and knowledge base update", "is_bcp": False},
    ])
