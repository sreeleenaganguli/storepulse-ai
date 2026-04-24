"""Sensitive data redactor — strips PII and secrets before graph ingestion."""
import re
from typing import Dict, List, Tuple

_PATTERNS: List[Tuple[str, str]] = [
    # Payment / financial
    (r"\b(?:\d[ -]?){13,16}\b",                          "[CARD_REDACTED]"),
    (r"\b\d{3,4}\b(?=\s*cvv|\s*cvc|\s*security)",        "[CVV_REDACTED]"),
    (r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]{0,16})?\b", "[IBAN_REDACTED]"),

    # Auth / secrets
    (r"(?i)(api[_-]?key|token|secret|password|passwd|bearer)\s*[=:]\s*\S+", r"\1=[SECRET_REDACTED]"),
    (r"sk-[A-Za-z0-9]{20,}",                             "[OPENAI_KEY_REDACTED]"),
    (r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "[JWT_REDACTED]"),

    # PII
    (r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", "[EMAIL_REDACTED]"),
    (r"\b(?:\+?\d[\d\s\-().]{7,}\d)\b",                  "[PHONE_REDACTED]"),
    (r"\b\d{3}-\d{2}-\d{4}\b",                           "[SSN_REDACTED]"),

    # Network / infra
    (r"\b(?:\d{1,3}\.){3}\d{1,3}\b",                     "[IP_REDACTED]"),
    (r"\b([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}\b",     "[MAC_REDACTED]"),
]

_COMPILED = [(re.compile(p, re.IGNORECASE), r) for p, r in _PATTERNS]


def redact(text: str) -> str:
    """Redact sensitive data from a string."""
    for pattern, replacement in _COMPILED:
        text = pattern.sub(replacement, text)
    return text


def redact_incident(incident_dict: dict) -> dict:
    """Redact sensitive fields from an incident dict before processing."""
    sensitive_fields = {"symptoms", "description", "notes", "raw_logs", "message"}
    return {
        k: redact(v) if isinstance(v, str) and k in sensitive_fields else v
        for k, v in incident_dict.items()
    }


def redact_logs(logs: List[Dict]) -> List[Dict]:
    """Redact log entries."""
    redacted = []
    for log in logs:
        redacted.append({
            k: redact(v) if isinstance(v, str) else v
            for k, v in log.items()
        })
    return redacted