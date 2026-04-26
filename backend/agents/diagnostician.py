"""Diagnostician Agent — new google.genai SDK."""
from __future__ import annotations
import json, re, traceback
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, MODEL_DIAGNOSTICIAN, MODEL_DIAG_FALLBACK
from config import ERROR_TAXONOMY, PATTERN_MAP
from state import AgentState
from models.schemas import ConflictItem
from rag.response_cache import get_cached, set_cached
import logging

log = logging.getLogger("storepulse")

_client = genai.Client(api_key=GEMINI_API_KEY)


_SYSTEM = """You are a senior SRE specialising in retail store systems. Do diagnostic root-cause analysis.

CONFIDENCE CALIBRATION RULES (follow strictly):
- Error code is in the known taxonomy AND matches a runbook pattern → confidence 0.80–0.95
- Error code in taxonomy but runbook match is weak                  → confidence 0.60–0.79
- Error code NOT in taxonomy (conflict detected)                    → confidence 0.40–0.59, set needs_reretrieval=true
- No error codes found, symptoms only                               → confidence 0.30–0.49
- Multiple conflicting signals                                      → confidence 0.35–0.55

Return ONLY valid JSON (no markdown):
{
  "conflicts": [{"log_error_code":"CODE","runbook_expects":["CODE"],"interpretation":"one sentence"}],
  "root_cause": "one clear sentence",
  "probable_category": "payment_timeout|receipt_printer_failure|barcode_scanner_issue|loyalty_api_unavailable|promotion_engine_latency|store_network_flap|unknown",
  "top_causes": ["cause 1","cause 2","cause 3"],
  "confidence": 0.0,
  "confidence_rationale": "cite specific error codes and runbook evidence that justify this score",
  "reasoning_trace": "step by step: 1) error codes found 2) taxonomy match 3) runbook match 4) conclusion",
  "needs_reretrieval": false,
  "reretrieval_query": ""
}
CONFLICT RULE: error code in logs not in known taxonomy = conflict. Set needs_reretrieval=true on conflict."""


# ── Expanded PATTERN_MAP — covers LLM-extracted variants not just raw codes ───
_EXTENDED_PATTERN_MAP = {
    # Payment timeout — all variants the LLM might extract
    "GW_TIMEOUT_503":          "payment_timeout",
    "GW_CONNECT_REFUSED":      "payment_timeout",
    "PAYMENT_SVC_UNAVAILABLE": "payment_timeout",
    "GATEWAY_TIMEOUT":         "payment_timeout",
    "PAYMENT_TIMEOUT":         "payment_timeout",
    "GW_TIMEOUT":              "payment_timeout",
    "TIMEOUT_503":             "payment_timeout",
    "CONNECTION_TIMEOUT":      "payment_timeout",
    "GATEWAY_CONNECTION":      "payment_timeout",

    # Receipt printer
    "PRINTER_OFFLINE_ERR":     "receipt_printer_failure",
    "CUPS_QUEUE_BLOCKED":      "receipt_printer_failure",
    "PRINTER_OFFLINE":         "receipt_printer_failure",
    "CUPS_BLOCKED":            "receipt_printer_failure",
    "RECEIPT_FAILED":          "receipt_printer_failure",

    # Barcode scanner
    "SCANNER_DISCONNECT":      "barcode_scanner_issue",
    "BARCODE_READ_FAIL":       "barcode_scanner_issue",
    "SCANNER_OFFLINE":         "barcode_scanner_issue",

    # Loyalty API
    "LOYALTY_API_TIMEOUT":     "loyalty_api_unavailable",
    "LOYALTY_SVC_DOWN":        "loyalty_api_unavailable",
    "LOYALTY_UNAVAILABLE":     "loyalty_api_unavailable",

    # Promo engine
    "PROMO_LATENCY_HIGH":      "promotion_engine_latency",
    "PROMO_SVC_SLOW":          "promotion_engine_latency",
    "PROMO_TIMEOUT":           "promotion_engine_latency",

    # Network
    "NET_LINK_FLAP":           "store_network_flap",
    "PACKET_LOSS_HIGH":        "store_network_flap",
    "NET_FLAP":                "store_network_flap",
    "NETWORK_FLAP":            "store_network_flap",
}

