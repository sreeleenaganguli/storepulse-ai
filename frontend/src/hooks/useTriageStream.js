import { useState, useRef, useCallback } from "react";

const INITIAL = {
  status: "idle",       // idle | streaming | done | error
  agentEvents: [],
  conflicts: [],
  result: null,
  errorMsg: null,
};

export function useTriageStream() {
  const [state, setState] = useState(INITIAL);
  const esRef = useRef(null);

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setState(INITIAL);
  }, []);

  const startTriage = useCallback(async (incidentPayload) => {
    reset();
    setState(s => ({ ...s, status: "streaming" }));

    try {
      // Post incident to get a stream — using fetch + ReadableStream for SSE over POST
      const resp = await fetch("/api/triage/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentPayload),
      });

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
      setState(s => ({ ...s, status: "error", errorMsg: err.message }));
    }
  }, [reset]);

  const confirm = useCallback(async (incidentId, confirmedSteps, rejectedSteps) => {
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incidentId, confirmed_steps: confirmedSteps, rejected_steps: rejectedSteps }),
    });
    return res.json();
  }, []);

  return { state, startTriage, reset, confirm };
}
