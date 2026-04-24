"""LangGraph graph — wires all agents with conditional edges."""
import logging
from langgraph.graph import StateGraph, END
from state import AgentState
from agents.ingestor import run_ingestor
from agents.researcher import run_researcher
from agents.diagnostician import run_diagnostician
from agents.action_planner import run_action_planner
from agents.validator import run_validator
from config import RETRIEVAL_MIN_SCORE, MAX_RETRIEVAL_ATTEMPTS

log = logging.getLogger("storepulse.graph")

# ── Conditional edge functions ─────────────────────────────────────────────────

def after_researcher(state: AgentState) -> str:
    """Re-query if score is low AND we haven't hit the attempt limit.
    On a feedback retry, lower the bar slightly to allow fresh retrieval."""
    attempt_number = state.get("attempt_number", 1)
    retrieval_attempts = state.get("retrieval_attempts", 0)
    max_score = state.get("retrieval_max_score", 0.0)

    # On feedback retries, be more aggressive about re-retrieving
    effective_min_score = RETRIEVAL_MIN_SCORE * (0.9 ** (attempt_number - 1))

    if max_score < effective_min_score and retrieval_attempts < MAX_RETRIEVAL_ATTEMPTS:
        log.info(f"[Graph] Low retrieval score {max_score:.2f} < {effective_min_score:.2f}, re-querying (attempt {retrieval_attempts + 1})")
        return "researcher"
    return "diagnostician"


def after_diagnostician(state: AgentState) -> str:
    """If conflicts found and diagnostician wants a new query, loop back.
    Skip re-retrieval if we already have strong feedback context."""
    needs_reretrieval = state.get("needs_reretrieval", False)
    retrieval_attempts = state.get("retrieval_attempts", 0)
    feedback_context = state.get("feedback_context", "")

    # If we have engineer feedback, trust the diagnostician's output more —
    # avoid unnecessary re-retrieval loops
    if feedback_context and needs_reretrieval and retrieval_attempts >= 1:
        log.info("[Graph] Feedback context present — skipping re-retrieval, proceeding to planner")
        return "action_planner"

    if needs_reretrieval and retrieval_attempts < MAX_RETRIEVAL_ATTEMPTS:
        log.info(f"[Graph] Diagnostician requested re-retrieval (attempt {retrieval_attempts + 1})")
        return "researcher"

    return "action_planner"


def after_validator(state: AgentState) -> str:
    """On hard validation failures, re-run planner with feedback.
    On a feedback retry round, only allow one replanning pass to avoid loops."""
    validation_passed = state.get("validation_passed", False)
    retrieval_attempts = state.get("retrieval_attempts", 0)
    attempt_number = state.get("attempt_number", 1)
    planner_done = state.get("planner_done", False)

    if not validation_passed:
        # On feedback retries (attempt_number > 1), only replan once
        max_replan = 1 if attempt_number > 1 else MAX_RETRIEVAL_ATTEMPTS
        if retrieval_attempts <= max_replan and planner_done:
            log.info("[Graph] Validation failed — replanning with corrected context")
            return "action_planner"

    return END


# ── Build graph ────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("ingestor",       run_ingestor)
    graph.add_node("researcher",     run_researcher)
    graph.add_node("diagnostician",  run_diagnostician)
    graph.add_node("action_planner", run_action_planner)
    graph.add_node("validator",      run_validator)

    graph.set_entry_point("ingestor")
    graph.add_edge("ingestor", "researcher")

    graph.add_conditional_edges(
        "researcher",
        after_researcher,
        {"researcher": "researcher", "diagnostician": "diagnostician"}
    )
    graph.add_conditional_edges(
        "diagnostician",
        after_diagnostician,
        {"researcher": "researcher", "action_planner": "action_planner"}
    )
    graph.add_edge("action_planner", "validator")
    graph.add_conditional_edges(
        "validator",
        after_validator,
        {"action_planner": "action_planner", END: END}
    )

    return graph.compile()


compiled_graph = build_graph()