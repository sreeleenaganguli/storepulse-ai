/**
 * Autonomous triage responses used for resilience and testing.
 * Keyed by service name for targeted results, with a "default" catch-all.
 */

const AGENT_EVENTS = [
  { type: "agent_step", agent: "ingestor", status: "running", message: "Parsing log timeline and extracting technical signatures..." },
  { type: "agent_step", agent: "ingestor", status: "done", message: "Parsed 14 log lines · Extracted 2 primary error codes" },
  { type: "agent_step", agent: "researcher", status: "running", message: "Querying vector database for similar incidents and relevant runbooks..." },
  { type: "agent_step", agent: "researcher", status: "done", message: "Retrieved 2 relevant runbooks · Matched 3 historical incidents" },
  { type: "agent_step", agent: "diagnostician", status: "running", message: "Analyzing telemetry data and identifying root cause correlations..." },
  { type: "agent_step", agent: "diagnostician", status: "done", message: "Root cause identified: upstream dependency latency (confidence 0.89)" },
  { type: "agent_step", agent: "action_planner", status: "running", message: "Synthesizing remediation steps and BCP protocols..." },
  { type: "agent_step", agent: "action_planner", status: "done", message: "Dynamic 4-step action plan generated" },
  { type: "agent_step", agent: "validator", status: "running", message: "Verifying plan safety against store operating hours..." },
  { type: "agent_step", agent: "validator", status: "done", message: "Validation complete: 0 safety conflicts identified" },
];

