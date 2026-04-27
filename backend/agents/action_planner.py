"""Action Planner Agent — new google.genai SDK."""
from __future__ import annotations
import json, re
from langchain_openai import ChatOpenAI
from config import api_endpoint, api_key, client, MODEL_PLANNER
from state import AgentState

llm = ChatOpenAI(
    base_url=api_endpoint,
    api_key=api_key,
    model=MODEL_PLANNER,
    http_client=client,
    temperature=0.2
)

_SYSTEM = """You are an expert store-systems incident commander. Write clear 5-step action plans.
Return ONLY valid JSON:
{
  "action_plan": [{"step":1,"action":"specific action","rationale":"why","is_bcp":false}],
  "escalation_path": "who to call, when, via what channel",
  "handoff_note": "4-6 line shift handoff summary",
  "incident_summary": "one paragraph plain-English summary"
}
Rules: exactly 5 steps. All advisory — never auto-executed. BCP step must be step 1 if flagged."""

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
    prior_events = state.get("stream_events", [])  # ← accumulate

    # ── Include feedback context if retry ─────────────────────────────────────
    feedback_context = state.get("feedback_context", "")
    attempt_number   = state.get("attempt_number", 1)

    event_start = {
        "type": "agent_step", "agent": "action_planner", "status": "running",
        "message": f"Generating 5-step action plan (attempt {attempt_number})...",
    }

    force_bcp   = (inc.severity == "Sev1" and
                   any(kw in inc.symptoms.lower() for kw in ["payment", "checkout", "pos", "basket"]))
    runbook_ctx = "\n\n".join(f"[{c.filename}]\n{c.text[:800]}" for c in chunks)
    similar_ctx = "\n".join(f"- {s.id} resolved by: {s.resolution_code}" for s in similar)
    conflict_ctx = "\n".join(f"- {c.log_error_code}: {c.interpretation}" for c in conflicts) or "(none)"

    prompt = f"""INCIDENT: {inc.service} / {inc.severity}
Symptoms: {inc.symptoms}
Root Cause: {root_cause}
Category: {category} | Confidence: {round(confidence * 100)}%
Top Causes: {chr(10).join(f"{i+1}. {c}" for i, c in enumerate(top_causes))}
Conflicts: {conflict_ctx}
BCP REQUIRED: {"YES - step 1 MUST be BCP action" if force_bcp else "NO"}

RUNBOOKS:
{runbook_ctx or "(none)"}

SIMILAR RESOLVED BY:
{similar_ctx or "(none)"}
{f"{chr(10)}{feedback_context}" if feedback_context else ""}
Return JSON only."""

    try:
        resp = llm.invoke([("system", _SYSTEM), ("user", prompt)])
        raw    = re.sub(r"^```(?:json)?\s*", "", resp.content.strip())
        raw    = re.sub(r"\s*```$", "", raw)
        result = json.loads(raw)
    except Exception as e:
        print(f"[ActionPlanner] LLM Error: {e}")
        result = {
            "action_plan": [
                {"step": 1, "action": "Check service health endpoint",              "rationale": "First diagnostic step",              "is_bcp": False},
                {"step": 2, "action": "Review recent error logs",                    "rationale": "Identify root cause",                 "is_bcp": False},
                {"step": 3, "action": "Follow runbook for identified pattern",       "rationale": "Standard procedure",                  "is_bcp": False},
                {"step": 4, "action": "Notify relevant team if unresolved >15 min", "rationale": "Escalation threshold",                "is_bcp": False},
                {"step": 5, "action": "Document resolution and update ticket",       "rationale": "Audit trail",                         "is_bcp": False},
            ],
            "escalation_path": "Escalate to Integration Support → Store Ops Manager if >15min unresolved.",
            "handoff_note":    f"Incident {inc.incident_id}: {category}. Root: {root_cause}.",
            "incident_summary": f"Store system incident: {inc.symptoms}.",
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
        "stream_events":    prior_events + [               # ← accumulate
            event_start,
            {
                "type": "agent_step", "agent": "action_planner", "status": "done",
                "message": f"Plan ready — BCP enforced: {force_bcp}",
            }
        ],
    }