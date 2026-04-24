import { useState } from "react";
import { Send, Zap, RotateCcw } from "lucide-react";
import { DEMO_INCIDENTS } from "../lib/demoIncidents.js";

const SERVICES = ["pos-payment","sco-ui","receipt-service","printer-daemon",
                  "scan-service","item-lookup","loyalty-api","customer-profile",
                  "promo-engine","basket-service","store-network","payment-gateway"];
const SEVERITIES = ["Sev1","Sev2","Sev3"];

const EMPTY = { incident_id:"", service:"pos-payment", severity:"Sev2",
                symptoms:"", created: new Date().toISOString().slice(0,19)+"Z", log_snippet:"" };

export default function IncidentForm({ onSubmit, onReset, isStreaming }) {
  const [form, setForm] = useState(EMPTY);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadDemo = (demo) => setForm({ ...demo.incident });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symptoms.trim()) return;
    onSubmit(form);
  };

  const handleReset = () => { setForm(EMPTY); onReset(); };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Demo chips */}
      <div>
        <div className="text-xs font-medium mb-2 flex items-center gap-1.5"
          style={{ color:"var(--color-text-muted)" }}>
          <Zap size={12}/> Quick-load demo scenario
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_INCIDENTS.map((d, i) => (
            <button key={i} onClick={() => loadDemo(d)} disabled={isStreaming}
              className="btn btn-ghost text-xs py-1 px-3"
              style={{ fontSize:"11px" }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height:"1px", background:"var(--color-divider)" }}/>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>Incident ID</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm mono"
              style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}
              value={form.incident_id} onChange={e => set("incident_id", e.target.value)}
              placeholder="INC-SCO-20241115-0019" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>Created</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm mono"
              style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}
              value={form.created} onChange={e => set("created", e.target.value)}
              placeholder="2024-11-15T13:22:00Z" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>Service</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}
              value={form.service} onChange={e => set("service", e.target.value)}>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>Severity</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}
              value={form.severity} onChange={e => set("severity", e.target.value)}>
              {SEVERITIES.map(s => (
                <option key={s} value={s}>{s}{s==="Sev1" ? " — Critical" : s==="Sev2" ? " — Major" : " — Minor"}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>
            Symptoms <span style={{ color:"var(--color-error)" }}>*</span>
          </label>
          <textarea rows={4} className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{ background:"var(--color-surface-2)", border:"1px solid var(--color-border)", color:"var(--color-text)" }}
            value={form.symptoms} onChange={e => set("symptoms", e.target.value)}
            placeholder="Describe what is failing, how many units affected, what the customer sees…" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color:"var(--color-text-muted)" }}>
            Log Snippet <span style={{ color:"var(--color-text-faint)" }}>(paste raw lines)</span>
          </label>
          <textarea rows={6} className="w-full px-3 py-2 rounded-lg text-xs mono resize-none"
            style={{ background:"var(--color-bg)", border:"1px solid var(--color-border)", color:"var(--color-text)", lineHeight:"1.7" }}
            value={form.log_snippet || ""} onChange={e => set("log_snippet", e.target.value)}
            placeholder={"2024-11-15T13:21:44Z ERROR pos-payment Gateway timed out [GW_TIMEOUT_503]\n..."} />
        </div>

        <div className="flex gap-2 mt-auto pt-2">
          <button type="submit" disabled={isStreaming || !form.symptoms.trim()}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2">
            {isStreaming
              ? <><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"/>Analysing…</>
              : <><Send size={14}/>Analyse Incident</>}
          </button>
          <button type="button" onClick={handleReset}
            className="btn btn-ghost px-3" title="Reset">
            <RotateCcw size={14}/>
          </button>
        </div>
      </form>
    </div>
  );
}
