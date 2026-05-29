/**
 * Main dashboard page — pulls live data from GET /api/v1/dashboard/summary.
 *
 * CopilotKit hooks give the AI sidebar full context about what the customer
 * is seeing, so it can answer questions like:
 *   "why is my response rate low?"
 *   "generate a win-back SMS for a customer who hasn't visited in 90 days"
 *   "which agent is performing best?"
 */

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AgentStat {
  agent_id: number;
  agent_name: string;
  agent_type: string;
  messages_sent: number;
  messages_delivered: number;
  delivery_rate: number;
  responses_received: number;
  response_rate: number;
}

interface Interaction {
  id: number;
  channel: string;
  direction: string;
  status: string;
  content_preview: string;
  created_at: string;
}

interface DashboardData {
  messages_sent: number;
  messages_delivered: number;
  delivery_rate: number;
  responses_received: number;
  response_rate: number;
  estimated_roi_usd: number;
  period_days: number;
  agents: AgentStat[];
  recent_interactions: Interaction[];
}

const EMPTY: DashboardData = {
  messages_sent: 0,
  messages_delivered: 0,
  delivery_rate: 0,
  responses_received: 0,
  response_rate: 0,
  estimated_roi_usd: 0,
  period_days: 30,
  agents: [],
  recent_interactions: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// Point to the DO backend in production; empty string falls back to Vite proxy in dev
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  // Fetch dashboard stats from FastAPI
  useEffect(() => {
    const token = localStorage.getItem("sdai_token");
    if (!token) { setLoading(false); return; }

    setLoading(true);
    fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: DashboardData) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [period]);

  // Give the AI sidebar full dashboard context so it can answer performance questions
  useCopilotReadable({
    description: `Customer's SD AI agent performance stats for the last ${period} days`,
    value: {
      messages_sent: data.messages_sent,
      delivery_rate: `${data.delivery_rate}%`,
      response_rate: `${data.response_rate}%`,
      estimated_roi: `$${data.estimated_roi_usd}`,
      agents: data.agents.map((a) => ({
        name: a.agent_name,
        type: a.agent_type,
        sent: a.messages_sent,
        response_rate: `${a.response_rate}%`,
      })),
    },
  });

  useCopilotReadable({
    description: "Recent interactions / messages timeline",
    value: data.recent_interactions.slice(0, 5),
  });

  // Let the AI sidebar trigger message generation on behalf of the customer
  useCopilotAction({
    name: "generateMessage",
    description:
      "Generate a personalized outreach message using one of the SD AI agent types",
    parameters: [
      { name: "agentType", type: "string", description: "confirmation | win_back | quote_follow_up | etc." },
      { name: "contactName", type: "string", description: "Customer contact name" },
      { name: "businessName", type: "string", description: "Business name" },
      { name: "channel", type: "string", description: "sms or email" },
      { name: "extra", type: "string", description: "Any extra context (appointment time, invoice amount, etc.)" },
    ],
    handler: async ({ agentType, contactName, businessName, channel, extra }) => {
      const token = localStorage.getItem("sdai_token");
      if (!token) return "Error: not authenticated";

      // Find first matching agent for this type
      const agent = data.agents.find((a) => a.agent_type === agentType);
      if (!agent) return `No ${agentType} agent found. Create one first.`;

      const resp = await fetch(`${API_BASE}/api/v1/ai-agents/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: agent.agent_id,
          contact_name: contactName,
          business_name: businessName,
          channel,
          extra: extra ?? "",
        }),
      });

      if (!resp.ok) return `Generation failed: HTTP ${resp.status}`;
      const result = await resp.json();
      return result.message;
    },
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const statCards = [
    { label: "Messages Sent", value: data.messages_sent },
    { label: "Delivery Rate", value: `${data.delivery_rate}%` },
    { label: "Response Rate", value: `${data.response_rate}%` },
    { label: "Est. ROI", value: `$${data.estimated_roi_usd.toLocaleString()}` },
  ];

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>SD AI Solutions</h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0" }}>Agent Performance Dashboard</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          style={{ padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db" }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1.5rem", color: "#991b1b" }}>
          {error === "HTTP 401" ? "Session expired — please log in again." : `Error loading data: ${error}`}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {statCards.map(({ label, value }) => (
          <div key={label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.25rem" }}>{label}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
              {loading ? "—" : value}
            </div>
          </div>
        ))}
      </div>

      {/* Per-agent table */}
      {data.agents.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Agent Breakdown</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  {["Agent", "Type", "Sent", "Delivered", "Delivery %", "Responses", "Response %"].map((h) => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.agents.map((a) => (
                  <tr key={a.agent_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>{a.agent_name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#6b7280" }}>{a.agent_type}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{a.messages_sent}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{a.messages_delivered}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{a.delivery_rate}%</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{a.responses_received}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>{a.response_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent interactions timeline */}
      {data.recent_interactions.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Recent Activity</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.recent_interactions.map((i) => (
              <div key={i.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.75rem", background: i.direction === "inbound" ? "#dcfce7" : "#dbeafe", color: i.direction === "inbound" ? "#166534" : "#1d4ed8", borderRadius: "0.25rem", padding: "0.15rem 0.4rem", flexShrink: 0 }}>
                  {i.direction} · {i.channel}
                </span>
                <span style={{ fontSize: "0.875rem", color: "#374151", flex: 1 }}>{i.content_preview}</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0 }}>
                  {new Date(i.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CopilotKit tip */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.75rem", padding: "1.25rem" }}>
        <strong>💬 Ask your AI assistant</strong>
        <p style={{ margin: "0.5rem 0 0", color: "#374151", fontSize: "0.9rem" }}>
          Click the chat button in the bottom-right. Try: <em>"Generate a win-back SMS for Mike at Pacific HVAC"</em> or <em>"Why might my response rate be low?"</em>
        </p>
      </div>
    </div>
  );
}
