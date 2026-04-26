import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  Activity,
  Lock,
  Users,
  FileText,
  Github,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  ChevronRight,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";

// ── Feature cards data ─────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "sso",
    icon: <Lock size={18} />,
    color: "#00e8b5",
    bg: "rgba(0,232,181,0.12)",
    title: "Enterprise SSO",
    benefit: "Secure access with SAML 2.0 and OIDC.",
    detail: "Automatically provision teams from your identity provider.",
  },
  {
    id: "shift",
    icon: <Users size={18} />,
    color: "#00d4ff",
    bg: "rgba(0,212,255,0.12)",
    title: "Shift Handoff",
    benefit: "AI-generated summaries ensure no context is lost.",
    detail: "Ensure no incident context is lost between rotations.",
  },
  {
    id: "audit",
    icon: <FileText size={18} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "Audit Trail",
    benefit: "Every action logged for compliance.",
    detail:
      "Every action, decision, and AI recommendation is logged for compliance and analysis.",
  },
];

const TRUST_BADGES = [
  { label: "SOC 2 Ready", icon: <Shield size={12} />, color: "#00e8b5" },
  { label: "SSO-Ready", icon: <Lock size={12} />, color: "#00d4ff" },
  { label: "99.9% Uptime", icon: <Zap size={12} />, color: "#f59e0b" },
  {
    label: "GDPR Compliant",
    icon: <CheckCircle2 size={12} />,
    color: "#a78bfa",
  },
];

const CAPABILITY_CHIPS = [
  { label: "SSO & SAML 2.0", icon: <Lock size={10} /> },
  { label: "RBAC Controls", icon: <Shield size={10} /> },
  { label: "Audit Logging", icon: <FileText size={10} /> },
  { label: "Shift Handoff", icon: <Users size={10} /> },
  { label: "99.9% SLA", icon: <Zap size={10} /> },
  { label: "SOC 2 Ready", icon: <CheckCircle2 size={10} /> },
];

