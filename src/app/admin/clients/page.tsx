import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Bot, CheckCircle2, Clock, FileText,
  Play, Pause, Trash2, Zap, Phone, Mail, Building2,
  Rocket, RefreshCcw, Link2, ChevronDown, ChevronUp,
  Loader2, TerminalSquare, XCircle, Settings2, Plus, Minus,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface Customer { id: number; email: string; company_name: string; contact_name: string; phone: string | null; is_active: boolean }
interface Agent { id: number; customer_id: number; name: string; agent_type: string; status: string; description: string | null; channel: string | null; trigger_type: string | null; deployed_by: string | null; created_at: string }
interface Integration { id: number; provider: string; is_active: boolean; created_at: string }
interface Execution { id: number; agent_id: number; trigger: string; contact_name: string | null; channel: string | null; message_sent: string | null; status: string; error_message: string | null; started_at: string; finished_at: string | null; tokens_used?: { input_tokens: number; output_tokens: number } }

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  both: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  voice: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}
const CATEGORY_LABELS: Record<string, string> = {
  follow_up: "Follow-Up", win_back: "Win-Back", appointment: "Appointment",
  review: "Review", lead_gen: "Lead Gen", sales_upsell: "Sales & Upsell",
  support: "Support", onboarding: "Onboarding", industry: "Industry",
}
const PROVIDER_LABELS: Record<string, string> = {
  zapier: "Zapier", twilio: "Twilio", sendgrid: "SendGrid", salesforce: "Salesforce",
  hubspot: "HubSpot", stripe: "Stripe",
}
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="size-3.5" />, color: "text-green-600" },
  failed: { icon: <XCircle className="size-3.5" />, color: "text-red-500" },
  running: { icon: <Loader2 className="size-3.5 animate-spin" />, color: "text-blue-500" },
  pending: { icon: <Clock className="size-3.5" />, color: "text-yellow-500" },
  skipped: { icon: <FileText className="size-3.5" />, color: "text-muted-foreground" },
}

// ── Agent Config Editor ───────────────────────────────────────────────────
interface MsgTemplate { text: string; subject: string; delay_days: number }

