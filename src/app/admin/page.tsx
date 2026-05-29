import { useEffect, useState } from "react"
import { Plus, RefreshCcw, Users, Bot, Activity } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface Customer {
  id: number
  email: string
  company_name: string
  contact_name: string
  phone: string | null
  is_active: boolean
}

export default function AdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    const token = localStorage.getItem("sdai_token")
    if (!token) return
    setLoading(true)
    fetch(`${API_BASE}/api/v1/admin/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <BaseLayout title="Admin Panel" description="Manage clients and agents — Ulises only">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Clients</CardDescription>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Active Clients</CardDescription>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.filter(c => c.is_active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Inactive</CardDescription>
              <Bot className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.filter(c => !c.is_active).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Client table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">All Clients</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCcw className="size-3.5 mr-1.5" />
                Refresh
              </Button>
              <Button size="sm" asChild>
                <a href="/auth/sign-up" target="_blank">
                  <Plus className="size-3.5 mr-1.5" />
                  Add Client
                </a>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl">
              <Users className="size-10 text-muted-foreground mb-3" />
              <p className="font-medium">No clients yet</p>
              <p className="text-sm text-muted-foreground mt-1">Send the onboarding link to your first lead.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Company", "Contact", "Email", "Phone", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.company_name}</td>
                      <td className="px-4 py-3">{c.contact_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.is_active ? "default" : "secondary"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  )
}
