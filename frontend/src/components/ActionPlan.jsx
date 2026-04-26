import { useState } from "react";
import { CheckCircle2, XCircle, Shield, Send, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function ActionPlan({ result, onConfirm }) {
  const { user } = useAuth();
  const isGuest = user?.role === 'GUEST';

  const [stepState, setStepState] = useState(() =>
    Object.fromEntries((result.action_plan || []).map(s => [s.step, { status:"pending", reason:"" }]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showEscalation, setShowEscalation] = useState(false);

  const setStep = (step, patch) => {
    if (isGuest) return;
    setStepState(s => ({ ...s, [step]: { ...s[step], ...patch } }));
  };

  const handleSubmit = async () => {
    const confirmed = Object.entries(stepState).filter(([,v]) => v.status === "confirmed").map(([k]) => parseInt(k));
    const rejected  = Object.entries(stepState).filter(([,v]) => v.status === "rejected")
      .map(([k,v]) => ({ step: parseInt(k), reason: v.reason }));
    const res = await onConfirm(result.incident_id, confirmed, rejected);
    setReceipt(res);
    setSubmitted(true);
  };

  const pendingCount = Object.values(stepState).filter(v => v.status === "pending").length;

  return (
    <div className="card p-5 animate-slide-up flex flex-col gap-4" style={{ animationDelay:"0.1s" }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--color-text-muted)" }}>
          Action Plan — Human Confirmation Required
        </div>
        {!submitted && pendingCount > 0 && (
          <span className="badge text-xs" style={{ background:"var(--color-warning-hl)", color:"var(--color-warning)" }}>
            {pendingCount} awaiting review
          </span>
        )}
      </div>

      {!submitted ? (
        <>
          <div className="flex flex-col gap-3">
            {result.action_plan?.map((step) => {
              const state = stepState[step.step] || { status:"pending" };
              const isBcp = step.is_bcp;
              return (
                <div key={step.step} className={`rounded-xl p-4 transition-all duration-200 ${isBcp ? "animate-conflict" : ""}`}
                  style={{
                    border: `1.5px solid ${
                      state.status === "confirmed" ? "var(--color-success)" :
                      state.status === "rejected"  ? "var(--color-error)" :
                      isBcp ? "var(--color-error)" : "var(--color-border)"
                    }`,
                    background: isBcp ? "var(--color-error-hl)" : "var(--color-surface-2)",
                  }}>

                  {/* Step header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                          style={{ background: isBcp ? "var(--color-error)" : "var(--color-primary-hl)",
                                   color: isBcp ? "#fff" : "var(--color-primary)" }}>
                          {step.step}
                        </span>
                        {isBcp && (
                          <span className="badge" style={{ background:"var(--color-error)", color:"#fff", fontSize:"10px" }}>
                            <Shield size={9}/> BCP
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color:"var(--color-text)" }}>
                          {step.action}
                        </div>
                        <div className="text-xs mt-1" style={{ color:"var(--color-text-muted)" }}>
                          {step.rationale}
                        </div>
                      </div>
                    </div>

                    {/* Confirm / Reject buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setStep(step.step, { status:"confirmed" })}
                        className="btn p-1.5 rounded-lg transition-all"
                        style={{
                          background: state.status === "confirmed" ? "var(--color-success)" : "var(--color-surface-offset)",
                          color: state.status === "confirmed" ? "#fff" : "var(--color-text-muted)",
                          border: "1px solid var(--color-border)"
                        }}
                        title="Confirm this step">
                        <CheckCircle2 size={14}/>
                      </button>
                      <button onClick={() => setStep(step.step, { status:"rejected" })}
                        className="btn p-1.5 rounded-lg transition-all"
                        style={{
                          background: state.status === "rejected" ? "var(--color-error)" : "var(--color-surface-offset)",
                          color: state.status === "rejected" ? "#fff" : "var(--color-text-muted)",
                          border: "1px solid var(--color-border)"
                        }}
                        title="Reject this step">
                        <XCircle size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* Rejection reason input */}
                  {state.status === "rejected" && (
                    <div className="mt-2 animate-fade-in">
                      <input className="w-full px-3 py-1.5 rounded-lg text-xs"
                        style={{ background:"var(--color-bg)", border:"1px solid var(--color-error)",
                                 color:"var(--color-text)" }}
                        placeholder="Reason for rejection (optional)…"
                        value={state.reason}
                        onChange={e => setStep(step.step, { reason: e.target.value })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Escalation path */}
          {result.escalation_path && (
            <div className="rounded-lg overflow-hidden" style={{ border:"1px solid var(--color-border)" }}>
              <button onClick={() => setShowEscalation(s => !s)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold"
                style={{ background:"var(--color-surface-offset)", color:"var(--color-text-muted)", border:"none", cursor:"pointer" }}>
                <span>Escalation Path</span>
                {showEscalation ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </button>
              {showEscalation && (
                <div className="px-4 py-3 text-xs animate-fade-in" style={{ color:"var(--color-text)", background:"var(--color-surface-2)" }}>
                  {result.escalation_path}
                </div>
              )}
            </div>
          )}

          {/* Handoff note */}
          {result.handoff_note && (
            <div className="rounded-lg p-3"
              style={{ background:"var(--color-surface-offset)", border:"1px solid var(--color-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color:"var(--color-text-muted)" }}>Shift Handoff Note</div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color:"var(--color-text)", fontFamily:"inherit" }}>
                {result.handoff_note}
              </pre>
            </div>
          )}

          <button onClick={handleSubmit}
            disabled={isGuest}
            className="btn btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {isGuest ? (
              <><Lock size={13}/> Submit Disabled for Guest View</>
            ) : (
              <><Send size={13}/> Submit Confirmed Actions</>
            )}
          </button>
        </>
      ) : (
        <div className="p-4 rounded-xl text-center animate-slide-up"
          style={{ background:"var(--color-success-hl)", border:"1px solid var(--color-success)" }}>
          <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color:"var(--color-success)" }}/>
          <div className="text-sm font-semibold" style={{ color:"var(--color-success)" }}>Actions Confirmed</div>
          <div className="text-xs mt-1" style={{ color:"var(--color-text-muted)" }}>
            {receipt?.receipt || "Confirmation logged to audit trail."}
          </div>
          <div className="text-xs mt-2 mono" style={{ color:"var(--color-text-faint)" }}>
            {receipt?.confirmed_count || 0} confirmed · {receipt?.rejected_count || 0} rejected
          </div>
        </div>
      )}
    </div>
  );
}
