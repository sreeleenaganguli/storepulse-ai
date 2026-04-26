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
    <div className="h-screen overflow-hidden font-sans text-white flex flex-col" style={{ backgroundColor: "#060a11" }}>
      {/* Header */}
      <header className="flex items-center justify-center pt-6 px-4 flex-shrink-0">
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

      <main className="flex-1 flex items-center max-w-7xl mx-auto px-6 overflow-hidden">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center w-full">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border w-max transition-colors ${health.checking ? "border-amber-900/50 bg-amber-950/30" : health.online ? "border-teal-900/50 bg-teal-950/30" : "border-rose-900/50 bg-rose-950/30"}`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${health.checking ? "bg-amber-400" : health.online ? "bg-teal-400" : "bg-rose-400"}`}></div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${health.checking ? "text-amber-400" : health.online ? "text-teal-400" : "text-rose-400"}`}>
                {health.checking ? "Connecting to Backend..." : health.online ? "Incident Copilot Online" : "Backend Offline"}
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight text-slate-100">
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

          {/* Right Column: Interactive Features Section */}
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] rounded-full"></div>
            <FeaturesSection />
          </div>
        </div>

      </main>

      {/* Footer - Compact */}
      <footer className="border-t border-[#1f2937] bg-[#0a0f18] flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              <span className="font-semibold text-xs">StorePulse AI</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Incident triage for retail systems where payment uptime is everything.
            </p>
          </div>
          
          <div className="flex gap-6 text-[10px] font-medium text-slate-400">
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
      description: "Correlates logs, traces, POS devices, and store metadata in one incident graph.",
      detail: "Ingests 14 signal types. Cross-references deployment timelines with error spikes to surface causal chains.",
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
      description: "Ranks runbooks by confidence, blast radius, and expected time to recovery.",
      detail: "Each action comes with a confidence score and estimated TTR so engineers know what they're authorising.",
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
      description: "Every AI claim is linked to source evidence — log lines, traces, and release diffs.",
      detail: "No black-box answers. Engineers see the exact log lines that informed each recommendation.",
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
      description: "8 deterministic validation checks run on every triage. Logged to immutable audit trail.",
      detail: "The Validator agent enforces BCP rules. Nothing reaches the engineer without passing all 8 gates.",
      stats: [
        { label: "Validation gates", value: "8" },
        { label: "Audit retention", value: "∞" },
      ],
    },
  ];

  return (
    <div className="relative">
      <div className="bg-[#0e1526]/80 backdrop-blur-sm border border-[#1f2937] rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col gap-6">
          {/* Header Copy */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-amber-500 mb-2 uppercase">Evidence-Based AI</div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Speed without speculation.</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              StorePulse AI explains why it recommends an action, what systems are affected, and which signals disagree.
            </p>
            
            {/* Animated Stats - Simplified for compact view */}
            <div className="grid grid-cols-3 gap-4 py-4 my-2 border-y border-[#1f2937]">
              <div ref={triagesRef}>
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Triages</div>
                <div className="text-xl font-bold text-slate-200 tabular-nums">{triages.toLocaleString()}</div>
              </div>
              <div ref={accuracyRef}>
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Accuracy</div>
                <div className="text-xl font-bold text-emerald-400 tabular-nums">{accuracy}%</div>
              </div>
              <div ref={signalsRef}>
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Fused</div>
                <div className="text-xl font-bold text-cyan-400 tabular-nums">{signals.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Interactive Cards */}
          <div className="flex flex-col gap-2">
            {CARDS.map((card) => {
              const isActive = activeCard === card.id;
              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setActiveCard(card.id)}
                  onMouseLeave={() => setActiveCard(null)}
                  className="rounded-2xl p-4 cursor-pointer transition-all duration-300"
                  style={{
                    background: isActive ? "#111827" : "#0d1220",
                    border: `1px solid ${isActive ? card.color + "55" : "#1f2937"}`,
                    boxShadow: isActive ? `0 0 24px ${card.color}15, 0 0 0 1px ${card.color}30` : "none",
                    transform: isActive ? "translateX(6px)" : "translateX(0)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: card.color,
                        boxShadow: isActive ? `0 0 8px ${card.color}` : "none",
                      }}
                    />
                    <span className="font-bold text-slate-200 text-xs">{card.title}</span>
                    <span style={{ color: card.color }} className={`ml-auto transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                      {card.icon}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{card.description}</p>

                  {/* Expandable detail */}
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isActive ? "100px" : "0", opacity: isActive ? 1 : 0, marginTop: isActive ? "10px" : "0" }}
                  >
                    <p className="text-[10px] text-slate-300 leading-relaxed mb-2 pt-2 border-t border-[#1f2937]">
                      {card.detail}
                    </p>
                    <div className="flex gap-4">
                      {card.stats.map((s) => (
                        <div key={s.label}>
                          <div className="text-sm font-bold" style={{ color: card.color }}>{s.value}</div>
                          <div className="text-[9px] text-slate-500">{s.label}</div>
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
        <div className="mt-4 pt-4 border-t border-[#1f2937] flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pipeline Health</span>
          </div>
          <div className="flex-1 h-1 bg-[#1f2937] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-pulse" style={{ width: "97%", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" }} />
          </div>
          <span className="text-[9px] text-emerald-400 font-bold whitespace-nowrap">97% healthy</span>
        </div>
      </div>
    </div>
  );
}
