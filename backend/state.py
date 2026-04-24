from __future__ import annotations
from typing import Optional, List, Dict, Any, TypedDict
from models.schemas import (
    IncidentInput, RunbookChunk, SimilarIncident,
    ConflictItem, ActionStep
)

class AgentState(TypedDict, total=False):
    # Input
    incident: IncidentInput

    # Ingestor
    entities: Dict[str, Any]
    raw_logs: List[Dict[str, Any]]
    log_timeline: List[Dict[str, Any]]
    severity_path: str                    # ← was missing
    ingestor_done: bool

    # Researcher
    runbook_chunks: List[RunbookChunk]
    similar_incidents: List[SimilarIncident]
    retrieval_max_score: float            # ← was missing
    retrieval_attempts: int
    low_retrieval_confidence: bool
    needs_reretrieval: bool
    reretrieval_query: str
    researcher_done: bool

    # Diagnostician
    conflicts: List[ConflictItem]
    root_cause: str
    probable_category: str
    top_causes: List[str]
    confidence: float
    confidence_rationale: str
    reasoning_trace: str
    diagnostician_done: bool

    # Planner
    action_plan: List[Dict[str, Any]]
    escalation_path: str
    handoff_note: str
    incident_summary: str
    planner_done: bool

    # Validator
    validation_passed: bool
    validation_notes: List[str]           # ← renamed from validation_failures
    validation_failures: List[str]        # ← keep for backward compat
    validator_done: bool

    # Streaming
    stream_events: List[Dict[str, Any]]

    feedback_context: str      # ← prior rejected analyses + engineer feedback
    attempt_number: int        # ← which retry attempt this is (1 = first run)