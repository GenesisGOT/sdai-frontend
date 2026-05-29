import { useEffect, useState, useCallback, useRef } from "react"
import {
  Users, Search, Plus, Upload, RefreshCcw, Phone, Mail,
  Trash2, Tag, ChevronDown, ChevronUp, Rocket, Loader2, ListChecks, CheckCircle2,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
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

interface Contact {
  id: number; customer_id: number; name: string; phone: string | null
  email: string | null; business_type: string | null; tags: string[] | null
  notes: string | null; last_service_date: string | null; source: string | null
  is_active: boolean; created_at: string
}
interface Customer { id: number; company_name: string; email: string }
interface Agent { id: number; name: string; channel: string | null; agent_type: string }
interface Stats { total: number; active: number; with_phone: number; with_email: number }

// ── Add Contact Dialog ────────────────────────────────────────────────────
function AddContactDialog({ customers, onClose, onAdded }: {
  customers: Customer[]; onClose: () => void; onAdded: () => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ? String(customers[0].id) : "")
  const [name, setName] = useState(""); const [phone, setPhone] = useState("")
  const [email, setEmail] = useState(""); const [businessType, setBusinessType] = useState("")
  const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false)

  async function save() {
    if (!name || !customerId) return
    setSaving(true)
    try {
      await apiFetch(`/api/v1/contacts?customer_id=${customerId}`, {
        method: "POST",
        body: JSON.stringify({ name, phone: phone || null, email: email || null, business_type: businessType || null, notes: notes || null }),
      })
      onAdded(); onClose()
    } catch { /* noop */ } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle><Plus className="size-4 inline mr-2" />Add Contact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Client Account</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-medium mb-1 block">Full Name *</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium mb-1 block">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 619..." /></div>
            <div><label className="text-xs font-medium mb-1 block">Email</label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
          </div>
          <div><label className="text-xs font-medium mb-1 block">Business Type</label><Input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="hvac, dental..." /></div>
          <div><label className="text-xs font-medium mb-1 block">Notes</label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name || !customerId}>
            {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : null}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── CSV Import Dialog ─────────────────────────────────────────────────────
function ImportDialog({ customers, onClose, onImported }: {
  customers: Customer[]; onClose: () => void; onImported: () => void
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ? String(customers[0].id) : "")
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function doImport() {
    if (!file || !customerId) return
    setImporting(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const token = localStorage.getItem("sdai_token")
      const r = await fetch(`${API_BASE}/api/v1/contacts/import?customer_id=${customerId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await r.json()
      setResult(data); onImported()
    } catch { setResult({ imported: 0, skipped: 0, errors: ["Upload failed"] }) }
    finally { setImporting(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle><Upload className="size-4 inline mr-2" />Import Contacts from CSV</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium"><span>✓ {result.imported} contacts imported</span></div>
              {result.skipped > 0 && <div className="text-sm text-muted-foreground">{result.skipped} skipped</div>}
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-0.5">{result.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Client Account</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/30" onClick={() => fileRef.current?.click()}>
              <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{file ? file.name : "Click to select CSV file"}</p>
              <p className="text-xs text-muted-foreground mt-1">Columns: name, phone, email, tags, notes, last_service_date</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={doImport} disabled={importing || !file || !customerId}>
                {importing ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}Import
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Run Agent Dialog ──────────────────────────────────────────────────────
function RunAgentForContactDialog({ contact, agents, customers, onClose }: {
  contact: Contact; agents: Agent[]; customers: Customer[]; onClose: () => void
}) {
  const customer = customers.find(c => c.id === contact.customer_id)
  const clientAgents = agents.filter(a => a.customer_id === contact.customer_id)
  const [agentId, setAgentId] = useState(clientAgents[0]?.id ? String(clientAgents[0].id) : "")
  const [businessName, setBusinessName] = useState(customer?.company_name ?? "")
  const [step, setStep] = useState("0")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ status: string; message?: string; error?: string } | null>(null)

  async function run() {
    if (!agentId) return
    setRunning(true)
    try {
      const data = await apiFetch(`/api/v1/contacts/${contact.id}/run-agent`, {
        method: "POST",
        body: JSON.stringify({ agent_id: parseInt(agentId), business_name: businessName, step: parseInt(step) }),
      })
      setResult({ status: data.status, message: data.message_sent, error: data.error })
    } catch { setResult({ status: "error", error: "Request failed" }) }
    finally { setRunning(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle><Rocket className="size-4 inline mr-2 text-primary" />Run Agent for {contact.name}</DialogTitle></DialogHeader>
        {result ? (
          <div className={`rounded-xl p-4 border ${result.status === "success" ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}>
            <p className="font-medium text-sm mb-2">{result.status === "success" ? "✓ Sent!" : "✗ Failed"}</p>
            {result.message && <p className="text-sm italic">"{result.message}"</p>}
            {result.error && <p className="text-sm text-red-600">{result.error}</p>}
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex gap-3 text-muted-foreground text-xs">
                {contact.phone && <span><Phone className="size-3 inline mr-1" />{contact.phone}</span>}
                {contact.email && <span><Mail className="size-3 inline mr-1" />{contact.email}</span>}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Agent</label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                <SelectContent>{clientAgents.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Business Name</label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} /></div>
              <div>
                <label className="text-xs font-medium mb-1 block">Step</label>
                <Select value={step} onValueChange={setStep}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3,4].map(s => <SelectItem key={s} value={String(s)}>Step {s+1}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={run} disabled={running || !agentId}>
                {running ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Rocket className="size-3.5 mr-1.5" />}Run
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Enroll in Sequence Dialog ─────────────────────────────────────────────
function EnrollDialog({ contact, agents, customers, onClose }: {
  contact: Contact; agents: Agent[]; customers: Customer[]; onClose: () => void
}) {
  const clientAgents = (agents as any[]).filter(a => a.customer_id === contact.customer_id)
  const [agentId, setAgentId] = useState(clientAgents[0]?.id ? String(clientAgents[0].id) : "")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function enroll() {
    if (!agentId) return
    setSaving(true)
    try {
      const data = await apiFetch("/api/v1/enrollments", {
        method: "POST",
        body: JSON.stringify({ contact_id: contact.id, agent_id: parseInt(agentId), notes: notes || null, enrolled_by: "admin" }),
      })
      const agent = clientAgents.find(a => a.id === parseInt(agentId))
      setResult({ ok: true, msg: `${contact.name} enrolled in "${agent?.name ?? "agent"}" — ${data.total_steps ?? 1} step sequence scheduled.` })
    } catch (err: any) {
      setResult({ ok: false, msg: err?.message === "400" ? "Already enrolled in this sequence." : "Enrollment failed. Try again." })
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle><ListChecks className="size-4 inline mr-2 text-primary" />Enroll in Sequence</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className={`rounded-xl p-4 border ${result.ok ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}`}>
            <div className="flex items-start gap-2">
              {result.ok ? <CheckCircle2 className="size-4 text-green-600 mt-0.5 shrink-0" /> : null}
              <p className="text-sm">{result.msg}</p>
            </div>
            <Button className="w-full mt-3" variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-3">
              {contact.phone && <span><Phone className="size-3 inline mr-1" />{contact.phone}</span>}
              {contact.email && <span><Mail className="size-3 inline mr-1" />{contact.email}</span>}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Agent Sequence</label>
              {clientAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No active agents for this client account.</p>
              ) : (
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger><SelectValue placeholder="Select sequence..." /></SelectTrigger>
                  <SelectContent>
                    {clientAgents.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} <span className="text-muted-foreground ml-1 text-xs capitalize">({a.channel ?? a.agent_type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. post-service Apr 2026" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={enroll} disabled={saving || !agentId || clientAgents.length === 0}>
                {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <ListChecks className="size-3.5 mr-1.5" />}Enroll
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [runContact, setRunContact] = useState<Contact | null>(null)
  const [enrollContact, setEnrollContact] = useState<Contact | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = clientFilter !== "all" ? `?customer_id=${clientFilter}` : ""
      const [c, cu, a, s] = await Promise.all([
        apiFetch(`/api/v1/contacts${params}&limit=200`),
        apiFetch("/api/v1/admin/customers"),
        apiFetch("/api/v1/admin/agents"),
        apiFetch(`/api/v1/contacts/stats${params}`),
      ])
      setContacts(c); setCustomers(cu); setAgents(a); setStats(s)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [clientFilter])

  useEffect(() => { load() }, [load])

  async function deleteContact(id: number) {
    if (!confirm("Remove this contact?")) return
    try {
      await fetch(`${API_BASE}/api/v1/contacts/${id}`, { method: "DELETE", headers: authHeaders() })
      setContacts(p => p.filter(c => c.id !== id))
    } catch { /* noop */ }
  }

  const filtered = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <BaseLayout title="Contacts" description="Manage client contact lists — who your agents message">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: stats?.total, icon: <Users className="size-4" /> },
            { label: "Active", value: stats?.active, icon: <Users className="size-4 text-green-500" /> },
            { label: "With Phone", value: stats?.with_phone, icon: <Phone className="size-4 text-blue-500" /> },
            { label: "With Email", value: stats?.with_email, icon: <Mail className="size-4 text-purple-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>{icon}
              </CardHeader>
              <CardContent>{loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{value ?? 0}</div>}</CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="size-3.5 mr-1.5" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5 mr-1.5" />Import CSV</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="size-3.5 mr-1.5" />Add Contact</Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} contact{filtered.length !== 1 ? "s" : ""}</p>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
            <Users className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add contacts manually or import from a CSV file.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="size-3.5 mr-1.5" />Import CSV</Button>
              <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="size-3.5 mr-1.5" />Add Contact</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Name", "Client", "Phone", "Email", "Tags", "Source", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(c => {
                  const client = customers.find(cu => cu.id === c.customer_id)
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{client?.company_name ?? `#${c.customer_id}`}</td>
                      <td className="px-4 py-3 text-xs font-mono">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-32">{c.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {c.tags?.slice(0, 2).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.source && <Badge variant="secondary" className="text-[10px] capitalize">{c.source}</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEnrollContact(c)}>
                            <ListChecks className="size-3 mr-1" />Enroll
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setRunContact(c)}>
                            <Rocket className="size-3 mr-1" />Run
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => deleteContact(c.id)}>
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
      </div>

      {showAdd && <AddContactDialog customers={customers} onClose={() => setShowAdd(false)} onAdded={load} />}
      {showImport && <ImportDialog customers={customers} onClose={() => setShowImport(false)} onImported={load} />}
      {runContact && <RunAgentForContactDialog contact={runContact} agents={agents} customers={customers} onClose={() => setRunContact(null)} />}
      {enrollContact && <EnrollDialog contact={enrollContact} agents={agents} customers={customers} onClose={() => setEnrollContact(null)} />}
    </BaseLayout>
  )
}
