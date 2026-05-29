"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ListChecks, Search, RefreshCcw, Play, Pause, Trash2,
  Bot, User, Clock, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("sdai_token")}`, "Content-Type": "application/json" })

interface Enrollment {
  id: number
  contact_id: number
  agent_id: number
  contact_name: string | null
  agent_name: string | null
  current_step: number
  total_steps: number
  status: string
  enrolled_at: string
  last_run_at: string | null
  next_run_at: string | null
  notes: string | null
}

interface Stats { total: number; active: number; completed: number; paused: number; failed: number; opted_out: number }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:     { label: "Active",     color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",  icon: Play },
  paused:     { label: "Paused",     color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Pause },
  completed:  { label: "Completed",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",    icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",         icon: XCircle },
  opted_out:  { label: "Opted Out",  color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",        icon: AlertCircle },
  cancelled:  { label: "Cancelled",  color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",        icon: XCircle },
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Step {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionId, setActionId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : ""
    Promise.all([
      fetch(`${API_BASE}/api/v1/enrollments${qs}`, { headers: auth() }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/enrollments/stats`, { headers: auth() }).then(r => r.ok ? r.json() : null),
    ])
      .then(([list, s]) => { setEnrollments(list); setStats(s) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = enrollments.filter(e =>
    (e.contact_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (e.agent_name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function pause(id: number) {
    setActionId(id)
    await fetch(`${API_BASE}/api/v1/enrollments/${id}/pause`, { method: "PATCH", headers: auth() })
    load(); setActionId(null)
  }

  async function resume(id: number) {
    setActionId(id)
    await fetch(`${API_BASE}/api/v1/enrollments/${id}/resume`, { method: "PATCH", headers: auth() })
    load(); setActionId(null)
  }

  async function cancel(id: number) {
    if (!confirm("Remove this enrollment?")) return
    setActionId(id)
    await fetch(`${API_BASE}/api/v1/enrollments/${id}`, { method: "DELETE", headers: auth() })
    load(); setActionId(null)
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

  return (
    <BaseLayout title="Sequence Tracker" description="Monitor your contacts' progress through AI agent sequences">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Active", value: stats.active, color: "text-green-600" },
              { label: "Completed", value: stats.completed, color: "text-blue-600" },
              { label: "Paused", value: stats.paused, color: "text-yellow-600" },
              { label: "Failed", value: stats.failed, color: "text-red-600" },
              { label: "Opted Out", value: stats.opted_out, color: "text-gray-500" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="text-center py-3">
                <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search contact or agent…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="opted_out">Opted Out</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCcw className="size-4" /></Button>
        </div>

        {/* Enrollments list */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border rounded-xl text-center">
            <ListChecks className="size-12 text-muted-foreground mb-3" />
            <p className="font-medium">No enrollments found</p>
            <p className="text-sm text-muted-foreground mt-1">Contacts enrolled in sequences will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(e => {
              const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.cancelled
              const StatusIcon = sc.icon
              const busy = actionId === e.id
              return (
                <Card key={e.id} className="hover:bg-muted/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="size-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{e.contact_name ?? `Contact #${e.contact_id}`}</div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Bot className="size-3" />{e.agent_name ?? `Agent #${e.agent_id}`}
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                            <StatusIcon className="size-3" />{sc.label}
                          </span>
                        </div>

                        {/* Progress */}
                        <ProgressBar current={e.current_step} total={e.total_steps} />

                        {/* Timestamps */}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="size-3" />Enrolled {fmt(e.enrolled_at)}</span>
                          {e.last_run_at && <span>Last run {fmt(e.last_run_at)}</span>}
                          {e.next_run_at && e.status === "active" && <span className="text-primary">Next {fmt(e.next_run_at)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 sm:flex-col">
                        {e.status === "active" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy} onClick={() => pause(e.id)}>
                            <Pause className="size-3 mr-1" />Pause
                          </Button>
                        )}
                        {e.status === "paused" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50" disabled={busy} onClick={() => resume(e.id)}>
                            <Play className="size-3 mr-1" />Resume
                          </Button>
                        )}
                        {["active", "paused"].includes(e.status) && (
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => cancel(e.id)}>
                            <Trash2 className="size-3 mr-1" />Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
