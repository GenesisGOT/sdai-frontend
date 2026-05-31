"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Send, Clock, CheckCircle2, Loader2, XCircle, Plus, MessageSquarePlus,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("sdai_token")}`, "Content-Type": "application/json" })

interface ChangeRequest {
  id: number
  category: string
  subject: string
  details: string
  status: string
  created_at: string
}

const CATEGORIES = [
  { value: "new_agent", label: "Request a new agent" },
  { value: "edit_agent", label: "Change an existing agent" },
  { value: "messaging", label: "Update messaging / wording" },
  { value: "scheduling", label: "Change timing / schedule" },
  { value: "pause", label: "Pause something" },
  { value: "other", label: "Something else" },
]

const STATUS = {
  open:        { label: "Open",        color: "text-yellow-600", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-600",   icon: Loader2 },
  done:        { label: "Done",        color: "text-green-600",  icon: CheckCircle2 },
  declined:    { label: "Declined",    color: "text-gray-500",   icon: XCircle },
} as const

export default function RequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState("new_agent")
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${API_BASE}/api/v1/change-requests/mine`, { headers: auth() })
      .then(r => r.ok ? r.json() : [])
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function submit() {
    if (!subject.trim() || !details.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch(`${API_BASE}/api/v1/change-requests/`, {
        method: "POST", headers: auth(),
        body: JSON.stringify({ category, subject, details }),
      })
      if (!r.ok) throw new Error()
      setSent(true)
      setSubject(""); setDetails(""); setCategory("new_agent")
      setTimeout(() => { setSent(false); setShowForm(false); load() }, 1800)
    } catch {
      alert("Couldn't send your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <BaseLayout title="Requests" description="Ask your SD AI specialist to set up or change anything — we handle the rest">
      <div className="px-4 lg:px-6 space-y-6 max-w-3xl">

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="size-4" /> New Request
          </Button>
        ) : (
          <Card>
            <CardContent className="p-5 space-y-4">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="size-10 text-green-500 mb-3" />
                  <p className="font-semibold">Request sent!</p>
                  <p className="text-sm text-muted-foreground mt-1">Your SD AI specialist will follow up shortly.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-semibold">
                    <MessageSquarePlus className="size-4 text-primary" /> New Request
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">What do you need?</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject</label>
                    <Input placeholder="Short summary…" value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Details</label>
                    <Textarea
                      rows={5}
                      placeholder="Tell us what you'd like — the more detail, the better. Our team will handle the setup."
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || !subject.trim() || !details.trim()} className="gap-2">
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send Request
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Existing requests */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Your Requests</h2>
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-xl text-center">
              <MessageSquarePlus className="size-10 text-muted-foreground mb-3" />
              <p className="font-medium">No requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Need something changed or set up? Send a request above.</p>
            </div>
          ) : (
            requests.map(r => {
              const sc = STATUS[r.status as keyof typeof STATUS] ?? STATUS.open
              const Icon = sc.icon
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{r.subject}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.details}</p>
                        <div className="text-[11px] text-muted-foreground mt-1.5">{fmt(r.created_at)}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${sc.color}`}>
                        <Icon className="size-3.5" />{sc.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </BaseLayout>
  )
}
