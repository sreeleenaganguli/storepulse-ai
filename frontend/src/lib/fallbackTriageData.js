/**
 * Fallback mock triage responses used when the backend API is non-responsive.
 * Keyed by service name for targeted fallback, with a "default" catch-all.
 * When the real API is ready, this file is only used as a safety net.
 */

const FALLBACK_AGENT_EVENTS = [
  { type: "agent_step", agent: "ingestor", status: "running", message: "Extracting entities and parsing log timeline..." },
  { type: "agent_step", agent: "ingestor", status: "done", message: "Extracted 3 error codes · 4 log lines parsed (fallback)" },
  { type: "agent_step", agent: "researcher", status: "running", message: "Searching runbooks and similar incidents..." },
  { type: "agent_step", agent: "researcher", status: "done", message: "Found 3 runbook chunks · 2 similar incidents (fallback)" },
  { type: "agent_step", agent: "diagnostician", status: "running", message: "Analyzing root cause and conflicts..." },
  { type: "agent_step", agent: "diagnostician", status: "done", message: "Root cause identified with 0.82 confidence (fallback)" },
  { type: "agent_step", agent: "action_planner", status: "running", message: "Generating action plan..." },
  { type: "agent_step", agent: "action_planner", status: "done", message: "5-step action plan generated (fallback)" },
  { type: "agent_step", agent: "validator", status: "running", message: "Running validation checks..." },
  { type: "agent_step", agent: "validator", status: "done", message: "All 8 checks passed (fallback)" },
];

const FALLBACK_RESPONSES = {
  "pos-payment": {
    probable_category: "payment_timeout",
    root_cause: "Payment gateway connection pool exhaustion caused by upstream TLS certificate rotation. The gateway's connection pool failed to refresh stale connections, leading to cascading timeouts across all SCO units.",
    top_causes: [
      "TLS certificate rotation causing connection pool exhaustion",
      "Gateway retry storm amplifying load on degraded backend",
      "Circuit breaker threshold too high — 3 retries before OPEN",
    ],
    confidence: 0.85,
    confidence_rationale: "High confidence — error code GW_TIMEOUT_503 strongly correlates with known payment gateway timeout pattern. Log timeline and affected unit count consistent with pool exhaustion.",
    action_plan: [
      { step: 1, action: "Activate BCP: Switch to offline payment queue", rationale: "Immediate customer impact mitigation — allow transactions to proceed in store-and-forward mode.", is_bcp: true },
      { step: 2, action: "Restart payment gateway connection pool on affected stores", rationale: "Force fresh TLS handshakes to resolve stale connection issue." },
      { step: 3, action: "Verify TLS certificate chain on gateway endpoint", rationale: "Confirm certificate rotation completed successfully and intermediate certs are valid." },
      { step: 4, action: "Reduce circuit breaker retry count from 3 to 1", rationale: "Prevent retry storms during degraded gateway state." },
      { step: 5, action: "Monitor transaction success rate for 30 minutes", rationale: "Confirm recovery is stable before closing incident." },
    ],
    escalation_path: "If not resolved in 15 minutes: Escalate to Payment Platform team (Slack #payments-oncall). If BCP activated: Notify Store Operations Manager.",
    handoff_note: "SCO payment timeout affecting Store 104. BCP (offline queue) recommended as step 1. Root cause likely TLS cert rotation on gateway. Connection pool restart should resolve. Monitor for 30 min post-fix.",
    reasoning_trace: "[Fallback Mode] This is a pre-computed analysis based on the payment_timeout incident pattern. In production, DeepSeek-R1 would provide a detailed reasoning chain.",
    incidents: [
      { incident_id: "INC-SCO-20240915-0012", service: "pos-payment", severity: "Sev1", symptoms: "Similar gateway timeout pattern during certificate rotation", score: 0.91, resolution: "Connection pool restart + cert chain verification" },
      { incident_id: "INC-SCO-20240803-0008", service: "pos-payment", severity: "Sev2", symptoms: "Payment timeouts after infrastructure maintenance window", score: 0.78, resolution: "Gateway service restart resolved stale connections" },
    ],
    runbooks: [
      { source: "runbooks/payment_timeout.md", section: "Emergency — BCP Activation", content: "1. Enable offline payment queue via POS Admin → Settings → Fallback Mode\n2. Verify store-and-forward is accepting transactions\n3. Notify cashiers that receipts will be delayed", score: 0.94 },
      { source: "runbooks/payment_timeout.md", section: "Root Cause — Connection Pool", content: "Check gateway connection pool status:\n```\ncurl -s https://gateway/admin/pools | jq .active_connections\n```\nIf active_connections is 0 but pending > 10, restart the pool.", score: 0.88 },
      { source: "runbooks/payment_timeout.md", section: "Post-Recovery Monitoring", content: "Monitor dashboard: POS Transaction Success Rate\nThreshold: > 99.5% for 30 minutes\nIf below threshold, escalate to L2.", score: 0.72 },
    ],
  },

  default: {
    probable_category: "unknown",
    root_cause: "Automated root cause analysis unavailable — backend is offline. Based on the reported symptoms, manual investigation is recommended. Check service health dashboards and recent deployment logs.",
    top_causes: [
      "Service degradation due to resource exhaustion",
      "Configuration change or deployment rollout issue",
      "Upstream dependency failure or network connectivity",
    ],
    confidence: 0.45,
    confidence_rationale: "Low confidence — this is a generic fallback analysis generated without access to the full incident database or runbook corpus.",
    action_plan: [
      { step: 1, action: "Check service health dashboard for the affected service", rationale: "Establish current state — confirm whether the service is degraded or fully down." },
      { step: 2, action: "Review recent deployments and config changes (last 2 hours)", rationale: "Most incidents correlate with recent changes. Check deployment pipeline for rollouts." },
      { step: 3, action: "Inspect service logs for error patterns", rationale: "Look for repeated error codes, stack traces, or resource exhaustion warnings." },
      { step: 4, action: "Restart affected service instances if safe", rationale: "A controlled restart often resolves transient issues like connection pool leaks or memory pressure." },
      { step: 5, action: "Escalate to service owner if not resolved in 20 minutes", rationale: "Avoid prolonged manual debugging during active incidents." },
    ],
    escalation_path: "Escalate to the on-call engineer for the affected service. Check PagerDuty rotation for current responder.",
    handoff_note: "Incident reported with backend offline. Generic triage applied. Once backend is restored, re-run analysis for AI-powered root cause identification.",
    reasoning_trace: "[Fallback Mode] Backend API was non-responsive. This generic response was generated from local fallback data. Re-analyse once connectivity is restored for full AI triage.",
    incidents: [],
    runbooks: [
      { source: "runbooks/generic_triage.md", section: "Initial Investigation", content: "1. Check service health dashboard.\n2. Review recent deployments.\n3. Inspect logs for error patterns.", score: 0.85 }
    ],
  },
};

