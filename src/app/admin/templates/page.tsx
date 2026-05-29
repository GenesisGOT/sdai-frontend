import { useEffect, useState, useCallback } from "react"
import {
  LayoutTemplate, Search, Rocket, CheckCircle2, Loader2,
  MessageSquare, Mail, Zap, ListChecks, RefreshCcw,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

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

interface Template {
  id: number; name: string; slug: string; category: string
  description: string; channel: string; trigger_type: string
  industry_tags: string[]; message_templates: { step: number; delay_days: number; subject: string; body: string }[]
  variables: string[]; required_integrations: string[]; is_active: boolean; sort_order: number
}
interface Customer { id: number; company_name: string; email: string }

// ── Style maps ──────────────────────────────────────────────────────────────
const CATEGORY_STYLE: Record<string, { label: string; color: string }> = {
  follow_up:    { label: "Follow-Up",    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  win_back:     { label: "Win-Back",     color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  review:       { label: "Review",       color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  appointment:  { label: "Appointment",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  onboarding:   { label: "Onboarding",   color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  sales_upsell: { label: "Upsell",       color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  lead_gen:     { label: "Lead Gen",     color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" },
}
const CHANNEL_ICON: Record<string, React.ReactNode> = {
  sms:   <MessageSquare className="size-3 mr-1" />,
  email: <Mail className="size-3 mr-1" />,
  both:  <Zap className="size-3 mr-1" />,
}
const CHANNEL_COLOR: Record<string, string> = {
  sms:   "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  both:  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
}

// ── Deploy Dialog ────────────────────────────────────────────────────────────
function DeployDialog({ template, customers, onClose }: {
  template: Template; customers: Customer[]; onClose: () => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ? String(customers[0].id) : "")
  const [agentName, setAgentName] = useState(template.name)
  const [deploying, setDeploying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; agentId?: number; customerName?: string } | null>(null)

  async function deploy() {
    if (!customerId || !agentName) return
    setDeploying(true)
    try {
      const data = await apiFetch("/api/v1/admin/deploy-agent", {
        method: "POST",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          template_id: template.id,
          name: agentName,
        }),
      })
      const cust = customers.find(c => c.id === parseInt(customerId))
      setResult({ ok: true, agentId: data.id, customerName: cust?.company_name })
    } catch {
      setResult({ ok: false })
    } finally { setDeploying(false) }
  }

  const steps = template.message_templates?.length ?? 0

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><Rocket className="size-4 inline mr-2 text-primary" />Deploy Agent</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className={`rounded-xl p-4 border space-y-2 ${result.ok ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}>
            {result.ok ? (
              <>
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="size-4" />
                  Agent deployed for {result.customerName}!
                </div>
                <p className="text-sm text-muted-foreground">
                  Agent created in <strong>draft</strong> status. Go to Client Manager to activate it.
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">Deploy failed. Please try again.</p>
            )}
            <Button className="w-full mt-1" variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template summary */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <div className="font-medium">{template.name}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLOR[template.channel] ?? ""}`}>
                  {CHANNEL_ICON[template.channel]}{template.channel.toUpperCase()}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <ListChecks className="size-3" />{steps} step{steps !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground capitalize">{template.trigger_type?.replace(/_/g, " ")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Client Account</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Agent Name</label>
              <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. Post-Service Follow-Up" />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={deploy} disabled={deploying || !customerId || !agentName}>
                {deploying ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Rocket className="size-3.5 mr-1.5" />}
                Deploy
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onDeploy }: { template: Template; onDeploy: () => void }) {
  const cat = CATEGORY_STYLE[template.category] ?? { label: template.category, color: "bg-muted text-muted-foreground" }
  const steps = template.message_templates?.length ?? 0

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center ${CHANNEL_COLOR[template.channel] ?? ""}`}>
              {CHANNEL_ICON[template.channel]}{template.channel === "both" ? "SMS + Email" : template.channel.toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
            <ListChecks className="size-3" />{steps} step{steps !== 1 ? "s" : ""}
          </span>
        </div>
        <CardTitle className="text-base mt-2">{template.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">{template.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 justify-between gap-4 pt-0">
        {/* Industry tags */}
        {template.industry_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.industry_tags.slice(0, 5).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                {tag.replace(/_/g, " ")}
              </span>
            ))}
            {template.industry_tags.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{template.industry_tags.length - 5}</span>
            )}
          </div>
        )}

        {/* Step preview */}
        {steps > 0 && (
          <div className="space-y-1">
            {template.message_templates.slice(0, 2).map((s, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex gap-2">
                <span className="shrink-0 font-medium text-foreground/60">Day {s.delay_days}</span>
                <span className="truncate">{s.body.substring(0, 60)}…</span>
              </div>
            ))}
            {steps > 2 && <div className="text-[10px] text-muted-foreground">+{steps - 2} more steps</div>}
          </div>
        )}

        <Button size="sm" className="w-full mt-auto" onClick={onDeploy}>
          <Rocket className="size-3.5 mr-1.5" />Deploy for Client
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "win_back", label: "Win-Back" },
  { value: "review", label: "Review" },
  { value: "appointment", label: "Appointment" },
  { value: "onboarding", label: "Onboarding" },
  { value: "sales_upsell", label: "Upsell" },
  { value: "lead_gen", label: "Lead Gen" },
]
const CHANNELS = [
  { value: "all", label: "All Channels" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "both", label: "SMS + Email" },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [deployTarget, setDeployTarget] = useState<Template | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([
        apiFetch("/api/v1/admin/templates?limit=50"),
        apiFetch("/api/v1/admin/customers"),
      ])
      setTemplates(t)
      setCustomers(c)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = templates.filter(t => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false
    if (channelFilter !== "all" && t.channel !== channelFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.industry_tags?.some(tag => tag.includes(q))
      )
    }
    return true
  })

  return (
    <BaseLayout title="Agent Templates" description="Browse ready-to-deploy automation sequences and deploy them to client accounts">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats bar */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total Templates", value: templates.length, icon: <LayoutTemplate className="size-4 text-primary" /> },
            { label: "SMS Sequences", value: templates.filter(t => t.channel === "sms" || t.channel === "both").length, icon: <MessageSquare className="size-4 text-green-500" /> },
            { label: "Email Sequences", value: templates.filter(t => t.channel === "email" || t.channel === "both").length, icon: <Mail className="size-4 text-blue-500" /> },
            { label: "Avg Steps", value: templates.length ? (templates.reduce((s, t) => s + (t.message_templates?.length ?? 0), 0) / templates.length).toFixed(1) : "—", icon: <ListChecks className="size-4 text-purple-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>{icon}
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="size-3.5 mr-1.5" />Refresh</Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} template{filtered.length !== 1 ? "s" : ""}</p>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
            <LayoutTemplate className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium">No templates found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} onDeploy={() => setDeployTarget(t)} />
            ))}
          </div>
        )}
      </div>

      {deployTarget && (
        <DeployDialog
          template={deployTarget}
          customers={customers}
          onClose={() => setDeployTarget(null)}
        />
      )}
    </BaseLayout>
  )
}
