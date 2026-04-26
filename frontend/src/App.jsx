import { useTriageStream } from "./hooks/useTriageStream.js";
import { useHealth } from "./hooks/useHealth.js";
import TopBar from "./components/TopBar.jsx";
import IncidentForm from "./components/IncidentForm.jsx";
import AgentTimeline from "./components/AgentTimeline.jsx";
import ConflictAlert from "./components/ConflictAlert.jsx";
import TriageSummary from "./components/TriageSummary.jsx";
import ActionPlan from "./components/ActionPlan.jsx";
import RunbookPanel from "./components/RunbookPanel.jsx";
import LogViewer from "./components/LogViewer.jsx";
import SimilarIncidents from "./components/SimilarIncidents.jsx";
import { AlertCircle } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";

function SkeletonBlock({ h = "80px" }) {
  return <div className="skeleton rounded-xl w-full" style={{ height: h }}/>;
}

export default function App() {
  const { user } = useAuth();
  const health = useHealth();
  const { state, startTriage, reset, confirm } = useTriageStream();
  const { status, agentEvents, conflicts, result, errorMsg } = state;

  const isStreaming = status === "streaming";
  const isDone      = status === "done";
  const isError     = status === "error";

  return (
    <div style={{ minHeight:"100dvh", background:"var(--color-bg)" }}>
      <TopBar health={health}/>

      <main className="max-w-screen-2xl mx-auto px-4 py-5"
        style={{ display:"grid", gridTemplateColumns:"minmax(420px,520px) 1fr", gap:"20px", alignItems:"start" }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sticky top-20">
          <div className="card p-5">
            <IncidentForm onSubmit={startTriage} onReset={reset} isStreaming={isStreaming}/>
          </div>

          {/* Agent timeline — shows as soon as streaming starts */}
          {user?.role !== 'StoreManager' && (isStreaming || isDone || isError) && (
            <AgentTimeline agentEvents={agentEvents} streamStatus={status}/>
          )}
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Idle state */}
          {status === "idle" && (
            <div className="flex flex-col items-center justify-center text-center py-24 animate-fade-in">
              <div className="mb-4" style={{ opacity:0.2 }}>
                <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="var(--color-primary)"/>
                  <path d="M7 10h18M7 16h11M7 22h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="23" cy="22" r="4.5" fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="2"/>
                  <circle cx="23" cy="22" r="1.5" fill="var(--color-primary)"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color:"var(--color-text-muted)" }}>
                Paste an incident and click <strong style={{ color:"var(--color-text)" }}>Analyse Incident</strong>
              </p>
              <p className="text-xs mt-1" style={{ color:"var(--color-text-faint)" }}>
                Or use a quick-load demo chip on the left
              </p>
            </div>
          )}

          {/* Streaming skeleton */}
          {isStreaming && !result && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <SkeletonBlock h="120px"/>
              <SkeletonBlock h="90px"/>
              <SkeletonBlock h="200px"/>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="card p-6 flex items-start gap-3 animate-slide-up"
              style={{ border:"1.5px solid var(--color-error)", background:"var(--color-error-hl)" }}>
              <AlertCircle size={18} style={{ color:"var(--color-error)", flexShrink:0, marginTop:2 }}/>
              <div>
                <div className="text-sm font-semibold" style={{ color:"var(--color-error)" }}>Pipeline Error</div>
                <div className="text-xs mt-1" style={{ color:"var(--color-text-muted)" }}>
                  {errorMsg || "Unexpected error — check backend logs."}
                </div>
              </div>
            </div>
          )}

          {/* Conflict alert — shown immediately when detected, before full result */}
          {conflicts.length > 0 && <ConflictAlert conflicts={conflicts}/>}

          {/* Full result */}
          {result && (
            <>
              <TriageSummary result={result}/>
              <ActionPlan result={result} onConfirm={confirm}/>
              {user?.role === 'DevOpsEng' && <RunbookPanel chunks={result.retrieved_runbooks}/>}
              <LogViewer logs={result.raw_logs}/>
              <SimilarIncidents incidents={result.similar_incidents}/>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
