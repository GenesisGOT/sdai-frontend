import { useEffect, useState, useCallback } from "react"
import {
  Mail, Plus, RefreshCcw, Copy, Check, Clock,
  UserPlus, Trash2, CheckCircle2, XCircle, Loader2,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

interface Invitation {
  id: number; email: string; company_name: string | null; contact_name: string | null
  token: string; invite_url: string; is_used: boolean; expires_at: string; created_at: string
  accepted_customer_id: number | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy}>
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

function InviteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: Invitation) => void }) {
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Invitation | null>(null)

  async function create() {
    if (!email) return
    setCreating(true)
    try {
      const inv = await apiFetch("/api/v1/invitations", {
        method: "POST",
        body: JSON.stringify({ email, company_name: companyName || null, contact_name: contactName || null, send_email: sendEmail }),
      })
      setCreated(inv); onCreated(inv)
    } catch { /* noop */ } finally { setCreating(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="size-4" />Invite New Client</DialogTitle></DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300 mb-3">
                <CheckCircle2 className="size-4" />Invitation created!
              </div>
              {sendEmail && <p className="text-sm text-muted-foreground mb-3">Email sent to {created.email}.</p>}
              <div className="bg-background rounded-lg border p-3 flex items-center gap-2">
                <p className="text-xs font-mono text-muted-foreground flex-1 truncate">{created.invite_url}</p>
                <CopyButton text={created.invite_url} />
              </div>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div><label className="text-xs font-medium mb-1 block">Email *</label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="client@company.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium mb-1 block">Company Name</label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ACME HVAC" /></div>
              <div><label className="text-xs font-medium mb-1 block">Contact Name</label><Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="John Smith" /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="size-4" />
              <span className="text-sm">Send invitation email automatically</span>
            </label>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              The client will receive a magic link to create their account. Link expires in 48 hours.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={create} disabled={creating || !email}>
                {creating ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Mail className="size-3.5 mr-1.5" />}
                Send Invite
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvitations(await apiFetch("/api/v1/invitations")) }
    catch { /* noop */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function revoke(id: number) {
    if (!confirm("Revoke this invitation? The link will stop working.")) return
    try {
      await fetch(`${API_BASE}/api/v1/invitations/${id}`, { method: "DELETE", headers: authHeaders() })
      setInvitations(p => p.filter(i => i.id !== id))
    } catch { /* noop */ }
  }

  const pending = invitations.filter(i => !i.is_used && new Date(i.expires_at) > new Date())
  const used = invitations.filter(i => i.is_used)
  const expired = invitations.filter(i => !i.is_used && new Date(i.expires_at) <= new Date())

  return (
    <BaseLayout title="Client Invitations" description="Send magic links to onboard new clients">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Pending", value: pending.length, icon: <Clock className="size-4 text-yellow-500" /> },
            { label: "Accepted", value: used.length, icon: <CheckCircle2 className="size-4 text-green-500" /> },
            { label: "Expired", value: expired.length, icon: <XCircle className="size-4 text-muted-foreground" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{label}</CardDescription>{icon}
              </CardHeader>
              <CardContent>{loading ? <Skeleton className="h-8 w-8" /> : <div className="text-2xl font-bold">{value}</div>}</CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="size-3.5 mr-1.5" />Refresh</Button>
            <Button size="sm" onClick={() => setShowInvite(true)}><Plus className="size-3.5 mr-1.5" />Invite Client</Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-xl">
            <UserPlus className="size-10 text-muted-foreground mb-3" />
            <p className="font-medium">No invitations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Send your first invite to onboard a new client.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowInvite(true)}><Plus className="size-3.5 mr-1.5" />Invite Client</Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Email", "Company", "Status", "Invite Link", "Expires", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {invitations.map(inv => {
                  const isExpired = !inv.is_used && new Date(inv.expires_at) <= new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{inv.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.company_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {inv.is_used
                          ? <Badge variant="default" className="text-[10px]"><CheckCircle2 className="size-2.5 mr-1" />Accepted</Badge>
                          : isExpired
                          ? <Badge variant="secondary" className="text-[10px]">Expired</Badge>
                          : <Badge variant="outline" className="text-[10px]"><Clock className="size-2.5 mr-1" />Pending</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {!inv.is_used && !isExpired && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-40">{inv.invite_url}</span>
                            <CopyButton text={inv.invite_url} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {!inv.is_used && (
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => revoke(inv.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteDialog
          onClose={() => setShowInvite(false)}
          onCreated={inv => { setInvitations(p => [inv, ...p]) }}
        />
      )}
    </BaseLayout>
  )
}