function ConfigEditorDialog({ agent, onClose, onSaved }: {
  agent: Agent; onClose: () => void; onSaved: (a: Agent) => void
}) {
  // Derive initial templates from agent.config
  const initial: MsgTemplate[] = (() => {
    const raw = (agent as any).config
    if (!raw) return [{ text: "", subject: "", delay_days: 0 }]
    if (Array.isArray(raw.message_templates)) return raw.message_templates.map((t: any) => ({
      text: t.text ?? t.body ?? "",
      subject: t.subject ?? "",
      delay_days: t.delay_days ?? 0,
    }))
    return [{ text: "", subject: "", delay_days: 0 }]
  })()

  const [templates, setTemplates] = useState<MsgTemplate[]>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(idx: number, key: keyof MsgTemplate, val: string | number) {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t))
  }
  function addStep() { setTemplates(p => [...p, { text: "", subject: "", delay_days: 0 }]) }
  function removeStep(idx: number) { setTemplates(p => p.filter((_, i) => i !== idx)) }

  async function save() {
    setSaving(true)
    try {
      const body = { message_templates: templates }
      const r = await fetch(`${API_BASE}/api/v1/admin/agents/${agent.id}/config`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`${r.status}`)
      const updated = await r.json()
      setSaved(true)
      setTimeout(() => { onSaved(updated); onClose() }, 800)
    } catch { /* noop */ } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />Configure: {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Edit the message sequence for this agent. Each step is sent at a different delay. Claude personalises the text at send time using these as templates.
          </p>

          {templates.map((t, idx) => (
            <div key={idx} className="border rounded-xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step {idx + 1}</span>
                {templates.length > 1 && (
                  <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => removeStep(idx)}>
                    <Minus className="size-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Email Subject (optional)</Label>
                  <Input value={t.subject} onChange={e => update(idx, "subject", e.target.value)} placeholder="e.g. We miss you at {business_name}" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Delay (days after prev)</Label>
                  <Input
                    type="number" min={0} max={365}
                    value={t.delay_days}
                    onChange={e => update(idx, "delay_days", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Message Template</Label>
                <Textarea
                  value={t.text}
                  onChange={e => update(idx, "text", e.target.value)}
                  rows={4}
                  placeholder="Hi {contact_name}, just following up from {business_name}…&#10;&#10;Use {placeholders} for personalisation — Claude will fill in the rest."
                  className="text-sm font-mono resize-none"
                />
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addStep} className="w-full border-dashed">
            <Plus className="size-3.5 mr-1.5" />Add Step
          </Button>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Available placeholders: <code className="bg-background px-1 rounded">{"{contact_name}"}</code>{" "}
            <code className="bg-background px-1 rounded">{"{business_name}"}</code>{" "}
            <code className="bg-background px-1 rounded">{"{business_type}"}</code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || saved}>
            {saving ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Saving…</> :
             saved ? <><CheckCircle2 className="size-3.5 mr-1.5 text-green-500" />Saved!</> :
             <><Settings2 className="size-3.5 mr-1.5" />Save Config</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Run Agent Dialog ──────────────────────────────────────────────────────
function RunAgentDialog({ agent, customer, onClose, onRan }: {
  agent: Agent; customer: Customer; onClose: () => void; onRan: () => void
}) {
  const [contactName, setContactName] = useState(customer.contact_name)
  const [contactPhone, setContactPhone] = useState(customer.phone ?? "")
  const [contactEmail, setContactEmail] = useState(customer.email)
  const [businessName, setBusinessName] = useState(customer.company_name)
  const [businessType, setBusinessType] = useState("local business")
  const [step, setStep] = useState("0")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ status: string; message?: string; error?: string } | null>(null)

  async function handleRun() {
    setRunning(true); setResult(null)
    try {
      const data = await apiFetch("/api/v1/executions/run", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agent.id,
          contact_name: contactName,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
          business_name: businessName,
          business_type: businessType,
          step: parseInt(step),
        }),
      })
      setResult({ status: data.status, message: data.message_sent, error: data.error })
      if (data.status === "success") onRan()
    } catch (e) {
      setResult({ status: "error", error: "Request failed" })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />Run: {agent.name}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className={`rounded-xl p-4 ${result.status === "success" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
            <div className="flex items-center gap-2 font-medium mb-2">
              {result.status === "success" ? <CheckCircle2 className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-500" />}
              {result.status === "success" ? "Agent ran successfully!" : "Run failed"}
            </div>
            {result.message && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Message sent:</p>
                <p className="text-sm italic bg-background rounded p-2 border">"{result.message}"</p>
              </div>
            )}
            {result.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
            <Button className="w-full mt-4" variant="outline" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Contact Name</label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Business Name</label>
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Phone (for SMS)</label>
                <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 619..." />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Email</label>
                <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Business Type</label>
                <Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="hvac, dental..." />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Message Step</label>
                <Select value={step} onValueChange={setStep}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(s => <SelectItem key={s} value={String(s)}>Step {s + 1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Claude will personalise the message using the template and contact info above.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleRun} disabled={running || !contactName || !businessName}>
                {running ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Running...</> : <><Rocket className="size-3.5 mr-1.5" />Run Agent</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Execution Log Row ─────────────────────────────────────────────────────
function ExecutionRow({ exec }: { exec: Execution }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[exec.status] ?? STATUS_CONFIG.pending

  return (
    <>
      <tr
        className="hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        <td className="px-4 py-3">
          <div className={`flex items-center gap-1.5 ${cfg.color}`}>
            {cfg.icon}<span className="capitalize text-sm">{exec.status}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">{exec.contact_name ?? "—"}</td>
        <td className="px-4 py-3">
          {exec.channel && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[exec.channel] ?? "bg-gray-100 text-gray-700"}`}>
              {exec.channel}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{exec.trigger}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {new Date(exec.started_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            {exec.message_sent && (
              <div className="mb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Message sent:</p>
                <p className="text-sm bg-background rounded-lg p-3 border italic">"{exec.message_sent}"</p>
              </div>
            )}
            {exec.error_message && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                Error: {exec.error_message}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [runAgent, setRunAgent] = useState<Agent | null>(null)
  const [configAgent, setConfigAgent] = useState<Agent | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, a, i] = await Promise.all([
        apiFetch(`/api/v1/admin/customers/${id}`),
        apiFetch(`/api/v1/admin/customers/${id}/agents`),
        apiFetch(`/api/v1/admin/customers/${id}/integrations`),
      ])
      setCustomer(c); setAgents(a); setIntegrations(i)
      // Load executions for all agents
      if (a.length > 0) {
        const execs = await apiFetch(`/api/v1/executions?customer_id=${id}&limit=30`)
        setExecutions(execs)
      }
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleStatus(agent: Agent) {
    const next = agent.status === "active" ? "paused" : "active"
    try {
      const updated = await apiFetch(`/api/v1/admin/agents/${agent.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: next }),
      })
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
    } catch { /* noop */ }
  }

  async function deleteAgent(agentId: number) {
    if (!confirm("Delete this agent? Cannot be undone.")) return
    try {
      await fetch(`${API_BASE}/api/v1/admin/agents/${agentId}`, { method: "DELETE", headers: authHeaders() })
      setAgents(prev => prev.filter(a => a.id !== agentId))
    } catch { /* noop */ }
  }

  const activeAgents = agents.filter(a => a.status === "active").length

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="-ml-1">
          <ArrowLeft className="size-3.5 mr-1.5" />Back to Admin
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        ) : !customer ? (
          <div className="text-center py-20"><p className="text-muted-foreground">Client not found.</p></div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="size-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{customer.company_name}</h1>
                  <p className="text-muted-foreground">{customer.contact_name}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCcw className="size-3.5 mr-1.5" />Refresh
              </Button>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Email", icon: <Mail className="size-4 text-muted-foreground" />, value: customer.email },
                { label: "Phone", icon: <Phone className="size-4 text-muted-foreground" />, value: customer.phone ?? "—" },
                { label: "Status", icon: null, value: <Badge variant={customer.is_active ? "default" : "secondary"}>{customer.is_active ? "Active" : "Inactive"}</Badge> },
                { label: "Active Agents", icon: <CheckCircle2 className="size-4 text-green-500" />, value: <span className="text-2xl font-bold">{activeAgents}<span className="text-muted-foreground text-sm font-normal"> / {agents.length}</span></span> },
              ].map(({ label, icon, value }) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription>{label}</CardDescription>
                      {icon}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">{value}</CardContent>
                </Card>
              ))}
            </div>

            {/* Agents */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Bot className="size-5" />Deployed Agents <Badge variant="secondary">{agents.length}</Badge>
              </h2>
              {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border rounded-xl">
                  <Bot className="size-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No agents deployed yet</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Agent", "Channel", "Type", "Status", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agents.map(a => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{a.name}</div>
                            {a.description && <div className="text-xs text-muted-foreground line-clamp-1">{a.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {a.channel ? (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[a.channel] ?? ""}`}>{a.channel}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{CATEGORY_LABELS[a.agent_type] ?? a.agent_type}</td>
                          <td className="px-4 py-3">
                            <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">{a.status}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs"
                                onClick={() => setRunAgent(a)}>
                                <Rocket className="size-3 mr-1" />Run
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7" title="Configure"
                                onClick={() => setConfigAgent(a)}>
                                <Settings2 className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7"
                                onClick={() => toggleStatus(a)} title={a.status === "active" ? "Pause" : "Activate"}>
                                {a.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7 text-destructive"
                                onClick={() => deleteAgent(a.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Execution Log */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <TerminalSquare className="size-5" />Execution Log <Badge variant="secondary">{executions.length}</Badge>
              </h2>
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border rounded-xl">
                  <TerminalSquare className="size-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No runs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "Run" on an agent above to test it.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Status", "Contact", "Channel", "Trigger", "Time", ""].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {executions.map(exec => <ExecutionRow key={exec.id} exec={exec} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Integrations */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Link2 className="size-5" />Integrations <Badge variant="secondary">{integrations.length}</Badge>
              </h2>
              {integrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border rounded-xl">
                  <Zap className="size-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No integrations connected</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {integrations.map(i => (
                    <Card key={i.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{PROVIDER_LABELS[i.provider] ?? i.provider}</CardTitle>
                          <Badge variant={i.is_active ? "default" : "secondary"} className="text-[10px]">
                            {i.is_active ? "Connected" : "Disconnected"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">Connected {new Date(i.created_at).toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Run Agent Modal */}
      {runAgent && customer && (
        <RunAgentDialog
          agent={runAgent}
          customer={customer}
          onClose={() => setRunAgent(null)}
          onRan={() => { setRunAgent(null); load() }}
        />
      )}

      {/* Config Editor Modal */}
      {configAgent && (
        <ConfigEditorDialog
          agent={configAgent}
          onClose={() => setConfigAgent(null)}
          onSaved={updated => {
            setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
            setConfigAgent(null)
          }}
        />
      )}
    </BaseLayout>
  )
}
