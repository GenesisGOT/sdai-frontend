import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, RefreshCcw, Users, Bot, Activity, LayoutTemplate,
  Search, ChevronRight, Play, Pause, Trash2, Settings2,
  Rocket, X, CheckCircle2, Clock, FileText, Zap, BarChart3,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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

// ---------- Types ----------
interface Customer { id: number; email: string; company_name: string; contact_name: string; phone: string | null; is_active: boolean }
interface AgentTemplate { id: number; name: string; slug: string; category: string; description: string; channel: string; trigger_type: string; industry_tags: string[] | null; is_active: boolean; sort_order: number }
interface Agent { id: number; customer_id: number; name: string; agent_type: string; status: string; description: string | null; channel: string | null; trigger_type: string | null; template_id: number | null; deployed_by: string | null; created_at: string }
interface Stats { customers: number; agents: { total: number; active: number; paused: number; draft: number }; templates: { total: number; active: number } }

// ---------- Channel / category helpers ----------
const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  both: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  voice: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  webchat: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
}
const CATEGORY_LABELS: Record<string, string> = {
  follow_up: "Follow-Up", win_back: "Win-Back", appointment: "Appointment",
  review: "Review", lead_gen: "Lead Gen", sales_upsell: "Sales & Upsell",
  support: "Support", onboarding: "Onboarding", industry: "Industry",
}
const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="size-3.5 text-green-500" />,
  paused: <Clock className="size-3.5 text-yellow-500" />,
  draft: <FileText className="size-3.5 text-muted-foreground" />,
}

