import { CheckCircle, Circle, AlertTriangle, Loader } from "lucide-react";

const AGENT_META = {
  ingestor:      { label: "Ingestor",       desc: "Entity extraction & log parsing",   color: "#4f98a3" },
  researcher:    { label: "Researcher",      desc: "Hybrid semantic + BM25 retrieval",  color: "#6daa45" },
  diagnostician: { label: "Diagnostician",  desc: "Conflict detection & root cause",   color: "#d163a7" },
  action_planner:{ label: "Action Planner", desc: "5-step structured action plan",     color: "#bb653b" },
  validator:     { label: "Validator",       desc: "6-rule deterministic checks",       color: "#4f98a3" },
};

const AGENT_ORDER = ["ingestor","researcher","diagnostician","action_planner","validator"];

function getAgentStatus(agentEvents, agentKey) {
  const events = agentEvents.filter(e => e.agent === agentKey);
  if (!events.length) return "pending";
  if (events.some(e => e.status === "done" || e.status === "failed")) {
    return events.some(e => e.status === "failed") ? "failed" : "done";
  }
  return "running";
}

function getLastMessage(agentEvents, agentKey) {
  const events = agentEvents.filter(e => e.agent === agentKey && e.message);
  return events.length ? events[events.length - 1].message : null;
}

export default function AgentTimeline({ agentEvents, streamStatus }) {
  const conflicts = agentEvents.filter(e => e.type === "conflict_detected");

  return (
    <div className="card p-4 animate-fade-in">
      <div className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color:"var(--color-text-muted)" }}>Agent Pipeline</div>

      <div className="flex flex-col gap-1">
        {AGENT_ORDER.map((key, idx) => {
          const meta = AGENT_META[key];
          const status = getAgentStatus(agentEvents, key);
          const msg = getLastMessage(agentEvents, key);

          return (
            <div key={key}>
              <div className="flex items-start gap-3 py-2">
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {status === "done" && <CheckCircle size={15} style={{ color:"var(--color-success)" }}/>}
                  {status === "running" && <Loader size={15} className="animate-spin" style={{ color:meta.color }}/>}
                  {status === "failed" && <AlertTriangle size={15} style={{ color:"var(--color-error)" }}/>}
                  {status === "pending" && <Circle size={15} style={{ color:"var(--color-text-faint)" }}/>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: status === "pending" ? "var(--color-text-faint)" : "var(--color-text)" }}>
                      {meta.label}
                    </span>
                    {status === "running" && (
                      <span className="badge text-xs animate-pulse-soft"
                        style={{ background:"var(--color-primary-hl)", color:"var(--color-primary)", fontSize:"10px" }}>
                        running
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color:"var(--color-text-muted)" }}>
                    {msg || meta.desc}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {idx < AGENT_ORDER.length - 1 && (
                <div className="ml-[7px] w-px h-2" style={{ background:"var(--color-divider)" }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Conflict alerts inline */}
      {conflicts.map((c, i) => (
        <div key={i} className="mt-3 p-3 rounded-lg animate-conflict animate-slide-up"
          style={{ background:"var(--color-warning-hl)", border:"1px solid var(--color-warning)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color:"var(--color-warning)" }}>
            <AlertTriangle size={12}/> Conflict Detected
          </div>
          <div className="text-xs mt-1" style={{ color:"var(--color-text)" }}>
            <span className="mono" style={{ color:"var(--color-warning)" }}>{c.log_error_code}</span>
            {" "}&mdash; {c.interpretation}
          </div>
        </div>
      ))}

      {/* Done state */}
      {streamStatus === "done" && (
        <div className="mt-3 p-2 rounded-lg text-xs text-center animate-fade-in"
          style={{ background:"var(--color-success-hl)", color:"var(--color-success)" }}>
          ✅ Triage complete
        </div>
      )}
      {streamStatus === "error" && (
        <div className="mt-3 p-2 rounded-lg text-xs text-center animate-fade-in"
          style={{ background:"var(--color-error-hl)", color:"var(--color-error)" }}>
          ❌ Pipeline error — check backend logs
        </div>
      )}
    </div>
  );
}
