"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type ColorMode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Bot, Zap, Clock, Webhook, Sparkles, MessageSquare, Mail,
  CheckCircle2, Reply, Workflow,
} from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/motion/motion-primitives"
import { cn } from "@/lib/utils"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface AgentStat {
  agent_id: number
  agent_name: string
  agent_type: string
  messages_sent: number
  delivery_rate: number
  response_rate: number
}

interface DashboardData {
  agents: AgentStat[]
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-Up", win_back: "Win-Back", appointment: "Appointment",
  review: "Review", lead_gen: "Lead Gen", sales_upsell: "Upsell",
  support: "Support", onboarding: "Onboarding",
}

const TRIGGER_LABELS: Record<string, string> = {
  follow_up: "After a service", win_back: "Customer lapses", appointment: "Before appointment",
  review: "Job completed", lead_gen: "New lead arrives", sales_upsell: "After purchase",
  support: "Ticket resolved", onboarding: "New sign-up",
}

/* -------------------------------------------------------------------------- */
/*  Custom node                                                                */
/* -------------------------------------------------------------------------- */

type Accent = "slate" | "violet" | "blue" | "green" | "amber"

interface StageData extends Record<string, unknown> {
  title: string
  subtitle?: string
  stat?: string
  statLabel?: string
  icon: keyof typeof ICONS
  accent: Accent
  hasTarget?: boolean
  hasSource?: boolean
}

const ICONS = {
  clock: Clock, webhook: Webhook, sparkles: Sparkles, message: MessageSquare,
  mail: Mail, check: CheckCircle2, reply: Reply, bot: Bot, zap: Zap,
}

const ACCENTS: Record<Accent, string> = {
  slate: "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60",
  violet: "border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50",
  blue: "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50",
  green: "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/50",
  amber: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50",
}

const ICON_ACCENTS: Record<Accent, string> = {
  slate: "text-slate-600 dark:text-slate-300",
  violet: "text-violet-600 dark:text-violet-300",
  blue: "text-blue-600 dark:text-blue-300",
  green: "text-green-600 dark:text-green-300",
  amber: "text-amber-600 dark:text-amber-300",
}

