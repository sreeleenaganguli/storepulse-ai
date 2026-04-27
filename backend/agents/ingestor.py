"""Ingestor Agent — uses new google.genai SDK."""
from __future__ import annotations
import json, re
from langchain_openai import ChatOpenAI
from config import api_endpoint, api_key, client, MODEL_INGESTOR
from state import AgentState

llm = ChatOpenAI(
    base_url=api_endpoint,
    api_key=api_key,
    model=MODEL_INGESTOR,
    http_client=client,
    temperature=0.0
)

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


def _parse_log_line(line: str, service: str) -> dict:
    ts_match = re.search(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", line)
    codes = re.findall(r"[A-Z][A-Z0-9_]{3,}", line)
    level = "INFO"
    for lvl in ["ERROR", "WARN", "WARNING", "INFO", "DEBUG"]:
        if lvl in line.upper():
            level = "WARN" if lvl == "WARNING" else lvl
            break
    return {
        "time":       ts_match.group() if ts_match else "",
        "level":      level,
        "service":    service,
        "message":    line[:200],
        "error_code": codes[-1] if codes else None,
    }


def run_ingestor(state: AgentState) -> dict:
    inc          = state["incident"]
    prior_events = state.get("stream_events", [])  # ← accumulate

    event_start = {
        "type": "agent_step", "agent": "ingestor",
        "status": "running", "message": "Extracting entities and parsing log timeline...",
    }

    prompt = f"""INCIDENT:
Service: {inc.service}
Severity: {inc.severity}
Symptoms: {inc.symptoms}
Incident ID: {inc.incident_id or "N/A"}
Created: {inc.created or "N/A"}

LOG SNIPPET:
{inc.log_snippet or "(no logs provided)"}

Extract all structured information. Return JSON only."""

    try:
        resp = llm.invoke([("system", _SYSTEM), ("user", prompt)])
        raw = re.sub(r"^```(?:json)?\s*", "", resp.content.strip())
        raw = re.sub(r"\s*```$", "", raw)
        entities = json.loads(raw)
    except Exception as e:
        print(f"[Ingestor] LLM Error: {e}")
        entities = {
            "primary_error_code":  None,
            "error_codes":         [],
            "affected_services":   [inc.service],
            "affected_units_count": None,
            "log_timeline":        [],
            "severity_path":       inc.symptoms,
            "keywords":            inc.symptoms.split()[:5],
        }

    raw_logs = []
    if inc.log_snippet:
        for line in inc.log_snippet.strip().splitlines():
            line = line.strip()
            if line:
                raw_logs.append(_parse_log_line(line, inc.service))

    event_done = {
        "type": "agent_step", "agent": "ingestor", "status": "done",
        "message": f"Extracted {len(entities.get('error_codes', []))} error codes · {len(raw_logs)} log lines parsed",
    }

    return {
        "entities":      entities,
        "raw_logs":      raw_logs,
        "log_timeline":  entities.get("log_timeline", []),
        "ingestor_done": True,
        "stream_events": prior_events + [event_start, event_done],  # ← accumulate
    }