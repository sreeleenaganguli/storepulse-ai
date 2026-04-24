import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

const CATEGORY_LABELS = {
  payment_timeout:          { label:"Payment Timeout",          color:"var(--color-error)" },
  receipt_printer_failure:  { label:"Receipt Printer Failure",  color:"var(--color-warning)" },
  barcode_scanner_issue:    { label:"Barcode Scanner Issue",    color:"var(--color-warning)" },
  loyalty_api_unavailable:  { label:"Loyalty API Unavailable",  color:"var(--color-primary)" },
  promotion_engine_latency: { label:"Promo Engine Latency",     color:"var(--color-primary)" },
  store_network_flap:       { label:"Store Network Flap",       color:"var(--color-error)" },
  unknown:                  { label:"Unknown",                  color:"var(--color-text-muted)" },
};

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "var(--color-success)" : pct >= 60 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <div className="flex items-center gap-3">
      <div className="score-bar flex-1">
        <div className="score-bar-fill" style={{ width:`${pct}%`, background:color, transition:"width 0.8s cubic-bezier(0.16,1,0.3,1)" }}/>
      </div>
      <span className="text-sm font-bold mono" style={{ color, minWidth:"36px" }}>{pct}%</span>
    </div>
  );
}

export default function TriageSummary({ result }) {
  const [showTrace, setShowTrace] = useState(false);
  const cat = CATEGORY_LABELS[result.probable_category] || CATEGORY_LABELS.unknown;

  return (
    <div className="card p-5 animate-slide-up flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color:"var(--color-text-muted)" }}>Incident Summary</div>
          <p className="text-sm leading-relaxed" style={{ color:"var(--color-text)", maxWidth:"60ch" }}>
            {result.incident_summary}
          </p>
        </div>
        <span className="badge flex-shrink-0 text-xs px-3 py-1"
          style={{ background:`color-mix(in srgb, ${cat.color} 15%, transparent)`, color:cat.color, border:`1px solid ${cat.color}` }}>
          {cat.label}
        </span>
      </div>

      <div style={{ height:"1px", background:"var(--color-divider)" }}/>

      {/* Root cause */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color:"var(--color-text-muted)" }}>Root Cause</div>
        <div className="p-3 rounded-lg text-sm"
          style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}>
          {result.root_cause}
        </div>
      </div>

      {/* Top causes */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color:"var(--color-text-muted)" }}>Top 3 Likely Causes</div>
        <ol className="flex flex-col gap-2">
          {result.top_causes?.map((cause, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                style={{ background:"var(--color-primary-hl)", color:"var(--color-primary)" }}>
                {i+1}
              </span>
              <span style={{ color:"var(--color-text)" }}>{cause}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--color-text-muted)" }}>
            Confidence
          </div>
        </div>
        <ConfidenceBar value={result.confidence}/>
        {result.confidence_rationale && (
          <p className="text-xs mt-2" style={{ color:"var(--color-text-muted)" }}>
            {result.confidence_rationale}
          </p>
        )}
      </div>

      {/* DeepSeek reasoning trace — collapsible */}
      {result.reasoning_trace && (
        <div>
          <button onClick={() => setShowTrace(s => !s)}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color:"var(--color-primary)", background:"none", border:"none", cursor:"pointer" }}>
            <Brain size={12}/>
            {showTrace ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            DeepSeek-R1 Reasoning Trace
          </button>
          {showTrace && (
            <div className="mt-2 p-3 rounded-lg text-xs leading-relaxed animate-fade-in"
              style={{ background:"var(--color-bg)", border:"1px solid var(--color-border)",
                       color:"var(--color-text-muted)", fontFamily:"var(--font-mono)", whiteSpace:"pre-wrap" }}>
              {result.reasoning_trace}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