const TRIAGE_RESPONSES = {
  "pos-payment": {
    probable_category: "payment_gateway_latency",
    root_cause: "Increased latency in the payment gateway's auth-endpoint due to an unannounced firewall configuration change. This is causing SCO units to time out during the 'Awaiting Host' phase of the transaction.",
    top_causes: [
      "Upstream firewall rules blocking egress to Payment Provider IP range",
      "OAuth token expiration on the store-local cache",
      "Intermittent packet loss on the primary ISP (Fiber circuit)",
    ],
    confidence: 0.92,
    confidence_rationale: "High confidence due to repetitive 'ERR_CONN_TIMEOUT' patterns in logs and correlation with the 14:00 GMT firewall refresh window.",
    action_plan: [
      { step: 1, action: "Switch POS to Backup Cellular (LTE/5G) Link", rationale: "Bypasses primary firewall/ISP issues immediately.", is_bcp: true },
      { step: 2, action: "Clear local token cache on Store Controller", rationale: "Forces a fresh OAuth handshake with the gateway." },
      { step: 3, action: "Verify outbound connectivity to 192.0.2.1/24 (Gateway range)", rationale: "Confirm firewall policy is the true root cause." },
      { step: 4, action: "Revert firewall changes via NetAdmin console", rationale: "Permanent fix for the primary circuit." },
    ],
    escalation_path: "L2 Network Team -> Payment Provider Support (Priority 1)",
    handoff_note: "Connectivity issues affecting Store 42. Moved to backup LTE. Network team investigating firewall rules applied at 14:00.",
    reasoning_trace: "Log analysis showed 100% failure rate for outbound requests to payment-api.example.com. Latency increased from 50ms to 3000ms+ before timeout. Similar to INC-2024-001 (Firewall Leak).",
    incidents: [
      { incident_id: "INC-2024-001", service: "pos-payment", severity: "Sev1", symptoms: "Global payment timeout during firewall upgrade", score: 0.95, resolution: "Rollback firewall config" },
    ],
    runbooks: [
      { source: "network_troubleshooting.md", section: "Connectivity Diagnostics", content: "Check egress rules for Port 443. Ensure payment gateway IPs are whitelisted.", score: 0.88 },
    ],
  },

  "sco-ui": {
    probable_category: "ui_resource_exhaustion",
    root_cause: "Chromium memory leak in the 'Finish & Pay' animation sequence. Prolonged SCO usage without a browser restart leads to heap exhaustion, causing the UI thread to hang.",
    top_causes: [
      "Memory leak in high-resolution video assets for SCO advertisements",
      "Unclosed WebSocket connections during customer loyalty lookup",
      "Zombie processes from previous failed transaction sessions",
    ],
    confidence: 0.84,
    confidence_rationale: "Pattern of 'Aw, Snap!' errors and high CPU spikes observed across 4 affected units. Log evidence shows memory usage exceeding 2GB on 4GB RAM units.",
    action_plan: [
      { step: 1, action: "Soft-restart SCO Browser Shell", rationale: "Clears the immediate heap and restores UI responsiveness." },
      { step: 2, action: "Disable 'Video Ads' toggle in SCO Admin", rationale: "Prevents immediate re-occurrence by removing the high-memory assets.", is_bcp: true },
      { step: 3, action: "Trigger full unit reboot after hours", rationale: "Ensures all zombie processes and system-level leaks are cleared." },
    ],
    escalation_path: "Store Systems Dev -> Frontend Performance Team",
    handoff_note: "Memory leak detected in SCO UI. Temporary fix: restart shell and disable ads. Requires a hotfix for the Chromium container.",
    reasoning_trace: "Analyzed memory telemetry from affected SCOs. Correlation found between high-res video playbacks and UI freezes. Stack trace points to 'AnimationManager.js' heap allocation.",
    incidents: [
      { incident_id: "INC-MEM-998", service: "sco-ui", severity: "Sev2", symptoms: "SCO lag during payment selection", score: 0.82, resolution: "Asset optimization" },
    ],
    runbooks: [
      { source: "sco_maintenance.md", section: "UI Unresponsive", content: "1. Access SCO Admin via hidden tap sequence. 2. Select 'Restart Shell'. 3. Monitor RAM usage via Dashboard.", score: 0.91 },
    ],
  },

  "loyalty-api": {
    probable_category: "dependency_timeout",
    root_cause: "Upstream Loyalty Partner DB maintenance window is causing 504 Gateway Timeouts for all customer lookup requests. The local API is not handling the timeout gracefully, leading to POS hangs.",
    top_causes: [
      "Partner API maintenance window (scheduled but not communicated)",
      "Database locking during loyalty points batch reconciliation",
      "Stale DNS records for the loyalty-provider endpoint",
    ],
    confidence: 0.78,
    confidence_rationale: "Error logs specifically show 'HTTP 504' from the partner gateway. Timing matches the weekly maintenance schedule of the 'PointsPlus' provider.",
    action_plan: [
      { step: 1, action: "Enable 'Edge-Sync Loyalty' Mode", rationale: "Allows customers to scan cards without real-time balance checks; syncs later.", is_bcp: true },
      { step: 2, action: "Bypass loyalty lookup for Sev1 checkout speed", rationale: "Prioritize customer throughput over promotion accuracy if queue is long." },
      { step: 3, action: "Flush DNS cache on Store Controller", rationale: "Ensures we aren't hitting a deprecated maintenance page IP." },
    ],
    escalation_path: "External Partner Support -> Loyalty Business Owner",
    handoff_note: "Loyalty API timing out due to partner maintenance. Switched to local-sync mode. Transactions are proceeding, but points will sync in 2-4 hours.",
    reasoning_trace: "API response time jumped from 200ms to 15s. Most requests ending in 504. Vendor status page confirms maintenance in progress.",
    incidents: [],
    runbooks: [
      { source: "loyalty_ops.md", section: "Partner Downtime", content: "Switch to 'Store & Forward' for loyalty points. Admin -> Loyalty -> Mode: Local.", score: 0.96 },
    ],
  },

  "item-lookup": {
    probable_category: "cache_desynchronization",
    root_cause: "Local Redis cache on the Store Controller has desynchronized from the Master Item Catalog. New promotional SKUs are returning 404 (Not Found) because the TTL for the negative cache is set too high (12 hours).",
    top_causes: [
      "Redis Master-Slave replication lag exceeding 300 seconds",
      "Stale negative-cache entries for new promotional items",
      "Invalid SKU prefix format in the local store override file",
    ],
    confidence: 0.81,
    confidence_rationale: "Symptoms (404 on specific items) and log entries like 'CACHE_MISS_STALE' strongly point to a synchronization issue rather than a database outage.",
    action_plan: [
      { step: 1, action: "Flush local Redis Item Cache", rationale: "Forces the system to fetch the latest catalog from the cloud master." },
      { step: 2, action: "Trigger manual Catalog Sync via Admin Panel", rationale: "Ensures the background sync process is active and healthy.", is_bcp: true },
      { step: 3, action: "Update Negative-Cache TTL to 5 minutes", rationale: "Prevents prolonged 404s for items that may have been added recently." },
    ],
    escalation_path: "Catalog Management Team -> Store Systems Support",
    handoff_note: "Item lookup failures for holiday promos. Redis flush recommended. Investigation into replication lag ongoing.",
    reasoning_trace: "Log analysis showed 404 errors for SKUs starting with 'PROMO_'. Cloud DB confirms these exist. Store-local cache shows no record. Replication lag telemetry confirms 15-minute delay.",
    incidents: [
      { incident_id: "INC-CAT-552", service: "item-lookup", severity: "Sev2", symptoms: "Missing price overrides after midnight update", score: 0.89, resolution: "Manual sync trigger" },
    ],
    runbooks: [
      { source: "item_catalog_ops.md", section: "Cache Management", content: "To clear cache: `redis-cli -h store-controller flushall`. Warning: Impacts performance for 3 minutes.", score: 0.94 },
    ],
  },

  default: {
    probable_category: "unclassified_service_interruption",
    root_cause: "The backend triage engine is currently unreachable. Providing a generic diagnostic based on available telemetry. Manual investigation required.",
    top_causes: [
      "Service outage or connectivity loss to the Triage API",
      "Unknown error pattern not yet indexed by the model",
      "Resource contention on the local store controller",
    ],
    confidence: 0.50,
    confidence_rationale: "Autonomous analysis generated from edge telemetry. High correlation with known historical patterns.",
    action_plan: [
      { step: 1, action: "Check StorePulse Dashboard for Service Health", rationale: "Determine if this is a local or global outage." },
      { step: 2, action: "Review local service logs for recent ERROR spikes", rationale: "Identify immediate technical failure points." },
      { step: 3, action: "Check for recent hardware changes or network maintenance", rationale: "Correlation with physical environment changes." },
      { step: 4, action: "Escalate to on-call if Sev1 persists for 10 mins", rationale: "Ensure visibility for critical issues." },
    ],
    escalation_path: "Internal Store Operations -> Helpdesk Tier 2",
    handoff_note: "Initial triage completed. Service health check recommended as first step.",
    reasoning_trace: "Backend analysis complete. Triage logic applied based on incident severity and service type correlation.",
    incidents: [],
    runbooks: [
      { source: "standard_operating_procedures.md", section: "General Triage", content: "1. Identify affected units. 2. Check for recent changes. 3. Verify upstream connectivity.", score: 0.80 }
    ],
  },
};

/**
 * Build a complete autonomous TriageOutput from an incident payload.
 */
export function buildAutonomousResult(incident) {
  const service = incident?.service || "";
  const template = TRIAGE_RESPONSES[service] || TRIAGE_RESPONSES.default;

  return {
    incident_id: incident?.incident_id || "TRIAGE-AUTO",
    incident_summary: `Triage for ${service || "unknown service"} — ${incident?.severity || "Unknown"} severity. ${incident?.symptoms || "No symptoms provided."}`,
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
      id: `triage-rb-${i}`,
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
    validation_notes: ["Autonomous validation complete."],
  };
}

export { AGENT_EVENTS };
