import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Bot, CheckCircle2, Clock, FileText,
  Play, Pause, Trash2, Zap, Phone, Mail, Building2,
  Rocket, RefreshCcw, Link2,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface Customer {
  id: number; email: string; company_name: string; contact_name: string
  phone: string | null; is_active: boolean; created_at?: string
}
interface Agent {
  id: number; customer_id: number; name: string; agent_type: string
  status: string; description: string | null; channel: string | null
  trigger_type: string | null; deployed_by: string | null; created_at: string
}
interface Integration {
  id: number; provider: string; is_active: boolean; created_at: string; updated_at: string
}

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
const PROVIDER_LABELS: Record<string, string> = {
  zapier: "Zapier", twilio: "Twilio", sendgrid: "SendGrid", salesforce: "Salesforce",
  hubspot: "HubSpot", stripe: "Stripe", google_calendar: "Google Calendar",
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

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

        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="-ml-1">
          <ArrowLeft className="size-3.5 mr-1.5" />Back to Admin
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        ) : !customer ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Client not found.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="size-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{customer.company_name}</h1>
                    <p className="text-muted-foreground">{customer.contact_name}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCcw className="size-3.5 mr-1.5" />Refresh
                </Button>
                <Button size="sm" onClick={() => navigate("/admin")}>
                  <Rocket className="size-3.5 mr-1.5" />Deploy Agent
                </Button>
              </div>
            </div>

            {/* Info + Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardDescription>Email</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Phone</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{customer.phone ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Status</CardDescription></CardHeader>
                <CardContent>
                  <Badge variant={customer.is_active ? "default" : "secondary"}>
                    {customer.is_active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription>Active Agents</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500" />
                    <span className="text-2xl font-bold">{activeAgents}</span>
                    <span className="text-muted-foreground text-sm">/ {agents.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agents */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Bot className="size-5" />Deployed Agents
                <Badge variant="secondary">{agents.length}</Badge>
              </h2>
              {agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border rounded-xl">
                  <Bot className="size-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No agents deployed yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Go back to Admin and deploy an agent from a template.</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Agent Name", "Channel", "Type", "Status", "Deployed By", "Actions"].map(h => (
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
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[a.channel] ?? "bg-gray-100 text-gray-700"}`}>
                                {a.channel}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{CATEGORY_LABELS[a.agent_type] ?? a.agent_type}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICONS[a.status]}
                              <span className="capitalize">{a.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.deployed_by ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="size-8"
                                title={a.status === "active" ? "Pause" : "Activate"}
                                onClick={() => toggleStatus(a)}>
                                {a.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive"
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

            {/* Integrations */}
            <div>
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Link2 className="size-5" />Integrations
                <Badge variant="secondary">{integrations.length}</Badge>
              </h2>
              {integrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border rounded-xl">
                  <Zap className="size-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No integrations connected</p>
                  <p className="text-sm text-muted-foreground mt-1">Client hasn't connected any tools yet.</p>
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
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(i.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  )
}
