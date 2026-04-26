import { useState, useRef, useCallback } from "react";
import { Send, Zap, RotateCcw, AlertTriangle, Server, Clock, UploadCloud, Database, FileText, X, ChevronDown } from "lucide-react";
import { DEMO_INCIDENTS } from "../lib/demoIncidents.js";

const SERVICES = ["pos-payment", "sco-ui", "receipt-service", "printer-daemon",
  "scan-service", "item-lookup", "loyalty-api", "customer-profile",
  "promo-engine", "basket-service", "store-network", "payment-gateway"];
const SEVERITIES = ["Sev1", "Sev2", "Sev3"];

const SEV_META = {
  Sev1: { label: "Critical", color: "#f43f5e", bg: "rgba(244,63,94,0.12)", icon: <AlertTriangle size={10} />, desc: "Revenue impact" },
  Sev2: { label: "Major", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Server size={10} />, desc: "Degraded" },
  Sev3: { label: "Minor", color: "#00d4ff", bg: "rgba(0,212,255,0.12)", icon: <Clock size={10} />, desc: "Low impact" },
};

const EMPTY = {
  incident_id: "", service: "pos-payment", severity: "Sev2",
  symptoms: "", created: new Date().toISOString().slice(0, 19) + "Z", log_file_reference: []
};

