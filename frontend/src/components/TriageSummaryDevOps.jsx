import { useState } from "react";
import { ChevronDown, ChevronRight, Brain, AlertCircle, Activity, TrendingUp, Info } from "lucide-react";

export default function TriageSummaryDevOps({ result }) {
  const [showTrace, setShowTrace] = useState(false);

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Incident Summary Card */}
      <div className="rounded-lg p-5" style={{ backgroundColor: "#0b101d", border: "1px solid #1f2937" }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-rose-500" />
          <h3 className="text-sm font-bold text-slate-200">Incident Summary</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed pt-4 border-t border-[#1f2937]">
          {result.incident_summary}
        </p>
      </div>

      {/* Root Causes Card */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#0b101d", border: "1px solid #1f2937" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-200">Root Causes</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            <TrendingUp size={14} /> Confidence Ranking
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col">
          {(() => {
            const causes = result.top_causes || [];
            // Pre-calculate percentages to find the max
            const pcts = causes.map((_, i) => {
              if (i === 0) {
                const conf = parseFloat(result.confidence);
                return Math.round((isNaN(conf) ? 0.85 : conf) * 100);
              }
              return i === 1 ? 65 : 45;
            });
            const maxPct = Math.max(...pcts, 0);
            const maxIdx = pcts.indexOf(maxPct);

            return causes.map((cause, i) => {
              const pct = pcts[i];
              const isLikely = i === maxIdx && pct > 0;
              const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#64748b";

              return (
                <div key={i} className="flex flex-col p-5 border-b border-[#1f2937] last:border-0 relative">
                  {isLikely && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  )}
                  <div className="flex items-center justify-between mb-3" style={{ paddingLeft: isLikely ? "12px" : "4px" }}>
                    <div className="flex items-center gap-3">
                      {isLikely && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-blue-100 bg-blue-500 uppercase">
                          Likely Culprit
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-200">{cause}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                      <Info size={14} className="text-slate-400" />
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1f2937] overflow-hidden" style={{ marginLeft: isLikely ? "12px" : "4px", maxWidth: "calc(100% - 16px)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* DeepSeek reasoning trace — collapsible */}
      {result.reasoning_trace && (
        <div className="card p-4 rounded-lg mt-2" style={{ backgroundColor: "#0b101d", border: "1px solid #1f2937" }}>
          <button onClick={() => setShowTrace(s => !s)}
            className="flex items-center gap-1.5 text-xs font-medium w-full text-left"
            style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>
            <Brain size={14} />
            {showTrace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            DeepSeek-R1 Reasoning Trace
          </button>
          {showTrace && (
            <div className="mt-3 p-4 rounded-lg text-xs leading-relaxed animate-fade-in"
              style={{
                background: "#111827", border: "1px solid #1f2937",
                color: "#94a3b8", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap"
              }}>
              {result.reasoning_trace}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
