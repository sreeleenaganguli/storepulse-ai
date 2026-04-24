import { useState } from "react";
import { Terminal, Filter } from "lucide-react";

const LEVEL_STYLE = {
  ERROR: { color:"var(--color-error)",   bg:"var(--color-error-hl)" },
  WARN:  { color:"var(--color-warning)", bg:"var(--color-warning-hl)" },
  INFO:  { color:"var(--color-success)", bg:"var(--color-success-hl)" },
};

function highlightCodes(message) {
  const parts = message.split(/([A-Z][A-Z0-9_]{3,})/g);
  return parts.map((part, i) =>
    /^[A-Z][A-Z0-9_]{3,}$/.test(part)
      ? <span key={i} style={{ color:"var(--color-primary)", fontWeight:600 }}>{part}</span>
      : part
  );
}

export default function LogViewer({ logs }) {
  const [filter, setFilter] = useState("ALL");
  if (!logs || logs.length === 0) return null;

  const filtered = filter === "ALL" ? logs : logs.filter(l => l.level === filter);

  return (
    <div className="card p-5 animate-slide-up flex flex-col gap-3" style={{ animationDelay:"0.25s" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={13} style={{ color:"var(--color-primary)" }}/>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--color-text-muted)" }}>
            Log Timeline
          </div>
          <span className="badge text-xs" style={{ background:"var(--color-surface-offset)", color:"var(--color-text-muted)" }}>
            {logs.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Filter size={11} style={{ color:"var(--color-text-faint)" }}/>
          {["ALL","ERROR","WARN","INFO"].map(l => (
            <button key={l} onClick={() => setFilter(l)}
              className="text-xs px-2 py-0.5 rounded-md transition-all"
              style={{
                background: filter === l ? "var(--color-primary)" : "transparent",
                color: filter === l ? "#fff" : "var(--color-text-muted)",
                border:"none", cursor:"pointer", fontSize:"10px", fontWeight:600
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg overflow-auto" style={{ maxHeight:"240px", background:"var(--color-bg)", border:"1px solid var(--color-border)" }}>
        <table className="w-full text-xs" style={{ borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--color-surface-offset)", position:"sticky", top:0 }}>
              {["Time","Level","Service","Message"].map(h => (
                <th key={h} className="text-left px-3 py-2 font-semibold"
                  style={{ color:"var(--color-text-muted)", borderBottom:"1px solid var(--color-border)", whiteSpace:"nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => {
              const ls = LEVEL_STYLE[log.level] || LEVEL_STYLE.INFO;
              return (
                <tr key={i} style={{ borderBottom:"1px solid var(--color-divider)" }}>
                  <td className="px-3 py-1.5 mono whitespace-nowrap" style={{ color:"var(--color-text-faint)" }}>
                    {log.time?.slice(11,19) || ""}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="badge" style={{ background:ls.bg, color:ls.color, fontSize:"9px" }}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 mono whitespace-nowrap" style={{ color:"var(--color-text-muted)" }}>
                    {log.service}
                  </td>
                  <td className="px-3 py-1.5" style={{ color:"var(--color-text)" }}>
                    {highlightCodes(log.message || "")}
                    {log.error_code && (
                      <span className="ml-2 mono" style={{ color:"var(--color-primary)", fontSize:"10px" }}>
                        [{log.error_code}]
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-xs" style={{ color:"var(--color-text-faint)" }}>
            No {filter} entries in this window
          </div>
        )}
      </div>
    </div>
  );
}
