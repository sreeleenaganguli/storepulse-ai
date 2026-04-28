"""Feedback loop — stores rejected analyses and rebuilds enriched context for retry."""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

FEEDBACK_DIR = Path("data/feedback")
FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)

# ── Confirmation history — cross-incident learning per service ─────────────────
CONFIRMATIONS_FILE = FEEDBACK_DIR / "confirmations.jsonl"
_MAX_CONFIRMATION_CONTEXT = 10   # cap how many records we inject into prompts


def save_feedback(incident_id: str, prior_analysis: dict, feedback: str) -> Path:
    """Persist rejected analysis + engineer feedback to disk."""
    record = {
        "incident_id": incident_id,
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "feedback": feedback,
        "prior_analysis": prior_analysis,
    }
    path = FEEDBACK_DIR / f"{incident_id}_feedback.jsonl"
    with open(path, "a") as f:
        f.write(json.dumps(record) + "\n")
    return path


def load_feedback_history(incident_id: str) -> list:
    """Load all prior feedback rounds for an incident."""
    path = FEEDBACK_DIR / f"{incident_id}_feedback.jsonl"
    if not path.exists():
        return []
    history = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            history.append(json.loads(line))
    return history


def build_feedback_context(incident_id: str) -> str:
    """
    Build a structured context string summarising all prior rejected
    analyses + engineer feedback — injected into the graph on retry.
    """
    history = load_feedback_history(incident_id)
    if not history:
        return ""

    parts = ["=== PRIOR ANALYSIS HISTORY (Engineer Rejected) ===\n"]
    for i, record in enumerate(history, 1):
        a = record.get("prior_analysis", {})
        parts.append(
            f"--- Attempt {i} (rejected at {record['rejected_at']}) ---\n"
            f"Category   : {a.get('probable_category', 'unknown')}\n"
            f"Root Cause : {a.get('root_cause', 'N/A')}\n"
            f"Confidence : {a.get('confidence', 0) * 100:.0f}%\n"
            f"Engineer Feedback: {record['feedback']}\n"
        )
    parts.append("=== Use the above feedback to correct your analysis. ===\n")
    return "\n".join(parts)


# ── Confirmation persistence — stores engineer confirm/reject decisions ────────

def save_confirmation(
    incident_id: str,
    service: str,
    confirmed_steps: List[int],
    rejected_steps: List[Dict[str, Any]],
    triage_context: Optional[Dict[str, Any]] = None,
) -> Path:
    """Persist engineer confirm/reject decisions for cross-incident learning.

    Each record captures what the engineer approved, what they rejected (with
    reasons), and the triage context (category, root_cause, confidence, etc.)
    so future runs for the same service can learn from past human decisions.
    """
    record = {
        "incident_id": incident_id,
        "service": service,
        "confirmed_at": datetime.now(timezone.utc).isoformat(),
        "confirmed_steps": confirmed_steps,
        "rejected_steps": rejected_steps,
        "triage_context": triage_context or {},
    }
    with open(CONFIRMATIONS_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")
    print(f"[FeedbackLoop] Saved confirmation for {service} (incident {incident_id}): "
          f"{len(confirmed_steps)} confirmed, {len(rejected_steps)} rejected")
    return CONFIRMATIONS_FILE


def load_confirmation_history(service: str) -> List[dict]:
    """Load all past confirmation records for a given service."""
    if not CONFIRMATIONS_FILE.exists():
        return []
    records = []
    for line in CONFIRMATIONS_FILE.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
            if record.get("service") == service:
                records.append(record)
        except json.JSONDecodeError:
            continue
    return records


def build_confirmation_context(service: str) -> str:
    """Build a structured context string from past engineer confirmations for
    a service.  This is injected into every triage run so the LLM can learn
    from prior human decisions — e.g. which action steps engineers prefer,
    which they consistently reject, and why.

    Limited to the most recent _MAX_CONFIRMATION_CONTEXT records to keep
    the context window manageable.
    """
    history = load_confirmation_history(service)
    if not history:
        return ""

    # Take only the most recent N records
    recent = history[-_MAX_CONFIRMATION_CONTEXT:]

    parts = [f"=== ENGINEER CONFIRMATION HISTORY FOR '{service}' ({len(recent)} recent interactions) ===\n"]
    for i, record in enumerate(recent, 1):
        ctx = record.get("triage_context", {})
        confirmed = record.get("confirmed_steps", [])
        rejected  = record.get("rejected_steps", [])

        parts.append(
            f"--- Interaction {i} (incident {record.get('incident_id', 'unknown')}, "
            f"{record.get('confirmed_at', 'unknown')}) ---\n"
            f"Category   : {ctx.get('probable_category', 'unknown')}\n"
            f"Root Cause : {ctx.get('root_cause', 'N/A')}\n"
            f"Confidence : {ctx.get('confidence', 0) * 100:.0f}%\n"
            f"Confirmed Steps: {confirmed}\n"
        )
        if rejected:
            for rej in rejected:
                reason = rej.get("reason", "no reason given")
                parts.append(f"  ✗ Rejected Step {rej.get('step', '?')}: {reason}\n")
        else:
            parts.append("  All steps confirmed ✓\n")

    parts.append(
        "=== Use the above history to calibrate your action plan. "
        "Prefer actions engineers have confirmed. Avoid patterns they reject. ===\n"
    )
    return "\n".join(parts)