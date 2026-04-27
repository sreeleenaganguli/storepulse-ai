# StorePulse AI — Frontend Architectural Guide

This document provides a detailed walkthrough of the **StorePulse AI Frontend**, explaining the project structure, integrated functionality, and how it interacts with the backend ecosystem.

---

## 1. Technical Stack

- **Core Framework**: React 18 (Vite-powered for fast development).
- **Styling**: Vanilla CSS for custom UI components + Tailwind CSS for layout utilities. The project uses a **CSS Variables** system (defined in `index.css`) for consistent dark-theme colors.
- **Routing**: `react-router-dom` (v6) handles navigation between the Landing Page, Login, and the Triage Console.
- **Icons**: `lucide-react` for a modern, consistent icon set.

---

## 2. Project Structure

```text
src/
├── components/        # Reusable UI parts (ActionPlan, LogViewer, etc.)
├── hooks/             # Core logic encapsulation (The "Brains")
│   ├── useHealth.js        # Periodic backend status polling
│   └── useTriageStream.js  # SSE logic and Fallback management
├── lib/               # Utilities and static data
│   └── fallbackTriageData.js # Mock data for offline simulation
├── AuthContext.jsx    # Global Authentication provider
├── App.jsx            # The Triage Console (Main Workspace)
├── LandingPage.jsx    # Hero/Product Page
└── main.jsx           # Entry point and Route definitions
```

---

## 3. Core Functionality

### 🚀 The Triage Console (`App.jsx`)
The console is the primary workspace where users interact with the AI. It follows a **Split-Pane Layout**:
- **Left Pane**: Incident Input (`IncidentForm`) and the \"Thinking\" Timeline (`AgentTimeline`).
- **Right Pane**: Results Area. It dynamically transitions from a skeleton state (during analysis) to a full dashboard showing root causes, action plans, and evidence.

### 🧠 Agentic Timeline
As the AI works, the frontend receives \"Agent Events.\" The `AgentTimeline` component visualizes these real-time steps (Ingestion → Research → Diagnosis → Validation), providing the user with transparency into the AI's reasoning process.

### 🛡️ Secure Routing
All core paths (`/` and `/console`) are wrapped in a `ProtectedRoute` component, ensuring users must be \"logged in\" (simulated via `AuthContext`) before accessing the tool.

---

## 4. API Integration Strategy

The frontend communicates with the backend via three primary patterns:

### 1. Health Polling (`useHealth`)
- **Endpoint**: `GET /api/health`
- **Frequency**: Every 30 seconds.
- **Purpose**: Updates the UI status pill (Online/Offline) and manages the application-wide \"Backend Status\" indicator.

### 2. SSE Triage Streaming (`useTriageStream`)
- **Endpoint**: `POST /api/triage/stream`
- **Pattern**: Server-Sent Events (SSE).
- **Logic**: instead of waiting for a single large response, the frontend processes a stream of JSON events. This allows for immediate updates on conflicts or agent steps while the final diagnosis is still being generated.

### 3. Action Confirmation
- **Endpoint**: `POST /api/confirm`
- **Purpose**: When a user clicks \"Confirm Action,\" the frontend sends the selection to the backend to be recorded in the audit trail.

---

## 5. Key Data Structures

### Incident Payload (Input)
```json
{
  "incident_id": "string",
  "service": "string",
  "severity": "P1 | P2 | P3",
  "symptoms": "string",
  "log_snippet": "string"
}
```

### Triage Output (Result)
```json
{
  "root_cause": "string",
  "confidence": 0.95,
  "action_plan": [
    { "step": 1, "action": "string", "rationale": "string", "is_bcp": false }
  ],
  "retrieved_runbooks": [ { "source": "string", "content": "string" } ],
  "raw_logs": [ { "level": "ERROR", "message": "string" } ]
}
```

---

## 6. Offline Fallback Logic

A standout feature for developers to note is the **Client-Side Fallback System**:
- **Detection**: If the fetch to `/api/triage/stream` fails (network error or timeout), the `useTriageStream` hook automatically catches the error.
- **Simulation**: It then triggers `runFallback()`, which uses local mock data defined in `lib/fallbackTriageData.js`.
- **Result**: The UI still goes through the same \"streaming\" animation and shows a realistic triage result. This ensures the demo/dev environment is always functional even without a backend.

---

*Welcome to the team! If you have questions about the CSS Variables or SSE handling, reach out to the lead engineer.*