# Merge config PATTERN_MAP with extended map (config takes priority)
_FULL_PATTERN_MAP = {**_EXTENDED_PATTERN_MAP, **PATTERN_MAP}


def _resolve_pattern(extracted_codes: list) -> str:
    """Try each extracted code against the full pattern map, return first match."""
    for code in extracted_codes:
        hit = _FULL_PATTERN_MAP.get(code)
        if hit:
            return hit
    return "unknown"


def _call(model_name: str, prompt: str) -> str:
    resp = _client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            response_mime_type="application/json",
            temperature=0.1,
            # FIX: disable thinking tokens — they conflict with response_mime_type=application/json
            # on gemini-2.5-flash, thinking output breaks JSON-only mode causing parse failure
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
    )
    return resp.text


def _parse(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def run_diagnostician(state: AgentState) -> dict:
    inc          = state["incident"]
    entities     = state.get("entities", {})
    chunks       = state.get("runbook_chunks", [])
    similar      = state.get("similar_incidents", [])
    prior_events = state.get("stream_events", [])

    feedback_context = state.get("feedback_context", "")
    attempt_number   = state.get("attempt_number", 1)

    event_start = {
        "type": "agent_step", "agent": "diagnostician", "status": "running",
        "message": f"Running conflict detection and root cause analysis (attempt {attempt_number})...",
    }

    known_codes     = ERROR_TAXONOMY.get(inc.service, [])
    extracted_codes = entities.get("error_codes", [])
    pattern_hint    = _resolve_pattern(extracted_codes)   # uses full map now
    top_runbook     = chunks[0].filename if chunks else "none"
    top_score       = f"{chunks[0].combined_score:.0%}" if chunks else "0%"

    # ── Response cache check — only on first attempt ───────────────────────────
    if attempt_number == 1:
        cached = get_cached(inc.service, inc.symptoms, extracted_codes)
        if cached:
            log.info(f"[ResponseCache] Cache hit for {inc.service}")
            cached_conflicts = [
                ConflictItem(**c) if isinstance(c, dict) else c
                for c in cached.get("conflicts", [])
            ]
            return {
                **cached,
                "conflicts":          cached_conflicts,
                "diagnostician_done": True,
                "stream_events":      prior_events + [
                    event_start,
                    {
                        "type": "agent_step", "agent": "diagnostician", "status": "done",
                        "message": (
                            f"Cache hit — "
                            f"Confidence {round(cached.get('confidence', 0) * 100)}% | "
                            f"Category: {cached.get('probable_category', 'unknown')}"
                        ),
                    }
                ],
            }

    # ── Build prompt ───────────────────────────────────────────────────────────
    runbook_ctx = "\n\n".join(f"[{c.filename}]\n{c.text[:600]}" for c in chunks)
    similar_ctx = "\n".join(
        f"- {s.id} {s.service}: {s.symptoms[:80]} → {s.resolution_code}"
        for s in similar
    )
    log_ctx = "\n".join(
        f"{l.get('time','')} [{l.get('level','')}] {l.get('message','')} [{l.get('error_code','')}]"
        for l in state.get("raw_logs", [])
    )

    prompt = f"""RUNBOOKS (stable reference):
{runbook_ctx or "(none)"}

SIMILAR INCIDENTS (stable reference):
{similar_ctx or "(none)"}

--- VARIABLE SECTION ---
INCIDENT: {inc.service} / {inc.severity}
Symptoms: {inc.symptoms}
Error codes found: {extracted_codes}
Known taxonomy for {inc.service}: {known_codes}
Pattern map suggests: {pattern_hint}
Top runbook match: {top_runbook} (combined score: {top_score})

LOGS:
{log_ctx or "(none)"}
{f"{chr(10)}{feedback_context}" if feedback_context else ""}
Return JSON only."""

    # ── LLM call — both models have thinking disabled ─────────────────────────
    result     = None
    used_model = MODEL_DIAGNOSTICIAN

    for model_name in [MODEL_DIAGNOSTICIAN, MODEL_DIAG_FALLBACK]:
        try:
            result     = _parse(_call(model_name, prompt))
            used_model = model_name
            log.info(f"[Diagnostician] LLM success with {model_name}")
            break
        except Exception as e:
            log.error(f"[Diagnostician] Model {model_name} failed: {type(e).__name__}: {e}")
            log.error(traceback.format_exc())
            continue

    # ── Rule-based fallback ────────────────────────────────────────────────────
    if result is None:
        inferred = _resolve_pattern(extracted_codes)   # uses full map

        if extracted_codes and inferred != "unknown" and chunks:
            fallback_confidence = 0.65
        elif extracted_codes and inferred != "unknown":
            fallback_confidence = 0.50
        else:
            fallback_confidence = 0.30

        result = {
            "conflicts":            [],
            "root_cause":           f"Rule-based: {inferred}",
            "probable_category":    inferred,
            "top_causes":           [
                f"Pattern match: {inferred}",
                "LLM unavailable — rule-based fallback",
            ],
            "confidence":           fallback_confidence,
            "confidence_rationale": (
                f"Fallback: error code '{extracted_codes[0] if extracted_codes else 'none'}' "
                f"maps to '{inferred}' in PATTERN_MAP. "
                f"Top runbook match: {top_runbook} at {top_score}."
            ),
            "reasoning_trace": (
                f"1) Error codes found: {extracted_codes}\n"
                f"2) Taxonomy match for {inc.service}: {known_codes}\n"
                f"3) PATTERN_MAP suggests: {inferred}\n"
                f"4) Top runbook: {top_runbook} ({top_score})\n"
                f"5) LLM unavailable — rule-based conclusion used.\n"
                f"{feedback_context}"
            ),
            "needs_reretrieval": False,
            "reretrieval_query": "",
        }

    conflicts = [ConflictItem(**c) for c in result.get("conflicts", [])]

    # ── Cache only good LLM results ────────────────────────────────────────────
    if result.get("probable_category") != "unknown" and attempt_number == 1:
        set_cached(inc.service, inc.symptoms, extracted_codes, {
            "conflicts":            [c.__dict__ for c in conflicts],
            "root_cause":           result.get("root_cause", ""),
            "probable_category":    result.get("probable_category", "unknown"),
            "top_causes":           result.get("top_causes", []),
            "confidence":           float(result.get("confidence", 0.5)),
            "confidence_rationale": result.get("confidence_rationale", ""),
            "reasoning_trace":      result.get("reasoning_trace", ""),
            "needs_reretrieval":    False,
            "reretrieval_query":    "",
        })

    new_events = [
        event_start,
        {
            "type": "agent_step", "agent": "diagnostician", "status": "done",
            "message": (
                f"Confidence {round(result.get('confidence', 0) * 100)}% | "
                f"Model: {used_model} | "
                f"Category: {result.get('probable_category', 'unknown')}"
            ),
        }
    ]
    for c in conflicts:
        new_events.append({
            "type": "conflict_detected", "agent": "diagnostician",
            "message": f"Conflict: {c.log_error_code}",
            "data": {
                "log_error_code":  c.log_error_code,
                "runbook_expects": c.runbook_expects,
                "interpretation":  c.interpretation,
            },
        })

    return {
        "conflicts":            conflicts,
        "root_cause":           result.get("root_cause", "Unknown"),
        "probable_category":    result.get("probable_category", "unknown"),
        "top_causes":           result.get("top_causes", []),
        "confidence":           float(result.get("confidence", 0.5)),
        "confidence_rationale": result.get("confidence_rationale", ""),
        "reasoning_trace":      result.get("reasoning_trace", ""),
        "needs_reretrieval":    bool(result.get("needs_reretrieval", False)),
        "reretrieval_query":    result.get("reretrieval_query", ""),
        "diagnostician_done":   True,
        "stream_events":        prior_events + new_events,
    }
