import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useHealth } from "./hooks/useHealth";
import { ArrowRight, Activity, Shield, Lock, Zap, LogOut, Layers, BarChart3, Eye, GitBranch } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const health = useHealth();

  // Force dark theme for the landing page
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div className="min-h-screen font-sans text-white" style={{ backgroundColor: "#060a11" }}>
      {/* Header */}
      <header className="flex items-center justify-center pt-6 px-4">
        <div className="flex items-center justify-between px-6 py-3 rounded-full w-full max-w-6xl" style={{ backgroundColor: "#0e1526", border: "1px solid #1f2937" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: "#1e293b" }}>
              <Activity size={16} className="text-cyan-400" />
            </div>
            <span className="font-semibold text-sm tracking-wide">StorePulse AI</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-xs text-slate-400 font-medium">Hello, {user.name.split(' ')[0]}</span>
                <button 
                  onClick={logout}
                  className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-rose-400 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Log in</button>
            )}
            <button 
              onClick={() => navigate('/console')}
              className="text-xs font-semibold px-4 py-2 rounded-full text-slate-900 transition-transform hover:scale-105" style={{ backgroundColor: "#00d4ff" }}>
              Launch Console
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-20 pb-24">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border w-max transition-colors ${health.checking ? "border-amber-900/50 bg-amber-950/30" : health.online ? "border-teal-900/50 bg-teal-950/30" : "border-rose-900/50 bg-rose-950/30"}`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${health.checking ? "bg-amber-400" : health.online ? "bg-teal-400" : "bg-rose-400"}`}></div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${health.checking ? "text-amber-400" : health.online ? "text-teal-400" : "text-rose-400"}`}>
                {health.checking ? "Connecting to Backend..." : health.online ? "Incident Copilot Online" : "Backend Offline"}
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-slate-100">
              Retail incident triage with evidence engineers can trust.
            </h1>
            
            <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
              StorePulse AI gives SRE and store operations teams a split-pane command center for correlating alerts, POS telemetry, payment failures, inventory drift, and AI-generated next actions.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button 
                onClick={() => navigate('/console')}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-slate-900 transition-transform hover:scale-105" 
                style={{ backgroundColor: "#00d4ff" }}
              >
                Open live console <ArrowRight size={16} />
              </button>
              <button className="px-6 py-3 rounded-full text-sm font-medium text-slate-300 bg-[#161f33] border border-[#2a364f] hover:bg-[#1e293b] transition-colors">
                Review evidence pack
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-[#1e293b]">
              <div>
                <div className="text-3xl font-bold text-slate-200">43s</div>
                <div className="text-xs text-slate-500 font-medium mt-1">median triage</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-400">99.97%</div>
                <div className="text-xs text-slate-500 font-medium mt-1">store uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-500">12k</div>
                <div className="text-xs text-slate-500 font-medium mt-1">signals fused</div>
              </div>
            </div>
          </div>

          {/* Right Column: Console Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full"></div>
            <div className="relative bg-[#0b101d] border border-[#1f2937] rounded-xl overflow-hidden shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#161f33] border border-[#2a364f] text-[10px] text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                  SEV-2 payment latency - West region
                </div>
                <div className="text-[10px] text-slate-500 font-mono">2026-04-17 09:41 UTC</div>
              </div>
              
              {/* Body */}
              <div className="grid grid-cols-3 divide-x divide-[#1f2937] h-[400px]">
                {/* Col 1 */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">QUEUE</span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-sm">4 critical</span>
                  </div>
                  
                  <div className="bg-[#161f33] border border-[#2a364f] p-3 rounded-lg border-l-2 border-l-rose-500">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-slate-200">POS auth timeout</div>
                      <div className="text-[10px] text-rose-500 font-bold">P1</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">184 stores impacted</div>
                  </div>
                  
                  <div className="bg-[#0e1526] border border-[#1f2937] p-3 rounded-lg border-l-2 border-l-amber-500">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-slate-200">Inventory sync lag</div>
                      <div className="text-[10px] text-amber-500 font-bold">P2</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Replenishment delayed</div>
                  </div>

                  <div className="bg-[#0e1526] border border-[#1f2937] p-3 rounded-lg border-l-2 border-l-slate-500 opacity-70">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-slate-200">Kiosk app crash</div>
                      <div className="text-[10px] text-slate-500 font-bold">P3</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Version 8.2.1 cohort</div>
                  </div>
                </div>
                
                {/* Col 2 */}
                <div className="p-4 flex flex-col gap-3 col-span-1 bg-[#090d18]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">EVIDENCE PANE</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Verified sources</span>
                  </div>
                  
                  <div className="h-32 bg-[#111827] border border-[#1f2937] rounded-lg p-2 flex flex-col gap-1.5 overflow-hidden">
                    <div className="w-full h-2 bg-slate-800 rounded-sm"></div>
                    <div className="w-3/4 h-2 bg-slate-800 rounded-sm"></div>
                    <div className="w-5/6 h-2 bg-slate-800 rounded-sm mt-2"></div>
                    <div className="w-1/2 h-2 bg-slate-800 rounded-sm"></div>
                    <div className="w-2/3 h-2 bg-blue-500/50 rounded-sm mt-2"></div>
                    <div className="w-full h-2 bg-slate-800 rounded-sm"></div>
                  </div>
                  
                  <div className="bg-[#111827] border border-[#1f2937] p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">Payment gateway p95 jumped to 4.8s</div>
                        <div className="text-[9px] text-slate-500 mt-1 leading-snug">Correlated with firewall policy deploy in cluster west-gateway-03.</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111827] border border-[#1f2937] p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">Customer checkout abandonment up 18%</div>
                        <div className="text-[9px] text-slate-500 mt-1 leading-snug">Telemetry confirms degraded tap-to-pay path, not cash drawer services.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3 */}
                <div className="p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider mb-2">AI INCIDENT BRIEF</span>
                  
                  <div className="bg-[#0e1a2b] border border-[#1c324a] p-4 rounded-xl">
                    <div className="text-sm font-bold text-slate-200 mb-2">Likely cause</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      A ruleset pushed to <span className="font-mono text-cyan-400 bg-cyan-900/30 px-1 rounded">west-gateway-03</span> is throttling tokenization calls.
                      Confidence is high because deployment time, latency slope, and store geography align.
                    </p>
                  </div>
                  
                  <button className="mt-2 w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold text-slate-900 text-xs transition-transform hover:scale-[1.02]" style={{ backgroundColor: "#00e8b5" }}>
                    <span>Rollback gateway policy</span>
                    <span>2 min</span>
                  </button>
                  
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#2a364f] bg-[#161f33] text-xs font-bold text-slate-300 hover:bg-[#1e293b] transition-colors">
                    <span>Notify store ops</span>
                    <span className="text-slate-500 font-normal">draft</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section — Interactive */}
        <FeaturesSection />


      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f2937] bg-[#0a0f18] mt-20">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-6 h-6 rounded" style={{ backgroundColor: "#1e293b" }}>
                <Activity size={12} className="text-cyan-400" />
              </div>
              <span className="font-semibold text-sm">StorePulse AI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Incident triage for retail systems where payment uptime, store operations, and customer trust are always on the line.
            </p>
          </div>
          
          <div className="flex gap-8 text-xs font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ── Animated Counter Hook ─────────────────────────────────────────────── */
function useCountUp(target, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          setValue(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [value, ref];
}

/* ── Interactive Features Section ──────────────────────────────────────── */
function FeaturesSection() {
  const [activeCard, setActiveCard] = useState(null);
  const [triages, triagesRef] = useCountUp(2847);
  const [accuracy, accuracyRef] = useCountUp(97);
  const [signals, signalsRef] = useCountUp(12400);

  const CARDS = [
    {
      id: "fusion",
      icon: <Layers size={18} />,
      color: "#00d4ff",
      title: "Signal fusion",
      description: "Correlates logs, traces, POS devices, payment gateways, release events, and store metadata in one incident graph.",
      detail: "Ingests 14 signal types across the retail stack. Cross-references deployment timelines with error spikes to surface causal chains — not just correlations.",
      stats: [
        { label: "Signal types", value: "14" },
        { label: "Avg. fusion time", value: "3.2s" },
      ],
    },
    {
      id: "recovery",
      icon: <BarChart3 size={18} />,
      color: "#00e8b5",
      title: "Recovery scoring",
      description: "Ranks runbooks by confidence, blast radius, expected time to recovery, and required approval path.",
      detail: "Each recommended action comes with a confidence score, estimated TTR, and an approval tier so engineers know exactly what they're authorising.",
      stats: [
        { label: "Runbooks indexed", value: "6" },
        { label: "Avg. confidence", value: "87%" },
      ],
    },
    {
      id: "transparency",
      icon: <Eye size={18} />,
      color: "#f59e0b",
      title: "Full transparency",
      description: "Every AI claim is linked to source evidence — log lines, traces, release diffs, and store cohorts.",
      detail: "No black-box answers. Engineers see the exact log lines, runbook sections, and similar incidents that informed each recommendation. Disagree? Override with one click.",
      stats: [
        { label: "Source trails", value: "100%" },
        { label: "Override rate", value: "<5%" },
      ],
    },
    {
      id: "guardrails",
      icon: <GitBranch size={18} />,
      color: "#a78bfa",
      title: "Guardrails & audit",
      description: "8 deterministic validation checks run on every triage. Every action is logged to an immutable audit trail.",
      detail: "The Validator agent enforces BCP rules, severity-action alignment, and completeness checks. Nothing reaches the engineer without passing all 8 gates.",
      stats: [
        { label: "Validation gates", value: "8" },
        { label: "Audit retention", value: "∞" },
      ],
    },
  ];

  return (
    <div className="mt-32">
      <div className="bg-[#0a0f18] border border-[#1f2937] rounded-3xl p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
          {/* Left: Copy */}
          <div>
            <div className="text-xs font-bold tracking-widest text-amber-500 mb-4 uppercase">Evidence-Based AI</div>
            <h2 className="text-3xl font-bold text-slate-100 mb-6">Speed without speculation.</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              StorePulse AI explains why it recommends an action, what systems are affected, and which signals disagree.
              The copilot stays useful under pressure because every answer has a source trail.
            </p>

            {/* Animated Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#1f2937]">
              <div ref={triagesRef}>
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Triages</div>
                <div className="text-2xl font-bold text-slate-200 tabular-nums">{triages.toLocaleString()}</div>
              </div>
              <div ref={accuracyRef}>
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Accuracy</div>
                <div className="text-2xl font-bold text-emerald-400 tabular-nums">{accuracy}%</div>
              </div>
              <div ref={signalsRef}>
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Signals Fused</div>
                <div className="text-2xl font-bold text-cyan-400 tabular-nums">{signals.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Cards */}
          <div className="flex flex-col gap-3 justify-center">
            {CARDS.map((card) => {
              const isActive = activeCard === card.id;
              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setActiveCard(card.id)}
                  onMouseLeave={() => setActiveCard(null)}
                  className="rounded-2xl p-5 cursor-pointer transition-all duration-300"
                  style={{
                    background: isActive ? "#111827" : "#0d1220",
                    border: `1px solid ${isActive ? card.color + "55" : "#1f2937"}`,
                    boxShadow: isActive ? `0 0 24px ${card.color}15, 0 0 0 1px ${card.color}30` : "none",
                    transform: isActive ? "translateX(6px)" : "translateX(0)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: card.color,
                        boxShadow: isActive ? `0 0 8px ${card.color}` : "none",
                      }}
                    />
                    <span className="font-bold text-slate-200 text-sm">{card.title}</span>
                    <span style={{ color: card.color }} className="ml-auto transition-opacity duration-200 opacity-0" 
                      {...(isActive && { className: "ml-auto transition-opacity duration-200 opacity-100" })}>
                      {card.icon}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{card.description}</p>

                  {/* Expandable detail */}
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isActive ? "120px" : "0", opacity: isActive ? 1 : 0, marginTop: isActive ? "12px" : "0" }}
                  >
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-3 pt-3 border-t border-[#1f2937]">
                      {card.detail}
                    </p>
                    <div className="flex gap-6">
                      {card.stats.map((s) => (
                        <div key={s.label}>
                          <div className="text-lg font-bold" style={{ color: card.color }}>{s.value}</div>
                          <div className="text-[10px] text-slate-500">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom live bar */}
        <div className="mt-6 pt-6 border-t border-[#1f2937] flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pipeline Health</span>
          </div>
          <div className="flex-1 h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-pulse" style={{ width: "97%", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" }} />
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">97% healthy</span>
        </div>
      </div>
    </div>
  );
}
