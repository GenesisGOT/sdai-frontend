"use client"

import { useEffect, useState } from "react"
import {
  TrendingUp, TrendingDown, Send, CheckCircle, MessageCircle,
  DollarSign, Bot, Zap, Pause, Play, Clock, ArrowRight,
  MessageSquare, BarChart3,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface AgentStat {
  agent_id: number
  agent_name: string
  agent_type: string
  messages_sent: number
  delivery_rate: number
  response_rate: number
}

interface RecentInteraction {
  id: number
  channel: string
  direction: string
  status: string
  content_preview: string
  created_at: string
}

interface DashboardData {
  messages_sent: number
  messages_delivered: number
  delivery_rate: number
  responses_received: number
  response_rate: number
  estimated_roi_usd: number
  period_days: number
  agents: AgentStat[]
  recent_interactions: RecentInteraction[]
}

const EMPTY: DashboardData = {
  messages_sent: 0, messages_delivered: 0, delivery_rate: 0,
  responses_received: 0, response_rate: 0, estimated_roi_usd: 0,
  period_days: 30, agents: [], recent_interactions: [],
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-Up", win_back: "Win-Back", appointment: "Appointment",
  review: "Review", lead_gen: "Lead Gen", sales_upsell: "Upsell",
  support: "Support", onboarding: "Onboarding",
}

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
}

// Build a simple sparkline dataset from messages_sent over the period
function buildSparkline(total: number, days: number) {
  const perDay = total / Math.max(days, 1)
  return Array.from({ length: Math.min(days, 14) }, (_, i) => ({
    day: i + 1,
    sent: Math.round(perDay * (0.6 + Math.random() * 0.8)),
  }))
}

function StatCard({
  title, value, sub, trend, icon: Icon, footer,
}: {
  title: string; value: string; sub: string; trend: "up" | "down" | "neutral"
  icon: React.ElementType; footer?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />{title}
        </CardDescription>
        <Badge variant="outline" className="text-[10px] gap-1">
          {trend === "up" && <TrendingUp className="size-2.5 text-green-500" />}
          {trend === "down" && <TrendingDown className="size-2.5 text-red-500" />}
          {sub}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
      {footer && (
        <CardFooter className="text-xs text-muted-foreground">{footer}</CardFooter>
      )}
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    const token = localStorage.getItem("sdai_token")
    if (!token) { setLoading(false); return }
    setLoading(true)
    fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: DashboardData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const sparkline = buildSparkline(data.messages_sent, parseInt(period))
  const activeAgents = data.agents.filter(a => a.messages_sent > 0)
  const inboundReplies = data.recent_interactions.filter(i => i.direction === "inbound")

  return (
    <BaseLayout
      title="My Dashboard"
      description="Your AI agents — live performance at a glance"
    >
      <div className="px-4 lg:px-6 space-y-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="size-4 text-primary" />
              <span>{loading ? "—" : `${data.agents.length} agent${data.agents.length !== 1 ? "s" : ""} deployed`}</span>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Messages Sent" value={data.messages_sent.toLocaleString()}
              sub={`${data.period_days}d`} trend="up" icon={Send}
              footer={`${data.messages_delivered.toLocaleString()} delivered`}
            />
            <StatCard
              title="Delivery Rate" value={`${data.delivery_rate.toFixed(1)}%`}
              sub={data.delivery_rate >= 90 ? "on track" : "needs attention"}
              trend={data.delivery_rate >= 90 ? "up" : "down"} icon={CheckCircle}
              footer={`Industry avg: ~92%`}
            />
            <StatCard
              title="Response Rate" value={`${data.response_rate.toFixed(1)}%`}
              sub={`${data.responses_received} replies`}
              trend={data.response_rate >= 20 ? "up" : "neutral"} icon={MessageCircle}
              footer={`${inboundReplies.length} inbound this period`}
            />
            <StatCard
              title="Estimated ROI" value={`$${data.estimated_roi_usd.toLocaleString()}`}
              sub="recovered value" trend="up" icon={DollarSign}
              footer="Based on re-engagement rate"
            />
          </div>
        )}

        {/* Sparkline chart */}
        {!loading && data.messages_sent > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4" />Message Volume
                </CardTitle>
                <span className="text-xs text-muted-foreground">Estimated daily trend</span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                    formatter={(v: number) => [v, "Messages"]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <Area type="monotone" dataKey="sent" stroke="hsl(var(--primary))" fill="url(#grad1)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Agent cards */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Bot className="size-4" />Your Agents
            </h2>
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : data.agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-xl text-center">
                <Bot className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium">No agents deployed yet</p>
                <p className="text-sm text-muted-foreground mt-1">Contact your SD AI account manager to get started.</p>
              </div>
            ) : (
              data.agents.map(a => {
                const isActive = a.messages_sent > 0
                return (
                  <div key={a.agent_id} className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                        <Bot className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{a.agent_name}</div>
                        <div className="text-xs text-muted-foreground">{AGENT_TYPE_LABELS[a.agent_type] ?? a.agent_type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block">
                        <div className="text-sm font-semibold tabular-nums">{a.messages_sent}</div>
                        <div className="text-xs text-muted-foreground">sent</div>
                      </div>
                      <div className="hidden md:block">
                        <div className="text-sm font-semibold tabular-nums">{a.response_rate.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">replies</div>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                        {isActive ? <><Zap className="size-2.5 mr-1" />Active</> : <><Pause className="size-2.5 mr-1" />Idle</>}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Recent replies */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="size-4" />Recent Activity
              </h2>
              <Link to="/mail">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View all <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : data.recent_interactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-xl text-center">
                <MessageCircle className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium text-sm">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Activity will appear here once agents start running.</p>
              </div>
            ) : (
              data.recent_interactions.slice(0, 6).map((i) => (
                <div key={i.id} className="rounded-xl border px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[i.channel] ?? "bg-muted text-foreground"}`}>
                        {i.channel}
                      </span>
                      <Badge
                        variant={i.direction === "inbound" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {i.direction === "inbound" ? "reply" : "sent"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{i.content_preview}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "View Messages", desc: "Full inbox & conversation threads", href: "/mail", icon: MessageSquare },
            { label: "My Contacts", desc: "Manage your contact list", href: "/users", icon: CheckCircle },
            { label: "Billing", desc: "Plans, usage & invoices", href: "/settings/billing", icon: DollarSign },
          ].map(({ label, desc, href, icon: Icon }) => (
            <Link key={label} to={href}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{desc}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <span className="text-xs text-primary flex items-center gap-1">
                    Open <ArrowRight className="size-3" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {!loading && data.messages_sent === 0 && data.agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl">
            <Bot className="size-14 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Welcome to SD AI Solutions</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm">
              Your AI agents will show live stats here once they've been set up and activated by your account manager.
            </p>
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