/**
 * Build a complete fallback TriageOutput from an incident payload.
 */
export function buildFallbackResult(incident) {
  const service = incident?.service || "";
  const template = FALLBACK_RESPONSES[service] || FALLBACK_RESPONSES.default;

  return {
    incident_id: incident?.incident_id || "FALLBACK",
    incident_summary: `[Offline Fallback] Triage for ${service || "unknown service"} — ${incident?.severity || "Unknown"} severity. ${incident?.symptoms || "No symptoms provided."}`,
    probable_category: template.probable_category,
    root_cause: template.root_cause,
    top_causes: template.top_causes,
    conflicts: [],
    action_plan: template.action_plan,
    escalation_path: template.escalation_path,
    handoff_note: template.handoff_note,
    confidence: template.confidence,
    confidence_rationale: template.confidence_rationale,
    reasoning_trace: template.reasoning_trace,
    retrieved_runbooks: (template.runbooks || []).map((rb, i) => ({
      id: `fallback-rb-${i}`,
      filename: rb.source,
      pattern_id: rb.section,
      text: rb.content,
      combined_score: rb.score,
      semantic_score: rb.score * 0.95,
      keyword_score: rb.score * 0.85,
    })),
    similar_incidents: template.incidents,
    raw_logs: (incident?.log_snippet || "").split("\n").filter(Boolean).map(line => ({
      time: line.substring(0, 23),
      level: line.includes("ERROR") ? "ERROR" : line.includes("WARN") ? "WARN" : "INFO",
      service: service,
      message: line.substring(24).trim(),
      error_code: (line.match(/\[([A-Z_]+)\]/) || [])[1] || null,
    })),
    entities: { affected_services: [service], primary_error_code: null },
    validation_passed: true,
    validation_notes: ["Fallback mode — validation simulated."],
  };
}

export { FALLBACK_AGENT_EVENTS };
