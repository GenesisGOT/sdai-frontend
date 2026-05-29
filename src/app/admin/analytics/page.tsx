import { useEffect, useState, useCallback } from "react"
import { BarChart3, CheckCircle2, XCircle, Zap, Users, RefreshCcw, TrendingUp } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
function authHeaders() {
  const token = localStorage.getItem("sdai_token")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}
async function apiFetch(path: string) {
  const r = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

interface DailyBucket { date: string; total: number; success: number; failed: number; skipped: number }
interface AgentPerf { agent_id: number; agent_name: string; agent_type: string; channel: string | null; total_runs: number; success: number; failed: number; success_rate: number }
interface TopClient { customer_id: number; company_name: string; total_runs: number; success: number }
interface AnalyticsData {
  days: number
  total_executions: number
  daily: DailyBucket[]
  agent_performance: AgentPerf[]
  top_clients: TopClient[]
}
interface AdminStats {
  customers: number
  agents: { total: number; active: number; paused: number; draft: number }
  templates: { total: number; active: number }
}

const EMPTY: AnalyticsData = { days: 30, total_executions: 0, daily: [], agent_performance: [], top_clients: [] }
const EMPTY_STATS: AdminStats = { customers: 0, agents: { total: 0, active: 0, paused: 0, draft: 0 }, templates: { total: 0, active: 0 } }

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  both: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
}

function StatCard({ title, value, sub, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; sub: string; icon: React.ElementType; color?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className={`size-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

// Format date label to shorter form
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(EMPTY)
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS)
  const [days, setDays] = useState("30")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        apiFetch(`/api/v1/admin/analytics?days=${days}`),
        apiFetch(`/api/v1/admin/stats`),
      ])
      setData(a); setStats(s)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  const successRate = data.total_executions > 0
    ? Math.round(data.daily.reduce((s, d) => s + d.success, 0) / data.total_executions * 100)
    : 0

  const chartData = data.daily.map(d => ({ ...d, date: fmtDate(d.date) }))

  return (
    <BaseLayout title="Analytics" description="Platform-wide execution metrics and trends">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCcw className="size-3.5 mr-1.5" />Refresh
            </Button>
          </div>
        </div>

        {/* Summary stat cards */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Clients" value={stats.customers} sub="Registered accounts" icon={Users} />
            <StatCard title="Active Agents" value={stats.agents.active} sub={`${stats.agents.total} total deployed`} icon={Zap} color="text-green-500" />
            <StatCard title="Executions" value={data.total_executions} sub={`Last ${days} days`} icon={BarChart3} />
            <StatCard
              title="Success Rate"
              value={`${successRate}%`}
              sub={`${data.daily.reduce((s, d) => s + d.success, 0)} successful runs`}
              icon={TrendingUp}
              color={successRate >= 80 ? "text-green-500" : "text-yellow-500"}
            />
          </div>
        )}

        {/* Execution Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Trend</CardTitle>
            <CardDescription>Daily agent runs — success vs failed</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No executions in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="success" name="Success" stroke="hsl(var(--primary))" fill="url(#gradSuccess)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="url(#gradFailed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Agent Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Performance</CardTitle>
              <CardDescription>Top agents by execution count</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : data.agent_performance.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.agent_performance.slice(0, 7).map(a => ({
                      name: a.agent_name.length > 14 ? a.agent_name.slice(0, 14) + "…" : a.agent_name,
                      success: a.success,
                      failed: a.failed,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="success" name="Success" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Clients</CardTitle>
              <CardDescription>By execution volume in period</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : data.top_clients.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-2">
                  {data.top_clients.map((c, idx) => {
                    const rate = c.total_runs > 0 ? Math.round(c.success / c.total_runs * 100) : 0
                    return (
                      <div key={c.customer_id} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{c.company_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{c.total_runs} runs</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium tabular-nums w-10 text-right">{rate}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        {!loading && data.agent_performance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Agent", "Type", "Channel", "Runs", "Success", "Failed", "Rate"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.agent_performance.map(a => (
                      <tr key={a.agent_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{a.agent_name}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{a.agent_type.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          {a.channel ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[a.channel] ?? "bg-muted text-foreground"}`}>
                              {a.channel}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono">{a.total_runs}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="size-3" />{a.success}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-red-500">
                            <XCircle className="size-3" />{a.failed}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={a.success_rate >= 80 ? "default" : a.success_rate >= 50 ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {a.success_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}
