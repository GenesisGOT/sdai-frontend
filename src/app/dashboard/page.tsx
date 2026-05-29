import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Send, CheckCircle, MessageCircle, DollarSign, Bot } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

interface DashboardData {
  messages_sent: number
  messages_delivered: number
  delivery_rate: number
  responses_received: number
  response_rate: number
  estimated_roi_usd: number
  period_days: number
  agents: AgentStat[]
  recent_interactions: { id: number; channel: string; direction: string; status: string; content_preview: string; created_at: string }[]
}

const EMPTY: DashboardData = {
  messages_sent: 0, messages_delivered: 0, delivery_rate: 0,
  responses_received: 0, response_rate: 0, estimated_roi_usd: 0,
  period_days: 30, agents: [], recent_interactions: [],
}

function StatCard({ title, value, sub, trend, icon: Icon }: {
  title: string; value: string; sub: string; trend: "up" | "down" | "neutral"; icon: React.ElementType
}) {
  return (
    <Card className="@container/card" data-slot="card">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {trend === "up" ? <TrendingUp className="size-3" /> : trend === "down" ? <TrendingDown className="size-3" /> : null}
            {sub}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">
        Last {EMPTY.period_days} days
      </CardFooter>
    </Card>
  )
}

export default function Page() {
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
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: DashboardData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  return (
    <BaseLayout
      title="Agent Performance"
      description="Live stats from your SD AI agents"
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Period selector */}
        <div className="flex justify-end">
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

        {/* Stat cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : (
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Messages Sent" value={data.messages_sent.toLocaleString()} sub={`${data.messages_sent} total`} trend="up" icon={Send} />
            <StatCard title="Delivery Rate" value={`${data.delivery_rate.toFixed(1)}%`} sub={`${data.messages_delivered} delivered`} trend={data.delivery_rate >= 90 ? "up" : "down"} icon={CheckCircle} />
            <StatCard title="Response Rate" value={`${data.response_rate.toFixed(1)}%`} sub={`${data.responses_received} replies`} trend={data.response_rate >= 20 ? "up" : "down"} icon={MessageCircle} />
            <StatCard title="Est. ROI" value={`$${data.estimated_roi_usd.toLocaleString()}`} sub="estimated value" trend="up" icon={DollarSign} />
          </div>
        )}

        {/* Agent table */}
        {data.agents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Agent Breakdown</h2>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Agent", "Type", "Sent", "Delivery", "Response"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.agents.map((a) => (
                    <tr key={a.agent_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.agent_name}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{a.agent_type}</Badge></td>
                      <td className="px-4 py-3">{a.messages_sent}</td>
                      <td className="px-4 py-3">{a.delivery_rate.toFixed(1)}%</td>
                      <td className="px-4 py-3">{a.response_rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent interactions */}
        {data.recent_interactions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
            <div className="space-y-2">
              {data.recent_interactions.slice(0, 8).map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={i.direction === "outbound" ? "default" : "secondary"}>{i.direction}</Badge>
                    <span className="text-muted-foreground">{i.channel}</span>
                    <span className="truncate max-w-xs">{i.content_preview}</span>
                  </div>
                  <Badge variant={i.status === "delivered" ? "outline" : "secondary"}>{i.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && data.messages_sent === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bot className="size-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No agent activity yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Once your AI agents start sending messages, live stats will appear here.
            </p>
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
