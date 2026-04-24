# StorePulse AI 🛒⚡
### AI-Assisted Incident Triage Copilot for Store Systems

StorePulse AI ingests a store-system incident + log bundle and produces — in seconds — a structured triage output: root cause, top 3 causes, 5-step action plan, escalation path, and shift handoff note. Built for Store Operations Support Teams and Incident Managers.

---

## Architecture

```
Incident Input
     │
     ▼
┌─────────────┐   gemini-2.5-flash-lite
│  Ingestor   │ → entities, log_timeline, severity_path
└──────┬──────┘
       │
┌──────▼──────┐   Azure text-embedding-3-large + BM25
│  Researcher │ → top-3 runbook chunks, top-3 similar incidents
└──────┬──────┘   (re-queries if score < 0.65)
       │
┌──────▼──────┐   DeepSeek-R1 (fallback: gemini-2.5-pro)
│Diagnostician│ → conflict detection, root cause, confidence, trace
└──────┬──────┘   (loops back to Researcher on conflict)
       │
┌──────▼──────┐   Llama-3.3-70B (fallback: gpt-4.1-nano)
│Act. Planner │ → 5-step plan, escalation, handoff note, summary
└──────┬──────┘   (BCP enforced as step 1 for Sev1+payment)
       │
┌──────▼──────┐   Pure Python — zero LLM calls
│  Validator  │ → 8 deterministic rule checks
└──────┬──────┘   (re-runs Planner on hard failure)
       │
  SSE → React UI
```

---

## Quick Start

### 1. Prerequisites
- Docker Desktop
- API keys (see below)

### 2. Clone & Configure
```bash
git clone <repo>
cd storepulse-ai
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
```

### 3. Required API Keys (in `backend/.env`)
```env
GEMINI_API_KEY=your_gemini_key          # Google AI Studio — free tier works
AZURE_API_KEY=your_azure_key            # Azure OpenAI
AZURE_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_API_VERSION=2024-02-01
```

### 4. Offline / Demo Mode (no API keys needed)
```env
MOCK_MODE=true
```
Returns a pre-saved golden response for the payment timeout pattern — perfect for demo day.

### 5. Build & Run
```bash
docker compose up --build
```
- **UI** → http://localhost:3000
- **API docs** → http://localhost:8000/docs
- **Health** → http://localhost:8000/health

---

## API Reference

### `POST /triage/stream`
Streams SSE events as agents run.

**Request body:**
```json
{
  "incident_id": "INC-SCO-20241115-0019",
  "service": "pos-payment",
  "severity": "Sev1",
  "symptoms": "Payment retries failing on 18 SCO units",
  "created": "2024-11-15T13:22:00Z",
  "log_snippet": "2024-11-15T13:21:44Z ERROR pos-payment Gateway timed out [GW_TIMEOUT_503]"
}
```

**SSE event types:**
| Type | Description |
|---|---|
| `agent_step` | Agent started / completed with message |
| `conflict_detected` | Log code not in service taxonomy |
| `validated` | All checks passed |
| `validation_failed` | Hard rule failure |
| `final_result` | Full `TriageOutput` JSON |
| `error` | Pipeline error |

### `GET /health`
Returns backend status, chunk count, incident count.

### `GET /incidents?limit=20&offset=0`
Browse the incident dataset.

### `POST /confirm`
```json
{
  "incident_id": "INC-SCO-20241115-0019",
  "confirmed_steps": [1, 2, 3],
  "rejected_steps": [{"step": 4, "reason": "Already escalated"}]
}
```
Appends to `audit.jsonl`. Returns confirmation receipt.

---

## Dataset

| File | Contents |
|---|---|
| `backend/data/incidents.jsonl` | 70 synthetic incidents across 6 failure patterns |
| `backend/data/service_logs.json` | 1400 log lines, 15-25 per incident |
| `backend/data/runbooks/*.md` | 6 runbook files (payment_timeout, receipt_printer_failure, barcode_scanner_issue, loyalty_api_unavailable, promotion_engine_latency, store_network_flap) |

---

## Guardrails

- **No production data** — synthetic store-system data only
- **Advisory only** — engineer confirms every action step via CONFIRM/REJECT UI
- **Full transparency** — source chunks + scores always shown, DeepSeek reasoning trace available
- **Audit log** — every agent I/O, prompt, retrieval, and response appended to `audit.jsonl`

---

## Evaluation Targets

| Metric | Target | How |
|---|---|---|
| Retrieval Precision@3 | ≥75% | Hybrid BM25 + semantic + conflict-aware re-retrieval |
| Triage quality (1-4) | ≥3.5 | Dedicated specialist agents per output, Validator enforces all rubric dimensions |
| Manual lookups | ≤2 | One paste + one click |

---

## Project Structure
```
storepulse-ai/
├── backend/
│   ├── main.py           FastAPI + SSE endpoints
│   ├── graph.py          LangGraph agent wiring
│   ├── state.py          AgentState TypedDict
│   ├── config.py         All settings
│   ├── agents/           5 specialist agents
│   ├── rag/              ChromaDB + BM25 + embedder
│   ├── models/           Pydantic schemas
│   ├── mock/             Offline golden responses
│   └── data/             Dataset
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/   9 UI components
        ├── hooks/        SSE + health hooks
        └── lib/          Demo incidents
```
