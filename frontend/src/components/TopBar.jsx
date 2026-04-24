import { Sun, Moon, Activity } from "lucide-react";
import { useState, useEffect } from "react";

export default function TopBar({ health }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <header style={{ background:"var(--color-surface)", borderBottom:"1px solid var(--color-border)" }}
      className="sticky top-0 z-50 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* SVG Logo */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="StorePulse AI">
          <rect width="32" height="32" rx="8" fill="var(--color-primary)"/>
          <path d="M7 10h18M7 16h11M7 22h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="23" cy="22" r="4.5" fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="2"/>
          <circle cx="23" cy="22" r="1.5" fill="var(--color-primary)"/>
        </svg>
        <div>
          <div className="font-semibold text-sm" style={{ color:"var(--color-text)" }}>StorePulse AI</div>
          <div className="text-xs" style={{ color:"var(--color-text-muted)" }}>Incident Triage Copilot</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Health indicator */}
        <div className="flex items-center gap-2 text-xs" style={{ color:"var(--color-text-muted)" }}>
          <span className={`w-2 h-2 rounded-full ${health.checking ? "animate-pulse-soft" : ""}`}
            style={{ background: health.online ? "var(--color-success)" : health.checking ? "var(--color-warning)" : "#666" }}/>
          {health.checking ? "Connecting..." : health.online
            ? `Backend online · ${health.runbook_chunks || 0} chunks · ${health.incidents_indexed || 0} incidents`
            : "Backend offline"}
        </div>

        {/* Theme toggle */}
        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          className="btn btn-ghost p-2" aria-label="Toggle theme"
          style={{ borderRadius:"8px" }}>
          {theme === "dark"
            ? <Sun size={15} style={{ color:"var(--color-text-muted)" }}/>
            : <Moon size={15} style={{ color:"var(--color-text-muted)" }}/>}
        </button>
      </div>
    </header>
  );
}
