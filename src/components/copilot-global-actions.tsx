"use client"

import { useNavigate } from "react-router-dom"
import { useCopilotAction } from "@/context/copilot-actions"

/**
 * Registers app-wide copilot actions (navigation + common shortcuts) for the
 * lifetime of the authenticated shell. Mounted once inside BaseLayout, which
 * lives within the Router so `useNavigate` is available.
 *
 * Each `useCopilotAction` call is a hook, so the set of actions is static here
 * (hooks can't be called in a loop with varying identity safely across renders).
 */
export function CopilotGlobalActions() {
  const navigate = useNavigate()

  useCopilotAction({
    name: "goto_dashboard",
    description: "Open the main dashboard with KPIs and agent overview.",
    chipLabel: "Dashboard",
    keywords: ["dashboard", "home", "overview"],
    handler: () => navigate("/dashboard"),
  })

  useCopilotAction({
    name: "goto_analytics",
    description: "Open the analytics page with charts and ROI breakdown.",
    chipLabel: "Analytics",
    keywords: ["analytics", "stats", "charts", "roi", "performance"],
    handler: () => navigate("/analytics"),
  })

  useCopilotAction({
    name: "goto_agent_flow",
    description: "Open the Agent Flow page that visualizes how each agent works.",
    chipLabel: "Agent Flow",
    keywords: ["agent flow", "flow", "pipeline", "diagram", "how it works", "visual"],
    handler: () => navigate("/agent-flow"),
  })

  useCopilotAction({
    name: "goto_sequences",
    description: "Open the Sequences page showing message sequence progress.",
    keywords: ["sequences", "enrollments", "steps", "progress"],
    handler: () => navigate("/enrollments"),
  })

  useCopilotAction({
    name: "goto_inbox",
    description: "Open the Inbox with inbound and outbound messages.",
    chipLabel: "Inbox",
    keywords: ["inbox", "messages", "replies", "conversations"],
    handler: () => navigate("/inbox"),
  })

  useCopilotAction({
    name: "goto_contacts",
    description: "Open the Contacts list.",
    keywords: ["contacts", "customers", "people", "list"],
    handler: () => navigate("/contacts"),
  })

  useCopilotAction({
    name: "request_change",
    description: "Open the Request-a-Change form to ask the SD AI team to adjust an agent.",
    chipLabel: "Request a change",
    keywords: ["request", "change", "adjust", "edit agent", "modify", "ask team"],
    handler: () => navigate("/requests"),
  })

  useCopilotAction({
    name: "goto_billing",
    description: "Open Plans & Billing.",
    keywords: ["billing", "plan", "invoice", "subscription", "upgrade", "payment"],
    handler: () => navigate("/settings/billing"),
  })

  return null
}
