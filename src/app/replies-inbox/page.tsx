"use client"

import { useEffect, useState, useCallback } from "react"
import {
  MessageSquare, Search, RefreshCcw, Phone, Mail,
  Clock, ArrowDownLeft, ArrowUpRight, Filter,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("sdai_token")}` })

interface Interaction {
  id: number
  channel: string
  direction: string
  status: string
  content_preview: string
  created_at: string
}

const CHANNEL_COLORS: Record<string, string> = {
  sms:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  voice: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
}

export default function RepliesInboxPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")

  const load = useCallback(() => {
    setLoading(true)
    // Use the dashboard summary recent_interactions for client-facing view
    fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=90`, { headers: auth() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.recent_interactions) {
          setInteractions(data.recent_interactions)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = interactions.filter(i => {
    const matchSearch = i.content_preview.toLowerCase().includes(search.toLowerCase())
    const matchChannel = channelFilter === "all" || i.channel === channelFilter
    const matchDir = directionFilter === "all" || i.direction === directionFilter
    return matchSearch && matchChannel && matchDir
  })

  const inboundCount = interactions.filter(i => i.direction === "inbound").length
  const outboundCount = interactions.filter(i => i.direction === "outbound").length

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  })

  return (
    <BaseLayout title="Message Inbox" description="Inbound replies and outbound messages from your AI agents">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center py-4">
            <div className="text-2xl font-bold tabular-nums">{interactions.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Messages</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold tabular-nums text-green-600">{inboundCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Replies Received</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold tabular-nums text-primary">{outboundCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Sent by Agents</div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search messages…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-36">
              <Filter className="size-3.5 mr-2 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
            </SelectContent>
          </Select>
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All messages</SelectItem>
              <SelectItem value="inbound">Replies only</SelectItem>
              <SelectItem value="outbound">Sent only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCcw className="size-4" /></Button>
        </div>

        {/* Message list */}
        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border rounded-xl text-center">
            <MessageSquare className="size-12 text-muted-foreground mb-3" />
            <p className="font-medium">No messages found</p>
            <p className="text-sm text-muted-foreground mt-1">Messages from your AI agents will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(i => (
              <Card key={i.id} className={`border-l-4 transition-colors hover:bg-muted/20 ${i.direction === "inbound" ? "border-l-green-500" : "border-l-primary"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${i.direction === "inbound" ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                        {i.direction === "inbound"
                          ? <ArrowDownLeft className="size-4 text-green-600" />
                          : <ArrowUpRight className="size-4 text-primary" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CHANNEL_COLORS[i.channel] ?? "bg-muted text-foreground"}`}>
                            {i.channel === "sms" ? <><Phone className="size-2.5 inline mr-0.5" />SMS</> : i.channel === "email" ? <><Mail className="size-2.5 inline mr-0.5" />Email</> : i.channel}
                          </span>
                          <Badge variant={i.direction === "inbound" ? "secondary" : "outline"} className="text-[10px]">
                            {i.direction === "inbound" ? "Reply from contact" : "Sent by agent"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-2">{i.content_preview}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="size-3" />
                      <span>{fmt(i.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
