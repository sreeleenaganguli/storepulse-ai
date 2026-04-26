"""Ingestor Agent — uses new google.genai SDK."""
from __future__ import annotations
import json, re
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, MODEL_INGESTOR
from state import AgentState


_client = genai.Client(api_key=GEMINI_API_KEY)


_SYSTEM = """You are a store-systems incident data extractor.
Extract structured information from the incident and return ONLY valid JSON:
{
  "primary_error_code": "most prominent error code or null",
  "error_codes": ["all error codes found"],
  "affected_services": ["services mentioned"],
  "affected_units_count": number_or_null,
  "log_timeline": [
    {"time": "ISO8601", "level": "ERROR|WARN|INFO", "service": "name",
     "message": "log line", "error_code": "CODE_OR_NULL"}
  ],
  "severity_path": "brief description of what is failing and impact",
  "keywords": ["key diagnostic terms"]
}
Return JSON only. No markdown fences."""


# Log level keywords — excluded from error_code extraction
_LOG_LEVELS = {"ERROR", "WARN", "WARNING", "INFO", "DEBUG", "FATAL", "CRITICAL", "TRACE"}

# Error code pattern: UPPER_SNAKE_CASE, min 5 chars
_ERROR_CODE_RE = re.compile(r'\b([A-Z][A-Z0-9_]{4,})\b')


def _parse_log_line(line: str, service: str) -> dict:
    # Extract ISO8601 timestamp
    ts_match = re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", line)

    # Extract log level
    level = "INFO"
    for lvl in ["ERROR", "WARN", "WARNING", "FATAL", "DEBUG", "INFO"]:
        if lvl in line.upper():
            level = "WARN" if lvl == "WARNING" else lvl
            break

    # Extract real error code — skip log level words
    error_code = None
    for match in _ERROR_CODE_RE.finditer(line):
        candidate = match.group(1)
        if candidate not in _LOG_LEVELS:
            error_code = candidate
            break

    return {
        "time":       ts_match.group() if ts_match else "",
        "level":      level,
        "service":    service,
        "message":    line[:500],
        "error_code": error_code,
    }


def run_ingestor(state: AgentState) -> dict:
    inc          = state["incident"]
    prior_events = state.get("stream_events", [])

    event_start = {
        "type": "agent_step", "agent": "ingestor",
        "status": "running", "message": "Extracting entities and parsing log timeline...",
    }

    prompt = (
        f"INCIDENT:\n"
        f"Service: {inc.service}\n"
        f"Severity: {inc.severity}\n"
        f"Symptoms: {inc.symptoms}\n"
        f"Incident ID: {inc.incident_id or 'N/A'}\n"
        f"Created: {inc.created or 'N/A'}\n\n"
        f"LOG SNIPPET (full — extract all error codes, timestamps, and patterns):\n"
        f"{inc.log_snippet or '(no logs provided)'}\n\n"
        f"Extract all structured information. Return JSON only."
    )

    try:
        resp = _client.models.generate_content(
            model=MODEL_INGESTOR,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM,
                response_mime_type="application/json",
                temperature=0.0,
            )
        )
        raw = re.sub(r"^```(?:json)?\s*", "", resp.text.strip())
        raw = re.sub(r"\s*```$", "", raw)
        entities = json.loads(raw)
    except Exception:
        entities = {
            "primary_error_code":   None,
            "error_codes":          [],
            "affected_services":    [inc.service],
            "affected_units_count": None,
            "log_timeline":         [],
            "severity_path":        inc.symptoms,
            "keywords":             inc.symptoms.split()[:5],
        }

    # Parse every log line — skip blank lines and # File: headers from _decode_uploaded_files
    raw_logs = []
    if inc.log_snippet:
        for line in inc.log_snippet.strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                raw_logs.append(_parse_log_line(line, inc.service))

    # LLM timeline — richer, context-aware
    llm_timeline = entities.get("log_timeline", [])

    # If LLM parsed logs but rule-based found nothing, use LLM output as raw_logs too
    if llm_timeline and not raw_logs:
        raw_logs = llm_timeline

    # Merge error codes: LLM-found + rule-based, deduplicated, order preserved
    rule_based_codes = list({
        log["error_code"]
        for log in raw_logs
        if log.get("error_code") and log["error_code"] not in _LOG_LEVELS
    })
    llm_codes = entities.get("error_codes", [])
    merged_codes = list(dict.fromkeys(llm_codes + rule_based_codes))
    entities["error_codes"] = merged_codes

    # Set primary_error_code if LLM left it null
    if not entities.get("primary_error_code") and merged_codes:
        entities["primary_error_code"] = merged_codes[0]

    primary = entities.get("primary_error_code")
    event_done = {
        "type": "agent_step", "agent": "ingestor", "status": "done",
        "message": (
            f"Extracted {len(merged_codes)} error codes "
            f"· {len(raw_logs)} log lines parsed"
            + (f" · primary: {primary}" if primary else "")
        ),
    }

    return {
        "entities":      entities,
        "raw_logs":      raw_logs,
        "log_timeline":  llm_timeline if llm_timeline else raw_logs,
        "ingestor_done": True,
        "stream_events": prior_events + [event_start, event_done],
    }
