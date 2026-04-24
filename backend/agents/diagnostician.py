"""Diagnostician Agent — new google.genai SDK."""
from __future__ import annotations
import json, re
from typing import List
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, MODEL_DIAGNOSTICIAN, MODEL_DIAG_FALLBACK
from config import ERROR_TAXONOMY, PATTERN_MAP
from state import AgentState
from models.schemas import ConflictItem

_client = genai.Client(api_key=GEMINI_API_KEY)

_SYSTEM = """You are a senior SRE specialising in retail store systems. Do diagnostic root-cause analysis.
Return ONLY valid JSON (no markdown):
{
  "conflicts": [{"log_error_code":"CODE","runbook_expects":["CODE"],"interpretation":"one sentence"}],
  "root_cause": "one clear sentence",
  "probable_category": "payment_timeout|receipt_printer_failure|barcode_scanner_issue|loyalty_api_unavailable|promotion_engine_latency|store_network_flap|unknown",
  "top_causes": ["cause 1","cause 2","cause 3"],
  "confidence": 0.0,
  "confidence_rationale": "why this confidence",
  "reasoning_trace": "step by step reasoning",
  "needs_reretrieval": false,
  "reretrieval_query": ""
}
CONFLICT RULE: error code in logs not in known taxonomy = conflict. Set needs_reretrieval=true on conflict."""

def _call(model_name: str, prompt: str) -> str:
    resp = _client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            response_mime_type="application/json",
            temperature=0.1,
        )
    )
    return resp.text

def _parse(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)

def run_diagnostician(state: AgentState) -> dict:
    inc      = state["incident"]
    entities = state.get("entities", {})
    chunks   = state.get("runbook_chunks", [])
    similar  = state.get("similar_incidents", [])

    event_start = {"type":"agent_step","agent":"diagnostician","status":"running",
                   "message":"Running conflict detection and root cause analysis..."}

    known_codes     = ERROR_TAXONOMY.get(inc.service, [])
    extracted_codes = entities.get("error_codes", [])
    runbook_ctx = "\n\n".join(f"[{c.filename}]\n{c.text[:600]}" for c in chunks)
    similar_ctx = "\n".join(f"- {s.id} {s.service}: {s.symptoms[:80]} → {s.resolution_code}" for s in similar)
    log_ctx = "\n".join(
        f"{l.get('time','')} [{l.get('level','')}] {l.get('message','')} [{l.get('error_code','')}]"
        for l in state.get("raw_logs", [])[:10]
    )

    prompt = f"""INCIDENT: {inc.service} / {inc.severity}
Symptoms: {inc.symptoms}
Error codes found: {extracted_codes}
Known taxonomy for {inc.service}: {known_codes}

RUNBOOKS:
{runbook_ctx or "(none)"}

SIMILAR INCIDENTS:
{similar_ctx or "(none)"}

LOGS:
{log_ctx or "(none)"}

Return JSON only."""

    result = None
    used_model = MODEL_DIAGNOSTICIAN
    for model_name in [MODEL_DIAGNOSTICIAN, MODEL_DIAG_FALLBACK]:
        try:
            result = _parse(_call(model_name, prompt))
            used_model = model_name
            break
        except Exception:
            continue

    if result is None:
        inferred = PATTERN_MAP.get(extracted_codes[0], "unknown") if extracted_codes else "unknown"
        result = {"conflicts":[],"root_cause":f"Rule-based: {inferred}","probable_category":inferred,
                  "top_causes":["LLM unavailable"],"confidence":0.35,"confidence_rationale":"Fallback",
                  "reasoning_trace":"Automated reasoning unavailable.","needs_reretrieval":False,"reretrieval_query":""}

    conflicts = [ConflictItem(**c) for c in result.get("conflicts", [])]
    events = [event_start, {"type":"agent_step","agent":"diagnostician","status":"done",
              "message":f"Confidence {round(result.get('confidence',0)*100)}% | Model: {used_model}"}]
    for c in conflicts:
        events.append({"type":"conflict_detected","agent":"diagnostician",
                       "message":f"Conflict: {c.log_error_code}",
                       "data":{"log_error_code":c.log_error_code,"runbook_expects":c.runbook_expects,"interpretation":c.interpretation}})

    return {
        "conflicts": conflicts,
        "root_cause": result.get("root_cause","Unknown"),
        "probable_category": result.get("probable_category","unknown"),
        "top_causes": result.get("top_causes",[]),
        "confidence": float(result.get("confidence",0.5)),
        "confidence_rationale": result.get("confidence_rationale",""),
        "reasoning_trace": result.get("reasoning_trace",""),
        "needs_reretrieval": bool(result.get("needs_reretrieval",False)),
        "reretrieval_query": result.get("reretrieval_query",""),
        "diagnostician_done": True,
        "stream_events": events,
    }
