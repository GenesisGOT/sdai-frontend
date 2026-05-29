/**
 * SD AI Solutions — Dashboard Root
 *
 * Architecture:
 *   CopilotKit  ──(AG-UI / WebSocket)──►  VoltAgent service (port 3141)
 *                                              │
 *                                              ▼
 *   React UI  ──(REST /api/*)──►  FastAPI backend (port 8000)
 *
 * CopilotKit provides:
 *   - Real-time agent interaction sidebar (<CopilotSidebar>)
 *   - useCopilotAction() hooks to trigger backend actions from chat
 *   - useCopilotReadable() hooks to give the AI context about what's on screen
 *
 * VoltAgent provides:
 *   - The AG-UI protocol server that CopilotKit streams to
 *   - All 8 SD AI agent types as named agents
 *   - Observability + tracing for every generation
 */

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { Dashboard } from "./pages/Dashboard";

// CopilotKit runtime — points to the FastAPI /copilotkit endpoint.
// FastAPI runs the LangGraph chat_graph and streams it back here.
// In production: set VITE_API_URL env var (e.g. https://api.sdaisolutions.com)
const COPILOTKIT_URL = (import.meta.env.VITE_API_URL ?? "") + "/copilotkit";

export default function App() {
  return (
    <CopilotKit
      // Points to FastAPI /copilotkit (LangGraph chat agent)
      runtimeUrl={COPILOTKIT_URL}
      // Agent name matches the LangGraphAgent name registered in main.py
      agent="sdai_assistant"
    >
      <CopilotSidebar
        defaultOpen={false}
        labels={{
          title: "SD AI Agent Assistant",
          initial:
            "Hi! I'm your SD AI assistant. I can help you generate messages, review agent performance, or set up campaigns. What would you like to do?",
        }}
      >
        <Dashboard />
      </CopilotSidebar>
    </CopilotKit>
  );
}
