"""Validator Agent — 8 deterministic rules, zero LLM calls."""
from __future__ import annotations
from typing import List
from state import AgentState

RULES = [
    ("has_summary",      lambda r: bool(r.get("incident_summary", "").strip()),        "incident_summary missing"),
    ("has_root_cause",   lambda r: bool(r.get("root_cause", "").strip()),              "root_cause missing"),
    ("has_category",     lambda r: r.get("probable_category", "unknown") != "unknown", "probable_category is unknown"),
    ("has_actions",      lambda r: len(r.get("action_plan", [])) >= 3,                "fewer than 3 action steps"),
    ("has_escalation",   lambda r: bool(r.get("escalation_path", "").strip()),         "escalation_path missing"),
    ("confidence_floor", lambda r: float(r.get("confidence", 0)) >= 0.30,             "confidence below 0.30"),
    ("top_causes",       lambda r: len(r.get("top_causes", [])) >= 1,                 "no top_causes provided"),
    ("bcp_if_sev1",      lambda r: True,                                               ""),  # checked separately
]


def run_validator(state: AgentState) -> dict:
    prior_events = state.get("stream_events", [])  # ← accumulate

    event_start = {
        "type": "agent_step", "agent": "validator", "status": "running",
        "message": "Running 8 deterministic validation rules...",
    }

    failures: List[str] = []
    for rule_id, check_fn, msg in RULES:
        if rule_id == "bcp_if_sev1":
            inc        = state["incident"]
            is_payment = any(kw in inc.symptoms.lower() for kw in ["payment", "checkout", "pos", "basket"])
            if inc.severity == "Sev1" and is_payment:
                plan = state.get("action_plan", [])
                if not plan or not plan[0].get("is_bcp", False):
                    failures.append("Sev1 payment incident missing BCP as step 1")
            continue
        try:
            if not check_fn(state):
                failures.append(msg)
        except Exception:
            failures.append(f"Rule {rule_id} check failed")

    hard_fail = len(failures) > 2
    passed    = len(failures) == 0

    if passed:
        event_done = {
            "type": "validated", "agent": "validator", "status": "done",
            "message": "All 8 validation rules passed ✓",
        }
    elif hard_fail:
        event_done = {
            "type": "validation_failed", "agent": "validator", "status": "failed",
            "message": f"Hard failure — {len(failures)} rules failed: {'; '.join(failures)}",
        }
    else:
        event_done = {
            "type": "validated", "agent": "validator", "status": "done",
            "message": f"Passed with {len(failures)} soft warning(s): {'; '.join(failures)}",
        }

    return {
        "validation_passed":   passed or not hard_fail,
        "validation_notes":    failures,   # ← renamed from validation_failures to match state.py
        "validation_failures": failures,   # ← keep both for backward compat
        "validator_done":      True,
        "stream_events":       prior_events + [event_start, event_done],  # ← accumulate
    }