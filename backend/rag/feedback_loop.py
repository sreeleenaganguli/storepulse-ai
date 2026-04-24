"""Feedback loop — stores rejected analyses and rebuilds enriched context for retry."""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

FEEDBACK_DIR = Path("data/feedback")
FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)


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