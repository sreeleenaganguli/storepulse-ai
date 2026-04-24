import { AlertTriangle, ArrowRight } from "lucide-react";

export default function ConflictAlert({ conflicts }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="animate-slide-up" style={{ animationDelay:"0.05s" }}>
      <div className="p-4 rounded-xl animate-conflict"
        style={{ background:"var(--color-warning-hl)", border:"1.5px solid var(--color-warning)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} style={{ color:"var(--color-warning)" }}/>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--color-warning)" }}>
            Conflict Detected — Runbook Redirected
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {conflicts.map((c, i) => (
            <div key={i} className="rounded-lg p-3"
              style={{ background:"rgba(0,0,0,0.08)", border:"1px solid var(--color-warning)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono badge" style={{ background:"var(--color-warning)", color:"#fff", fontSize:"11px" }}>
                  {c.log_error_code}
                </span>
                <span className="text-xs" style={{ color:"var(--color-text-muted)" }}>not in service taxonomy</span>
                <ArrowRight size={11} style={{ color:"var(--color-warning)" }}/>
                <span className="text-xs font-medium" style={{ color:"var(--color-text)" }}>
                  {c.interpretation}
                </span>
              </div>
              {c.runbook_expects?.length > 0 && (
                <div className="mt-2 text-xs" style={{ color:"var(--color-text-muted)" }}>
                  Expected codes for this service:{" "}
                  {c.runbook_expects.map((code, j) => (
                    <span key={j} className="mono mx-0.5 px-1.5 py-0.5 rounded"
                      style={{ background:"var(--color-surface-offset)", fontSize:"11px" }}>
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
