import { History } from "lucide-react";

const SEV_COLORS = {
  Sev1: { bg:"var(--color-error-hl)",   text:"var(--color-error)" },
  Sev2: { bg:"var(--color-warning-hl)", text:"var(--color-warning)" },
  Sev3: { bg:"var(--color-primary-hl)", text:"var(--color-primary)" },
};

export default function SimilarIncidents({ incidents }) {
  if (!incidents || incidents.length === 0) return null;

  return (
    <div className="card p-5 animate-slide-up flex flex-col gap-3" style={{ animationDelay:"0.2s" }}>
      <div className="flex items-center gap-2">
        <History size={13} style={{ color:"var(--color-primary)" }}/>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--color-text-muted)" }}>
          Similar Past Incidents
        </div>
      </div>

      {incidents.map((inc) => {
        const sevStyle = SEV_COLORS[inc.severity] || SEV_COLORS.Sev3;
        const score = inc.score ?? inc.similarity ?? 0;
        const simPct = Math.round(score * 100);
        return (
          <div key={inc.incident_id || inc.id} className="card-inner p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="mono text-xs font-semibold" style={{ color:"var(--color-text-muted)" }}>
                  {inc.incident_id || inc.id}
                </span>
                <span className="badge text-xs" style={{ background:sevStyle.bg, color:sevStyle.text }}>
                  {inc.severity}
                </span>
                <span className="text-xs" style={{ color:"var(--color-text-faint)" }}>{inc.service}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="score-bar w-16">
                  <div className="score-bar-fill" style={{ width:`${simPct}%` }}/>
                </div>
                <span className="text-xs font-bold mono" style={{ color:"var(--color-primary)" }}>
                  {simPct}%
                </span>
              </div>
            </div>
            <p className="text-xs" style={{ color:"var(--color-text)", maxWidth:"55ch" }}>
              {inc.symptoms}
            </p>
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color:"var(--color-text-muted)" }}>Resolved by:</span>
              <span className="mono badge" style={{ background:"var(--color-success-hl)", color:"var(--color-success)", fontSize:"10px" }}>
                {inc.resolution || inc.resolution_code || "N/A"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
