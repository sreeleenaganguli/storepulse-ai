import { Activity, Home, LogOut } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function TopBar({ health }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{ background:"var(--color-surface)", borderBottom:"1px solid var(--color-border)" }}
      className="sticky top-0 z-50 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors p-2 rounded-lg bg-[#111827] border border-[#1f2937] hover:bg-[#1e293b]"
        >
          <Home size={14} /> Back to Home
        </button>
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
      </div>

      <div className="flex items-center gap-6">
        {/* Health indicator */}
        <div className="flex items-center gap-2 text-xs" style={{ color:"var(--color-text-muted)" }}>
          <span className={`w-2 h-2 rounded-full ${health.checking ? "animate-pulse-soft" : ""}`}
            style={{ background: health.online ? "var(--color-success)" : health.checking ? "var(--color-warning)" : "#666" }}/>
          {health.checking ? "Connecting..." : health.online
            ? `Backend online · ${health.runbook_chunks || 0} chunks · ${health.incidents_indexed || 0} incidents`
            : "Backend offline"}
        </div>

        {/* Auth status & actions */}
        {user && (
          <div className="flex items-center gap-4 pl-6 border-l border-[#1f2937]">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-cyan-400 font-mono bg-cyan-900/30 px-1.5 py-0.5 rounded uppercase">{user.role}</div>
            </div>
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-lg bg-[#111827] border border-[#1f2937] hover:bg-[#1e293b] hover:text-rose-400 text-slate-400 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