// ── Tooltip / Modal for feature detail ────────────────────────────────────
function FeatureModal({ feature, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!feature) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,10,17,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in"
        style={{
          background: "#0b101d",
          border: `1px solid ${feature.color}40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: feature.bg,
              border: `1px solid ${feature.color}40`,
              color: feature.color,
            }}
          >
            {feature.icon}
          </div>
          <div>
            <div className="font-bold text-slate-100">{feature.title}</div>
            <div
              className="text-xs font-medium"
              style={{ color: feature.color }}
            >
              {feature.benefit}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          {feature.detail}
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg text-xs font-bold transition-colors"
          style={{
            background: feature.color + "20",
            border: `1px solid ${feature.color}50`,
            color: feature.color,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeCard, setActiveCard] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef(null);

  const from = location.state?.from?.pathname || "/";

  // Force dark theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  // Auto-rotating carousel
  useEffect(() => {
    if (hoveredCard !== null) return; // pause on hover
    const id = setInterval(
      () => setActiveCard((c) => (c + 1) % FEATURES.length),
      4500,
    );
    return () => clearInterval(id);
  }, [hoveredCard]);

  // Inline validation
  const validateEmail = (val) => {
    if (!val) return "Username is required";
    return "";
  };
  const validatePassword = (val) => {
    if (!val) return "Password is required";
    if (val.length < 3) return "Password too short";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid credentials. Use DevOpsEng or StoreManager with password 'pass'");
    } finally {
      setLoading(false);
    }
  };


  const lastUsed = localStorage.getItem("storepulse_last_email");

  return (
    <>
      {selectedFeature && (
        <FeatureModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}

      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#060a11", color: "#f8fafc" }}
      >
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* ── Left Column ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-8">
            {/* Headline */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight text-slate-100 mb-5">
                Your on-call command center,
                <br />
                <span className="text-slate-400">ready when you are.</span>
              </h1>

              <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                Manage incidents, access controls, and team workflows in one
                unified workspace. Designed to keep every shift aligned and
                accountable.
              </p>
            </div>

            {/* Auto-rotating feature carousel */}
            <div className="flex flex-col gap-3" ref={carouselRef}>
              {FEATURES.map((card, i) => {
                const isActive =
                  hoveredCard === card.id ||
                  (hoveredCard === null && activeCard === i);
                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => {
                      setHoveredCard(card.id);
                      setActiveCard(i);
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setSelectedFeature(card)}
                    className="rounded-xl cursor-pointer transition-all duration-300"
                    style={{
                      padding: isActive ? "18px 20px" : "14px 20px",
                      background: isActive ? "#0f1623" : "#0b101d",
                      border: `1px solid ${isActive ? card.color + "50" : "#1f2937"}`,
                      boxShadow: isActive ? `0 0 20px ${card.color}12` : "none",
                      transform: isActive ? "translateX(6px)" : "translateX(0)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                        style={{
                          background: isActive ? card.bg : "transparent",
                          border: `1px solid ${isActive ? card.color + "50" : "#1f2937"}`,
                          color: card.color,
                          transform: isActive
                            ? "scale(1.1) rotate(-3deg)"
                            : "scale(1)",
                        }}
                      >
                        {card.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-200">
                            {card.title}
                          </h3>
                          <ChevronRight
                            size={14}
                            className="transition-transform duration-200"
                            style={{
                              color: card.color,
                              opacity: isActive ? 1 : 0,
                              transform: isActive
                                ? "translateX(2px)"
                                : "translateX(-4px)",
                            }}
                          />
                        </div>
                        <p
                          className="text-xs text-slate-400 leading-relaxed mt-0.5"
                          style={{
                            maxHeight: isActive ? "40px" : "18px",
                            overflow: "hidden",
                            transition: "max-height 0.3s ease",
                          }}
                        >
                          {isActive
                            ? card.benefit
                            : card.detail.slice(0, 60) + "…"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Carousel dot indicators */}
              <div className="flex items-center gap-2 mt-1 pl-1">
                {FEATURES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveCard(i);
                      setHoveredCard(null);
                    }}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: activeCard === i ? "20px" : "6px",
                      height: "6px",
                      background: activeCard === i ? "#00d4ff" : "#1f2937",
                    }}
                  />
                ))}
                <span className="text-[10px] text-slate-600 ml-2 font-medium">
                  Click card for details
                </span>
              </div>
            </div>

            {/* Trust signals */}
            <div className="pt-4 border-t border-[#1f2937]">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3">
                Trusted by engineering teams at
              </p>
              <div className="flex items-center gap-6 mb-4 flex-wrap">
                {["Retail Corp", "MegaMart", "ShopFleet", "FreshChain"].map(
                  (name) => (
                    <span
                      key={name}
                      className="text-xs font-bold text-slate-500"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {TRUST_BADGES.map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: badge.color + "10",
                      border: `1px solid ${badge.color}30`,
                      color: badge.color,
                    }}
                  >
                    {badge.icon} {badge.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column — Login Form ───────────────────────────── */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-[#0b101d] border border-[#1f2937] rounded-2xl w-full max-w-md p-8 shadow-2xl">
              {/* Brand */}
              <div className="flex flex-col items-center mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ backgroundColor: "#1e293b" }}
                  >
                    <Activity size={18} className="text-cyan-400" />
                  </div>
                  <span className="font-bold text-lg">
                    StorePulse <span className="text-cyan-400">AI</span>
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Sign in to your workspace
                </p>
                {lastUsed && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <Star size={10} className="text-amber-500" /> Last used:{" "}
                    <span className="font-medium text-slate-400">
                      {lastUsed}
                    </span>
                  </div>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Email/Username */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-500 mb-2 block uppercase">
                    Email / Username
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError)
                        setEmailError(validateEmail(e.target.value));
                    }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    placeholder="DevOpsEng or StoreManager"
                    className="w-full bg-[#111827] text-slate-200 text-sm p-3 rounded-lg focus:outline-none transition-all"
                    style={{
                      border: `1px solid ${emailError ? "#f43f5e" : email ? "#00d4ff40" : "#1f2937"}`,
                      boxShadow:
                        email && !emailError ? "0 0 0 1px #00d4ff20" : "none",
                    }}
                  />
                  {emailError && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError)
                          setPasswordError(validatePassword(e.target.value));
                      }}
                      onBlur={() =>
                        setPasswordError(validatePassword(password))
                      }
                      placeholder="pass"
                      className="w-full bg-[#111827] text-slate-200 text-sm p-3 pr-10 rounded-lg focus:outline-none transition-all"
                      style={{
                        border: `1px solid ${passwordError ? "#f43f5e" : password ? "#00d4ff40" : "#1f2937"}`,
                        boxShadow:
                          password && !passwordError
                            ? "0 0 0 1px #00d4ff20"
                            : "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Sign in button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 rounded-lg font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#3b82f6", color: "white" }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      Signing in…
                    </>
                  ) : (
                    <>
                      {" "}
                      Sign In <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-[#1f2937]" />
                <span className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-[#1f2937]" />
              </div>

              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#1f2937] bg-[#111827] hover:bg-[#1e293b] text-sm font-medium text-slate-300 transition-colors">
                  <Github size={16} /> GitHub
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#1f2937] bg-[#111827] hover:bg-[#1e293b] text-sm font-medium text-slate-300 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
              </div>

              {/* Footer links */}
              <div className="mt-6 flex flex-col gap-2 text-center">

                <div className="text-xs text-slate-500">
                  No account?{" "}
                  <a
                    href="#"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Request access
                  </a>
                </div>
              </div>

              {/* Inline trust signals under form */}
              <div className="mt-6 pt-5 border-t border-[#1f2937] flex flex-wrap justify-center gap-3">
                {TRUST_BADGES.map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-1 text-[10px] font-medium"
                    style={{ color: "#475569" }}
                  >
                    <span style={{ color: badge.color }}>{badge.icon}</span>
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