// ============================================================
// Deploy Agent Dialog
// ============================================================
function DeployAgentDialog({
  open, onClose, templates, customers, onDeployed,
}: {
  open: boolean
  onClose: () => void
  templates: AgentTemplate[]
  customers: Customer[]
  onDeployed: () => void
}) {
  const [step, setStep] = useState<"pick-template" | "configure">("pick-template")
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [customerId, setCustomerId] = useState<string>("")
  const [agentName, setAgentName] = useState<string>("")
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState("")

  const filtered = templates.filter(t => {
    const matchCat = catFilter === "all" || t.category === catFilter
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function reset() {
    setStep("pick-template"); setSelectedTemplate(null); setCustomerId(""); setAgentName(""); setSearch(""); setCatFilter("all"); setError("")
  }

  function handleClose() { reset(); onClose() }

  function handleSelectTemplate(t: AgentTemplate) {
    setSelectedTemplate(t)
    setAgentName(t.name)
    setStep("configure")
  }

  async function handleDeploy() {
    if (!customerId || !agentName || !selectedTemplate) return
    setDeploying(true); setError("")
    try {
      await apiFetch("/api/v1/admin/deploy-agent", {
        method: "POST",
        body: JSON.stringify({ customer_id: parseInt(customerId), template_id: selectedTemplate.id, name: agentName }),
      })
      onDeployed()
      handleClose()
    } catch {
      setError("Deploy failed. Check API and try again.")
    } finally {
      setDeploying(false)
    }
  }

  const categories = [...new Set(templates.map(t => t.category))]

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-5 text-primary" />
            {step === "pick-template" ? "Pick an Agent Template" : `Configure: ${selectedTemplate?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === "pick-template" && (
          <div className="flex flex-col gap-3 overflow-hidden flex-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Search templates..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-y-auto flex-1 grid sm:grid-cols-2 gap-2 pr-1">
              {filtered.length === 0 && <p className="col-span-2 text-center py-10 text-muted-foreground">No templates match</p>}
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className="text-left rounded-xl border p-3 hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm group-hover:text-primary">{t.name}</span>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.description}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[t.channel] ?? "bg-gray-100 text-gray-700"}`}>{t.channel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "configure" && selectedTemplate && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="rounded-xl border p-4 bg-muted/30">
              <p className="text-sm font-medium">{selectedTemplate.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedTemplate.description}</p>
              <div className="flex gap-1.5 mt-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{CATEGORY_LABELS[selectedTemplate.category]}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[selectedTemplate.channel] ?? "bg-gray-100 text-gray-700"}`}>{selectedTemplate.channel}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Client</label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.company_name} ({c.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Agent Name</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Give this agent a name..." />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("pick-template")} className="flex-1">← Back</Button>
              <Button onClick={handleDeploy} disabled={deploying || !customerId || !agentName} className="flex-1">
                {deploying ? "Deploying..." : "Deploy Agent"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main Admin Page
// ============================================================
export default function AdminPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [deployOpen, setDeployOpen] = useState(false)

  // Filters
  const [clientSearch, setClientSearch] = useState("")
  const [agentSearch, setAgentSearch] = useState("")
  const [agentStatusFilter, setAgentStatusFilter] = useState("all")
  const [templateSearch, setTemplateSearch] = useState("")
  const [templateCat, setTemplateCat] = useState("all")
  const [templateChannel, setTemplateChannel] = useState("all")

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, a, t] = await Promise.all([
        apiFetch("/api/v1/admin/stats"),
        apiFetch("/api/v1/admin/customers"),
        apiFetch("/api/v1/admin/agents"),
        apiFetch("/api/v1/admin/templates?limit=500"),
      ])
      setStats(s); setCustomers(c); setAgents(a); setTemplates(t)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function toggleAgentStatus(agent: Agent) {
    const next = agent.status === "active" ? "paused" : agent.status === "paused" ? "active" : "active"
    try {
      const updated = await apiFetch(`/api/v1/admin/agents/${agent.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      })
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
    } catch { /* noop */ }
  }

  async function deleteAgent(id: number) {
    if (!confirm("Delete this agent? This cannot be undone.")) return
    try {
      await fetch(`${API_BASE}/api/v1/admin/agents/${id}`, { method: "DELETE", headers: authHeaders() })
      setAgents(prev => prev.filter(a => a.id !== id))
    } catch { /* noop */ }
  }

  // Filtered lists
  const filteredClients = customers.filter(c =>
    !clientSearch || c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )
  const filteredAgents = agents.filter(a => {
    const matchStatus = agentStatusFilter === "all" || a.status === agentStatusFilter
    const matchSearch = !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase())
    return matchStatus && matchSearch
  })
  const filteredTemplates = templates.filter(t => {
    const matchCat = templateCat === "all" || t.category === templateCat
    const matchCh = templateChannel === "all" || t.channel === templateChannel
    const matchSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.description.toLowerCase().includes(templateSearch.toLowerCase())
    return matchCat && matchCh && matchSearch
  })

  const templateCategories = [...new Set(templates.map(t => t.category))]
  const templateChannels = [...new Set(templates.map(t => t.channel))]

  return (
    <BaseLayout title="Admin Panel" description="Manage clients and AI agents — Ulises only">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Clients", icon: <Users className="size-4" />, value: loading ? null : stats?.customers },
            { label: "Active Agents", icon: <CheckCircle2 className="size-4 text-green-500" />, value: loading ? null : stats?.agents.active },
            { label: "Total Agents", icon: <Bot className="size-4" />, value: loading ? null : stats?.agents.total },
            { label: "Templates", icon: <LayoutTemplate className="size-4 text-primary" />, value: loading ? null : stats?.templates.active },
          ].map(({ label, icon, value }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>
                <span className="text-muted-foreground">{icon}</span>
              </CardHeader>
              <CardContent>
                {value == null ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="clients">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="clients"><Users className="size-3.5 mr-1.5" />Clients</TabsTrigger>
              <TabsTrigger value="agents"><Bot className="size-3.5 mr-1.5" />Agents</TabsTrigger>
              <TabsTrigger value="templates"><LayoutTemplate className="size-3.5 mr-1.5" />Templates</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadAll}>
                <RefreshCcw className="size-3.5 mr-1.5" />Refresh
              </Button>
              <Button size="sm" onClick={() => setDeployOpen(true)}>
                <Rocket className="size-3.5 mr-1.5" />Deploy Agent
              </Button>
            </div>
          </div>

          {/* ── CLIENTS ── */}
          <TabsContent value="clients" className="space-y-4">
            <Input
              placeholder="Search clients..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="max-w-sm"
            />
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
                <Users className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium">No clients found</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Company", "Contact", "Email", "Agents", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredClients.map(c => {
                      const clientAgents = agents.filter(a => a.customer_id === c.id)
                      const activeCount = clientAgents.filter(a => a.status === "active").length
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{c.company_name}</td>
                          <td className="px-4 py-3">{c.contact_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs">
                              <span className="font-medium text-green-600">{activeCount}</span>
                              <span className="text-muted-foreground"> / {clientAgents.length} active</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={c.is_active ? "default" : "secondary"}>
                              {c.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => navigate(`/admin/clients/${c.id}`)}
                            >
                              View <ChevronRight className="size-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── AGENTS ── */}
          <TabsContent value="agents" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search agents..."
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                className="max-w-sm"
              />
              <Select value={agentStatusFilter} onValueChange={setAgentStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
                <Bot className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium">No agents yet</p>
                <p className="text-sm text-muted-foreground mt-1">Deploy your first agent using a template above.</p>
                <Button className="mt-4" size="sm" onClick={() => setDeployOpen(true)}>
                  <Rocket className="size-3.5 mr-1.5" />Deploy Agent
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Agent Name", "Client", "Channel", "Type", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAgents.map(a => {
                      const client = customers.find(c => c.id === a.customer_id)
                      return (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{a.name}</div>
                            {a.description && <div className="text-xs text-muted-foreground line-clamp-1">{a.description}</div>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{client?.company_name ?? `Client #${a.customer_id}`}</td>
                          <td className="px-4 py-3">
                            {a.channel && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[a.channel] ?? "bg-gray-100 text-gray-700"}`}>
                                {a.channel}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{CATEGORY_LABELS[a.agent_type] ?? a.agent_type}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICONS[a.status]}
                              <span className="capitalize">{a.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="icon" className="size-8"
                                title={a.status === "active" ? "Pause" : "Activate"}
                                onClick={() => toggleAgentStatus(a)}
                              >
                                {a.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive"
                                title="Delete agent"
                                onClick={() => deleteAgent(a.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── TEMPLATES ── */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-8"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                />
              </div>
              <Select value={templateCat} onValueChange={setTemplateCat}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {templateCategories.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={templateChannel} onValueChange={setTemplateChannel}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {templateChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category summary chips */}
            {!templateSearch && templateCat === "all" && (
              <div className="flex flex-wrap gap-2">
                {templateCategories.map(cat => {
                  const count = templates.filter(t => t.category === cat).length
                  return (
                    <button
                      key={cat}
                      onClick={() => setTemplateCat(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                      <span className="font-bold">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}</p>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
                <LayoutTemplate className="size-10 text-muted-foreground mb-3" />
                <p className="font-medium">No templates match</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map(t => (
                  <Card key={t.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm leading-snug">{t.name}</CardTitle>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${CHANNEL_COLORS[t.channel] ?? "bg-gray-100 text-gray-700"}`}>
                          {t.channel}
                        </span>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">{t.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t.trigger_type}
                        </span>
                        {t.industry_tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Button
                        size="sm" variant="outline" className="w-full"
                        onClick={() => { setDeployOpen(true) }}
                      >
                        <Rocket className="size-3.5 mr-1.5" />Deploy to Client
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Deploy Dialog */}
      <DeployAgentDialog
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        templates={templates}
        customers={customers}
        onDeployed={loadAll}
      />
    </BaseLayout>
  )
}
