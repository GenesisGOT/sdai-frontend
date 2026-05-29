import { useEffect, useState, useCallback } from "react"
import {
  MessageSquare, Search, RefreshCcw, Phone, Mail,
  Ban, CheckCircle2, AlertTriangle,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

function authHeaders() {
  const token = localStorage.getItem("sdai_token")
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...(opts?.headers ?? {}) } })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

interface Reply {
  id: number
  customer_id: number
  channel: string
  content: string
  metadata_json: Record<string, string | null> | null
  created_at: string
}
interface OptOut {
  id: number
  phone: string
  customer_id: number | null
  reason: string | null
  opted_out_at: string
  opted_back_in_at: string | null
  is_active: boolean
}
interface Stats { total: number; sms: number; email: number; opt_outs: number }

const KEYWORD_COLORS: Record<string, string> = {
  STOP: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  START: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  HELP: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
}

export default function RepliesPage() {
  const [replies, setReplies] = useState<Reply[]>([])
  const [optOuts, setOptOuts] = useState<OptOut[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState("all")
  const [newOptOut, setNewOptOut] = useState("")
  const [addingOptOut, setAddingOptOut] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, o, s] = await Promise.all([
        apiFetch("/api/v1/replies?limit=100"),
        apiFetch("/api/v1/replies/opt-outs?is_active=true"),
        apiFetch("/api/v1/replies/stats"),
      ])
      setReplies(r); setOptOuts(o); setStats(s)
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = replies.filter(r => {
    const matchChannel = channelFilter === "all" || r.channel === channelFilter
    const matchSearch = !search || r.content.toLowerCase().includes(search.toLowerCase()) ||
      r.metadata_json?.from?.includes(search)
    return matchChannel && matchSearch
  })

  async function removeOptOut(id: number) {
    if (!confirm("Re-subscribe this number? They'll receive messages again.")) return
    try {
      await fetch(`${API_BASE}/api/v1/replies/opt-outs/${id}`, { method: "DELETE", headers: authHeaders() })
      setOptOuts(prev => prev.filter(o => o.id !== id))
    } catch { /* noop */ }
  }

  async function addOptOut() {
    if (!newOptOut.trim()) return
    setAddingOptOut(true)
    try {
      const o = await apiFetch("/api/v1/replies/opt-outs", {
        method: "POST",
        body: JSON.stringify({ phone: newOptOut.trim(), reason: "manual" }),
      })
      setOptOuts(prev => [o, ...prev])
      setNewOptOut("")
    } catch { /* noop */ }
    finally { setAddingOptOut(false) }
  }

  return (
    <BaseLayout title="Replies & Opt-Outs" description="Inbound SMS replies and unsubscribe management">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total Replies", icon: <MessageSquare className="size-4" />, value: stats?.total },
            { label: "SMS Replies", icon: <Phone className="size-4 text-green-500" />, value: stats?.sms },
            { label: "Email Replies", icon: <Mail className="size-4 text-blue-500" />, value: stats?.email },
            { label: "Opt-Outs", icon: <Ban className="size-4 text-red-500" />, value: stats?.opt_outs },
          ].map(({ label, icon, value }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>
                <span className="text-muted-foreground">{icon}</span>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{value ?? 0}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCcw className="size-3.5 mr-1.5" />Refresh
          </Button>
        </div>

        <Tabs defaultValue="replies">
          <TabsList>
            <TabsTrigger value="replies">
              <MessageSquare className="size-3.5 mr-1.5" />Inbox
            </TabsTrigger>
            <TabsTrigger value="optouts">
              <Ban className="size-3.5 mr-1.5" />Opt-Outs
              {stats?.opt_outs ? <Badge variant="secondary" className="ml-1.5 text-[10px]">{stats.opt_outs}</Badge> : null}
            </TabsTrigger>
          </TabsList>

          {/* ── REPLIES INBOX ── */}
          <TabsContent value="replies" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Search replies..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
                <MessageSquare className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium">No replies yet</p>
                <p className="text-sm text-muted-foreground mt-1">Replies from customers will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(reply => {
                  const meta = reply.metadata_json ?? {}
                  const keyword = meta.keyword?.toUpperCase()
                  return (
                    <div key={reply.id} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              reply.channel === "sms"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}>
                              {reply.channel === "sms" ? <Phone className="size-2.5 inline mr-0.5" /> : <Mail className="size-2.5 inline mr-0.5" />}
                              {reply.channel}
                            </span>
                            {meta.from && <span className="text-xs text-muted-foreground font-mono">{meta.from}</span>}
                            {keyword && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${KEYWORD_COLORS[keyword] ?? ""}`}>
                                {keyword}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ── OPT-OUTS ── */}
          <TabsContent value="optouts" className="space-y-4 mt-4">
            {/* Add manual opt-out */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="size-4 text-yellow-500" />
                  Manually Add Opt-Out
                </CardTitle>
                <CardDescription className="text-xs">
                  Add a phone number or email to the opt-out list — they won't receive any more messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="+1 619 555 0100 or email@example.com"
                    value={newOptOut}
                    onChange={e => setNewOptOut(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addOptOut} disabled={addingOptOut || !newOptOut.trim()} size="sm">
                    <Ban className="size-3.5 mr-1.5" />Add Opt-Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : optOuts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-xl">
                <CheckCircle2 className="size-10 text-green-500 mb-3" />
                <p className="font-medium">No active opt-outs</p>
                <p className="text-sm text-muted-foreground mt-1">All contacts are subscribed.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Phone / Email", "Reason", "Opted Out", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {optOuts.map(o => (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{o.phone}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px] capitalize">{o.reason ?? "manual"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(o.opted_out_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700"
                            onClick={() => removeOptOut(o.id)}
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />Re-subscribe
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
