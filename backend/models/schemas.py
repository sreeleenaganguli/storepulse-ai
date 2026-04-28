from __future__ import annotations
from typing import Optional, List, Any, Dict
from pydantic import BaseModel

class RunbookChunk(BaseModel):
    id: str
    text: str
    filename: str
    pattern_id: str
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    combined_score: float = 0.0

class SimilarIncident(BaseModel):
    id: str
    service: str
    severity: str
    symptoms: str
    resolution_code: str
    similarity: float = 0.0

class ConflictItem(BaseModel):
    log_error_code: str
    runbook_expects: List[str] = []
    interpretation: str = ""

class ActionStep(BaseModel):
    step: int
    action: str
    rationale: str = ""
    is_bcp: bool = False

class IncidentInput(BaseModel):
    incident_id: Optional[str] = ""
    service: str
    severity: str = "Sev2"
    symptoms: str
    created: Optional[str] = ""
    log_snippet: Optional[str] = ""

class TriageOutput(BaseModel):
    incident_id: Optional[str] = ""
    service: str = ""  # service name from incident input
    incident_summary: str = ""
    probable_category: str = "unknown"
    root_cause: str = ""
    top_causes: List[str] = []
    confidence: float = 0.0
    confidence_rationale: str = ""
    reasoning_trace: str = ""
    action_plan: List[Dict[str, Any]] = []
    escalation_path: str = ""
    handoff_note: str = ""
    conflicts: List[ConflictItem] = []
    retrieved_runbooks: List[RunbookChunk] = []
    similar_incidents: List[SimilarIncident] = []
    raw_logs: List[Dict[str, Any]] = []
    validation_passed: bool = True
    validation_failures: List[str] = []

class ConfirmRequest(BaseModel):
    incident_id: str
    confirmed_steps: List[int] = []
    rejected_steps: List[Dict[str, Any]] = []
    triage_context: Optional[Dict[str, Any]] = None  # category, root_cause, service, confidence, action_plan