export default function IncidentForm({ onSubmit, onReset, isStreaming }) {
  const [form, setForm] = useState(EMPTY);
  const [activeDemo, setActiveDemo] = useState(null);
  const [showIngest, setShowIngest] = useState(true);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadDemo = (demo, idx) => {
    setForm({ ...demo.incident });
    setActiveDemo(idx);
    setTimeout(() => setActiveDemo(null), 800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symptoms.trim()) return;
    // Include the ingested files in the payload
    const payload = {
      ...form,
      log_file_reference: files
    };
    console.log("Form submitted:", payload);
    onSubmit(payload);
  };

  const handleReset = () => { setForm(EMPTY); onReset(); setActiveDemo(null); setFiles([]); };

  // ── File handling ──────────────────────────────────────────────────
  const ACCEPTED = [".jsonl", ".json", ".txt", ".log", ".md"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const parseAndApplyFile = useCallback(async (file) => {
    const text = await file.text();
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "jsonl") {
      try {
        const firstLine = text.split("\n").find(l => l.trim());
        if (firstLine) {
          const obj = JSON.parse(firstLine);
          if (obj.symptoms) set("symptoms", obj.symptoms);
          if (obj.service) set("service", obj.service);
          if (obj.severity) set("severity", obj.severity);
          if (obj.incident_id) set("incident_id", obj.incident_id);
        }
      } catch { /* skip */ }
    } else if (ext === "txt" || ext === "log") {
      // Logic for log_snippet removed as per request
    } else if (ext === "md") {
      if (!form.symptoms.trim()) {
        set("symptoms", `[Runbook attached: ${file.name}] Review uploaded runbook for context.`);
      }
    }
  }, [form.symptoms]);

  const handleFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      return ACCEPTED.includes(ext) && f.size <= MAX_SIZE;
    });
    setFiles(prev => [...prev, ...valid]);
    valid.forEach(f => parseAndApplyFile(f));
  }, [parseAndApplyFile]);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const onDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const seedDemoData = () => {
    const demo = DEMO_INCIDENTS[0];
    setForm({ ...demo.incident });
    setFiles([new File([JSON.stringify(demo.incident)], "seed_incident.jsonl", { type: "application/jsonl" })]);
  };

  const sev = SEV_META[form.severity] || SEV_META.Sev2;
  const formReady = form.symptoms.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 h-full">

      <form onSubmit={handleSubmit} id="incident-form" className="hidden" />

      {/* ── Demo Chips ──────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-medium mb-1.5 flex items-center gap-1.5"
          style={{ color: "var(--color-text-muted)" }}>
          <Zap size={10} style={{ color: "#f59e0b" }} /> Quick-load demo
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_INCIDENTS.map((d, i) => {
            const isActive = activeDemo === i;
            const chipColor = d.color === "error" ? "#f43f5e" : d.color === "warning" ? "#f59e0b" : "#00d4ff";
            return (
              <button key={i} onClick={() => loadDemo(d, i)} disabled={isStreaming}
                className="text-[11px] py-1 px-2.5 rounded-md font-medium transition-all duration-300"
                style={{
                  background: isActive ? chipColor + "20" : "var(--color-surface-2)",
                  border: `1px solid ${isActive ? chipColor : "var(--color-border)"}`,
                  color: isActive ? chipColor : "var(--color-text-muted)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  cursor: isStreaming ? "not-allowed" : "pointer",
                  opacity: isStreaming ? 0.5 : 1,
                }}>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--color-divider)" }} />

      {/* ── Collapsible Ingest Data ─────────────────────────────────── */}
      <div>
        <button type="button" onClick={() => setShowIngest(s => !s)}
          className="w-full flex items-center justify-between py-1 transition-colors"
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "var(--color-primary-hl)" }}>
              <UploadCloud size={11} style={{ color: "var(--color-primary)" }} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>Ingest Data</span>
            {files.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--color-primary-hl)", color: "var(--color-primary)" }}>
                {files.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); seedDemoData(); }} disabled={isStreaming}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all hover:scale-105"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
              <Database size={10} /> Seed
            </button>
            <ChevronDown size={14} style={{ color: "var(--color-text-faint)", transition: "transform 0.2s", transform: showIngest ? "rotate(180deg)" : "rotate(0)" }} />
          </div>
        </button>

        <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: showIngest ? "300px" : "0", opacity: showIngest ? 1 : 0 }}>
          <div className="pt-2">
            {/* Drop zone */}
            <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
              style={{
                border: `2px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isDragging ? "var(--color-primary-hl)" : "transparent",
              }}>
              <UploadCloud size={22} style={{
                color: isDragging ? "var(--color-primary)" : "var(--color-text-faint)",
                transition: "transform 0.2s",
                transform: isDragging ? "translateY(-3px) scale(1.1)" : "none",
              }} />
              <div className="text-[11px] font-semibold text-center" style={{ color: "var(--color-text)" }}>
                Drag & drop files here, or click to select
              </div>
              <div className="text-[9px] text-center" style={{ color: "var(--color-text-faint)" }}>
                .jsonl, .json, .txt, .log, .md (Max 10MB)
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".jsonl,.json,.txt,.log,.md"
                className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
            </div>

            {/* Attached files */}
            {files.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-md animate-fade-in"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText size={12} style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
                      <span className="text-[11px] truncate" style={{ color: "var(--color-text)" }}>{f.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)}
                      className="p-0.5 rounded transition-colors hover:text-rose-400 flex-shrink-0"
                      style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--color-divider)" }} />

      {/* ── Core Form Fields ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--color-text-faint)" }}>Incident ID</label>
            <input form="incident-form" className="w-full px-2.5 py-1.5 rounded-md text-xs mono focus:outline-none transition-colors"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              value={form.incident_id} onChange={e => set("incident_id", e.target.value)}
              placeholder="INC-SCO-20241115-0019" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--color-text-faint)" }}>Service</label>
            <select form="incident-form" className="w-full px-2.5 py-1.5 rounded-md text-xs focus:outline-none transition-colors"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              value={form.service} onChange={e => set("service", e.target.value)}>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Severity — compact toggle */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--color-text-faint)" }}>Severity</label>
          <div className="flex gap-1">
            {SEVERITIES.map(s => {
              const meta = SEV_META[s];
              const isSelected = form.severity === s;
              return (
                <button key={s} type="button"
                  onClick={() => set("severity", s)}
                  className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 flex items-center justify-center gap-1"
                  style={{
                    background: isSelected ? meta.bg : "var(--color-surface-2)",
                    border: `1.5px solid ${isSelected ? meta.color : "var(--color-border)"}`,
                    color: isSelected ? meta.color : "var(--color-text-faint)",
                  }}>
                  {isSelected && meta.icon} {s} {isSelected && <span className="font-normal">· {meta.desc}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Symptoms */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--color-text-faint)" }}>
              Symptoms <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <span className="text-[9px] tabular-nums" style={{ color: form.symptoms.length > 0 ? "var(--color-success)" : "var(--color-text-faint)" }}>
              {form.symptoms.length} chars
            </span>
          </div>
          <textarea form="incident-form" rows={2} className="w-full px-2.5 py-1.5 rounded-md text-xs resize-none focus:outline-none transition-colors"
            style={{
              background: "var(--color-surface-2)",
              border: `1px solid ${form.symptoms.trim() ? "var(--color-success)" : "var(--color-border)"}`,
              color: "var(--color-text)",
            }}
            value={form.symptoms} onChange={e => set("symptoms", e.target.value)}
            placeholder="Describe what is failing, how many units affected…" />
        </div>

      </div>

      {/* ── Action Button & Readiness Bar — Bottom ──────────────────── */}
      <div style={{ height: "1px", background: "var(--color-divider)" }} />
      <div className="flex flex-col gap-2 mt-auto">
        {/* Readiness bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (form.incident_id ? 20 : 0) + (form.symptoms.trim() ? 60 : 0) + (form.created ? 20 : 0))}%`,
                background: formReady ? "var(--color-success)" : "var(--color-warning)",
              }} />
          </div>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: formReady ? "var(--color-success)" : "var(--color-text-faint)" }}>
            {formReady ? "Ready" : "Fill symptoms"}
          </span>
        </div>

        <div className="flex gap-2">
          <button type="submit" form="incident-form" disabled={isStreaming || !formReady}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 transition-all duration-200"
            style={{ opacity: formReady ? 1 : 0.6 }}>
            {isStreaming
              ? <><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />Analysing…</>
              : <><Send size={14} />Analyse Incident</>}
          </button>
          <button type="button" onClick={handleReset}
            className="btn btn-ghost px-3 hover:text-rose-400 transition-colors" title="Reset">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
