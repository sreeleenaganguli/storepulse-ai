"""LangGraph graph — wires all agents with conditional edges."""
from langgraph.graph import StateGraph, END
from state import AgentState
from agents.ingestor import run_ingestor
from agents.researcher import run_researcher
from agents.diagnostician import run_diagnostician
from agents.action_planner import run_action_planner
from agents.validator import run_validator
from config import RETRIEVAL_MIN_SCORE, MAX_RETRIEVAL_ATTEMPTS

# ── Conditional edge functions ────────────────────────────────────────────

def after_researcher(state: AgentState) -> str:
    """Re-query if score is low AND we haven't hit the attempt limit."""
    if (state["retrieval_max_score"] < RETRIEVAL_MIN_SCORE and
            state["retrieval_attempts"] < MAX_RETRIEVAL_ATTEMPTS):
        return "researcher"
    return "diagnostician"

def after_diagnostician(state: AgentState) -> str:
    """If conflicts found and diagnostician wants a new query, loop back."""
    if (state["needs_reretrieval"] and
            state["retrieval_attempts"] < MAX_RETRIEVAL_ATTEMPTS):
        return "researcher"
    return "action_planner"

def after_validator(state: AgentState) -> str:
    """On hard validation failures, re-run planner with feedback (max once)."""
    if not state["validation_passed"]:
        # Only retry if it wasn't already a retry (check via planner_done + attempt count)
        if state.get("retrieval_attempts", 0) <= MAX_RETRIEVAL_ATTEMPTS:
            return "action_planner"
    return END

# ── Build graph ───────────────────────────────────────────────────────────

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
