"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"
import {
  TrendingUp, TrendingDown, Send, MessageCircle, DollarSign,
  Bot, CheckCircle, RefreshCcw, BarChart3,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("sdai_token")}` })

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

const TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-Up", win_back: "Win-Back", appointment: "Appointment",
  review: "Review", lead_gen: "Lead Gen", sales_upsell: "Upsell",
  support: "Support", onboarding: "Onboarding", confirmation: "Confirmation",
}

interface TimePoint { day: string; sent: number; replies: number }
interface RoiItem { agent: string; type: string; completed: number; value: number }
interface Summary {
  messages_sent: number; delivery_rate: number; response_rate: number
  estimated_roi_usd: number; agents: { agent_name: string; agent_type: string; messages_sent: number; response_rate: number; delivery_rate: number }[]
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30")
  const [timeseries, setTimeseries] = useState<TimePoint[]>([])
  const [roi, setRoi] = useState<RoiItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem("sdai_roi_goal")) || 0)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState("")

  function saveGoal() {
    const v = Math.max(0, Math.round(Number(goalInput) || 0))
    setGoal(v); localStorage.setItem("sdai_roi_goal", String(v)); setEditingGoal(false)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/v1/dashboard/timeseries?period_days=${period}`, { headers: auth() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/dashboard/roi-breakdown?period_days=${period}`, { headers: auth() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=${period}`, { headers: auth() }).then(r => r.ok ? r.json() : null),
    ])
      .then(([ts, roiData, sum]) => { setTimeseries(ts); setRoi(roiData); setSummary(sum) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const totalRoi = roi.reduce((a, b) => a + b.value, 0)
  const avgDelivery = summary?.delivery_rate ?? 0
  const avgResponse = summary?.response_rate ?? 0

  // Agent performance for bar chart
  const agentBars = (summary?.agents ?? []).map(a => ({
    name: a.agent_name.length > 14 ? a.agent_name.slice(0, 14) + "…" : a.agent_name,
    sent: a.messages_sent,
    response: parseFloat(a.response_rate.toFixed(1)),
    delivery: parseFloat(a.delivery_rate.toFixed(1)),
  }))

  // Pie data from ROI breakdown
  const pieData = roi.length > 0
    ? roi.map(r => ({ name: TYPE_LABELS[r.type] ?? r.type, value: r.value }))
    : (summary?.agents ?? []).map(a => ({ name: TYPE_LABELS[a.agent_type] ?? a.agent_type, value: a.messages_sent }))

  return (
    <BaseLayout title="Analytics" description="Performance trends across all your AI agents">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="size-4 text-primary" />
            <span>All agents · Last {period} days</span>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI row */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Messages Sent", value: (summary?.messages_sent ?? 0).toLocaleString(), icon: Send, trend: "up", sub: `${period}d window` },
              { label: "Delivery Rate", value: `${avgDelivery.toFixed(1)}%`, icon: CheckCircle, trend: avgDelivery >= 90 ? "up" : "down", sub: avgDelivery >= 90 ? "On track" : "Needs attention" },
              { label: "Response Rate", value: `${avgResponse.toFixed(1)}%`, icon: MessageCircle, trend: avgResponse >= 20 ? "up" : "neutral", sub: "Of messages sent" },
              { label: "Estimated ROI", value: `$${(summary?.estimated_roi_usd ?? 0).toLocaleString()}`, icon: DollarSign, trend: "up", sub: "Revenue recovered" },
            ].map(({ label, value, icon: Icon, trend, sub }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="flex items-center gap-1.5"><Icon className="size-3.5" />{label}</CardDescription>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {trend === "up" && <TrendingUp className="size-2.5 text-green-500" />}
                    {trend === "down" && <TrendingDown className="size-2.5 text-red-500" />}
                    {sub}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ROI goal tracker */}
        {!loading && (() => {
          const current = summary?.estimated_roi_usd ?? 0
          const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4" />Monthly ROI Goal</CardTitle>
                  <CardDescription>Track recovered revenue against your target</CardDescription>
                </div>
                {!editingGoal ? (
                  <Button variant="outline" size="sm" onClick={() => { setGoalInput(String(goal || "")); setEditingGoal(true) }}>
                    {goal > 0 ? "Edit goal" : "Set goal"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number" autoFocus value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveGoal() }}
                      placeholder="5000"
                      className="w-28 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button size="sm" onClick={saveGoal}>Save</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {goal > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold tabular-nums">${current.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">of ${goal.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pct >= 100
                        ? "🎉 Goal reached! Your agents recovered more than your target this period."
                        : `$${Math.max(0, goal - current).toLocaleString()} to go this period.`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Set a monthly revenue-recovered goal to track your agents' progress against it.</p>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* Message volume timeseries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Send className="size-4" />Message Volume</CardTitle>
            <CardDescription>Daily outbound messages and inbound replies</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-52" /> : timeseries.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeseries} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gReplies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                  <Area type="monotone" dataKey="sent" name="Sent" stroke="hsl(var(--primary))" fill="url(#gSent)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="replies" name="Replies" stroke="#22c55e" fill="url(#gReplies)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Agent performance bar chart */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bot className="size-4" />Agent Performance</CardTitle>
              <CardDescription>Messages sent and response rate per agent</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52" /> : agentBars.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No agents deployed yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agentBars} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                    <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="response" name="Reply %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ROI pie chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4" />ROI by Agent</CardTitle>
              <CardDescription>Estimated revenue per agent type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-52" /> : pieData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No completions yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} formatter={(v: number | string | undefined) => [`$${Number(v ?? 0).toLocaleString()}`, ""]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROI breakdown table */}
        {!loading && roi.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><RefreshCcw className="size-4" />ROI Breakdown</CardTitle>
              <CardDescription>Completed sequences and estimated value per agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roi.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{r.agent}</div>
                      <div className="text-xs text-muted-foreground">{TYPE_LABELS[r.type] ?? r.type} · {r.completed} completed</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-green-600">${r.value.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">est. value</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-semibold text-sm">
                  <span>Total Estimated ROI</span>
                  <span className="text-green-600">${totalRoi.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}