function StageNode({ data }: NodeProps<Node<StageData>>) {
  const Icon = ICONS[data.icon]
  return (
    <div
      className={cn(
        "w-[180px] rounded-xl border-2 px-3.5 py-3 shadow-sm transition-shadow hover:shadow-md",
        ACCENTS[data.accent],
      )}
    >
      {data.hasTarget && <Handle type="target" position={Position.Left} className="!size-2 !border-2 !bg-background" />}
      <div className="flex items-center gap-2">
        <div className={cn("flex size-7 items-center justify-center rounded-lg bg-background/70", ICON_ACCENTS[data.accent])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">{data.title}</div>
          {data.subtitle && (
            <div className="truncate text-[11px] leading-tight text-muted-foreground">{data.subtitle}</div>
          )}
        </div>
      </div>
      {data.stat != null && (
        <div className="mt-2 flex items-baseline gap-1 border-t pt-2">
          <span className="text-lg font-bold tabular-nums">{data.stat}</span>
          {data.statLabel && <span className="text-[11px] text-muted-foreground">{data.statLabel}</span>}
        </div>
      )}
      {data.hasSource && <Handle type="source" position={Position.Right} className="!size-2 !border-2 !bg-background" />}
    </div>
  )
}

const nodeTypes = { stage: StageNode }

/* -------------------------------------------------------------------------- */
/*  Flow builder                                                               */
/* -------------------------------------------------------------------------- */

function buildFlow(agent: AgentStat): { nodes: Node<StageData>[]; edges: Edge[] } {
  const delivered = Math.round((agent.messages_sent * agent.delivery_rate) / 100)
  const replies = Math.round((agent.messages_sent * agent.response_rate) / 100)

  const nodes: Node<StageData>[] = [
    {
      id: "trigger",
      type: "stage",
      position: { x: 0, y: 80 },
      data: {
        title: "Trigger", subtitle: TRIGGER_LABELS[agent.agent_type] ?? "Scheduled",
        icon: "clock", accent: "slate", hasSource: true,
      },
    },
    {
      id: "personalize",
      type: "stage",
      position: { x: 240, y: 80 },
      data: {
        title: "AI Personalize", subtitle: "Claude writes the message",
        icon: "sparkles", accent: "violet", hasTarget: true, hasSource: true,
      },
    },
    {
      id: "send",
      type: "stage",
      position: { x: 480, y: 80 },
      data: {
        title: "Send", subtitle: "SMS / Email",
        icon: "message", accent: "blue",
        stat: agent.messages_sent.toLocaleString(), statLabel: "sent",
        hasTarget: true, hasSource: true,
      },
    },
    {
      id: "delivered",
      type: "stage",
      position: { x: 720, y: 0 },
      data: {
        title: "Delivered", subtitle: "Reached the customer",
        icon: "check", accent: "green",
        stat: `${agent.delivery_rate.toFixed(0)}%`, statLabel: `${delivered.toLocaleString()} delivered`,
        hasTarget: true,
      },
    },
    {
      id: "reply",
      type: "stage",
      position: { x: 720, y: 160 },
      data: {
        title: "Replies", subtitle: "Customer responded",
        icon: "reply", accent: "amber",
        stat: `${agent.response_rate.toFixed(0)}%`, statLabel: `${replies.toLocaleString()} replies`,
        hasTarget: true,
      },
    },
  ]

  const edge = (id: string, source: string, target: string, label?: string, animated = true): Edge => ({
    id, source, target, label, animated,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    labelStyle: { fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "hsl(var(--background))" },
  })

  const edges: Edge[] = [
    edge("e1", "trigger", "personalize"),
    edge("e2", "personalize", "send"),
    edge("e3", "send", "delivered", "delivered"),
    edge("e4", "send", "reply", "reply"),
  ]

  return { nodes, edges }
}

/* -------------------------------------------------------------------------- */
/*  Color mode (sync React Flow with the app's class-based dark theme)         */
/* -------------------------------------------------------------------------- */

function useColorMode(): ColorMode {
  const [mode, setMode] = useState<ColorMode>(
    () => (typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"),
  )
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => {
      setMode(el.classList.contains("dark") ? "dark" : "light")
    })
    obs.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return mode
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AgentFlowPage() {
  const [agents, setAgents] = useState<AgentStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>("")
  const colorMode = useColorMode()

  useEffect(() => {
    const token = localStorage.getItem("sdai_token")
    if (!token) { setLoading(false); return }
    fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: DashboardData) => {
        setAgents(d.agents ?? [])
        if (d.agents?.length) setSelectedId(String(d.agents[0].agent_id))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selected = agents.find(a => String(a.agent_id) === selectedId)
  const { nodes, edges } = useMemo(
    () => (selected ? buildFlow(selected) : { nodes: [], edges: [] }),
    [selected],
  )

  return (
    <BaseLayout
      title="Agent Flow"
      description="See exactly how each of your AI agents works — step by step, with live numbers."
    >
      <div className="px-4 lg:px-6 space-y-4">
        <FadeIn direction="up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Workflow className="size-4 text-primary" />
              <span>Visual pipeline for your deployed agents</span>
            </div>
            {agents.length > 0 && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.agent_id} value={String(a.agent_id)}>
                      {a.agent_name} · {AGENT_TYPE_LABELS[a.agent_type] ?? a.agent_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </FadeIn>

        {loading ? (
          <Skeleton className="h-[460px] w-full rounded-xl" />
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Bot className="mb-3 size-12 text-muted-foreground" />
              <p className="font-medium">No agents to visualize yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once your account manager deploys an agent, its flow will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <FadeIn direction="up" delay={0.05}>
            {selected && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Bot className="size-3" />{selected.agent_name}
                </Badge>
                <Badge variant="outline">{AGENT_TYPE_LABELS[selected.agent_type] ?? selected.agent_type}</Badge>
                <Badge variant={selected.messages_sent > 0 ? "default" : "secondary"} className="gap-1">
                  <Zap className="size-3" />{selected.messages_sent > 0 ? "Active" : "Idle"}
                </Badge>
              </div>
            )}
            <div className="h-[460px] w-full overflow-hidden rounded-xl border bg-muted/10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                colorMode={colorMode}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnScroll
              >
                <Background gap={16} className="opacity-60" />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable className="!bg-background" />
              </ReactFlow>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This is a managed agent — SD AI configures every step. Want a change?{" "}
              <a href="/requests" className="text-primary underline-offset-2 hover:underline">Request one here.</a>
            </p>
          </FadeIn>
        )}
      </div>
    </BaseLayout>
  )
}
