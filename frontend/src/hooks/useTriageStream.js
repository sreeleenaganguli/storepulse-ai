import { useState, useRef, useCallback } from "react";
import { buildFallbackResult, FALLBACK_AGENT_EVENTS } from "../lib/fallbackTriageData";

const INITIAL = {
  status: "idle",       // idle | streaming | done | error
  agentEvents: [],
  conflicts: [],
  result: null,
  errorMsg: null,
  isFallback: false,
};

export function useTriageStream() {
  const [state, setState] = useState(INITIAL);
  const esRef = useRef(null);

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setState(INITIAL);
  }, []);

  // ── Fallback: simulate streaming with mock data ──────────────────────
  const runFallback = useCallback(async (incidentPayload) => {
    setState(s => ({ ...s, status: "streaming", isFallback: true }));

    // Simulate agent events with delays
    for (const evt of FALLBACK_AGENT_EVENTS) {
      await new Promise(r => setTimeout(r, 400));
      setState(s => ({ ...s, agentEvents: [...s.agentEvents, evt] }));
    }

    await new Promise(r => setTimeout(r, 300));
    const result = buildFallbackResult(incidentPayload);
    setState(s => ({
      ...s,
      status: "done",
      result,
      conflicts: result.conflicts || [],
    }));
  }, []);

  // ── Primary: stream from real API ────────────────────────────────────
  const startTriage = useCallback(async (incidentPayload) => {
    reset();
    setState(s => ({ ...s, status: "streaming" }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const resp = await fetch("/api/triage/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processChunk = (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt = JSON.parse(line.slice(6));
              handleEvent(evt);
            } catch { /* skip malformed */ }
          }
        }
      };

      const handleEvent = (evt) => {
        if (evt.type === "final_result") {
          setState(s => ({
            ...s,
            status: "done",
            result: evt.data,
            conflicts: evt.data?.conflicts || [],
          }));
        } else if (evt.type === "error") {
          setState(s => ({ ...s, status: "error", errorMsg: evt.message }));
        } else if (evt.type === "conflict_detected") {
          setState(s => ({
            ...s,
            conflicts: [...s.conflicts, evt.data],
            agentEvents: [...s.agentEvents, evt],
          }));
        } else {
          setState(s => ({
            ...s,
            agentEvents: [...s.agentEvents, evt],
          }));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }

      setState(s => s.status === "streaming" ? { ...s, status: "done" } : s);
    } catch (err) {
      // ── Fallback on any network/timeout error ──────────────────────
      console.warn("[StorePulse] API unavailable, switching to fallback mode:", err.message);
      reset();
      runFallback(incidentPayload);
    }
  }, [reset, runFallback]);

  const confirm = useCallback(async (incidentId, confirmedSteps, rejectedSteps) => {
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, confirmed_steps: confirmedSteps, rejected_steps: rejectedSteps }),
      });
      return res.json();
    } catch {
      // Fallback confirm response when API is down
      return {
        status: "confirmed",
        incident_id: incidentId,
        confirmed_count: confirmedSteps.length,
        rejected_count: rejectedSteps.length,
        receipt: `[Offline] Actions ${confirmedSteps} confirmed locally at ${new Date().toISOString()}`,
      };
    }
  }, []);

  return { state, startTriage, reset, confirm };
}
