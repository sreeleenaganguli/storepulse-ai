import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-16 flex-shrink-0" style={{ color:"var(--color-text-faint)" }}>{label}</span>
      <div className="score-bar flex-1">
        <div className="score-bar-fill" style={{ width:`${Math.round(value*100)}%`, background:color }}/>
      </div>
      <span className="text-xs mono w-8 text-right" style={{ color }}>{Math.round(value*100)}%</span>
    </div>
  );
}

export default function RunbookPanel({ chunks }) {
  const [expanded, setExpanded] = useState(null);
  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="card p-5 animate-slide-up flex flex-col gap-3" style={{ animationDelay:"0.15s" }}>
      <div className="flex items-center gap-2">
        <BookOpen size={13} style={{ color:"var(--color-primary)" }}/>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--color-text-muted)" }}>
          Retrieved Runbook Evidence
        </div>
      </div>

      {chunks.map((chunk, i) => (
        <div key={chunk.id} className="rounded-xl overflow-hidden"
          style={{ border:`1.5px solid ${i === 0 ? "var(--color-primary)" : "var(--color-border)"}` }}>

          {/* Header */}
          <button onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
            style={{ background: i === 0 ? "var(--color-primary-hl)" : "var(--color-surface-2)",
                     border:"none", cursor:"pointer" }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background:"var(--color-primary)", color:"#fff" }}>
                {i+1}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color:"var(--color-text)" }}>
                  {chunk.filename}
                </div>
                <div className="text-xs mono" style={{ color:"var(--color-text-muted)" }}>
                  {chunk.pattern_id}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold mono" style={{ color:"var(--color-primary)" }}>
                {Math.round(chunk.combined_score * 100)}%
              </span>
              {expanded === i ? <ChevronDown size={12} style={{ color:"var(--color-text-muted)" }}/> 
                              : <ChevronRight size={12} style={{ color:"var(--color-text-muted)" }}/>}
            </div>
          </button>

          {/* Score bars */}
          <div className="px-4 py-2 flex flex-col gap-1.5"
            style={{ background:"var(--color-surface-2)", borderTop:"1px solid var(--color-border)" }}>
            <ScoreBar label="Combined" value={chunk.combined_score} color="var(--color-primary)"/>
            <ScoreBar label="Semantic" value={chunk.semantic_score} color="var(--color-success)"/>
            <ScoreBar label="Keyword"  value={chunk.keyword_score}  color="var(--color-warning)"/>
          </div>

          {/* Chunk text */}
          {expanded === i && (
            <div className="px-4 py-3 animate-fade-in"
              style={{ background:"var(--color-bg)", borderTop:"1px solid var(--color-border)" }}>
              <pre className="text-xs whitespace-pre-wrap leading-relaxed"
                style={{ color:"var(--color-text)", fontFamily:"inherit", maxHeight:"200px", overflowY:"auto" }}>
                {chunk.text}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
