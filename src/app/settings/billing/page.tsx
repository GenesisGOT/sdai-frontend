import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  CreditCard, CheckCircle2, AlertCircle, ExternalLink,
  Zap, TrendingUp, Infinity, Loader2,
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

interface BillingStatus {
  plan: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  is_active: boolean
  trial_ends_at: string | null
}

const PLANS = [
  {
    id: "starter",
    name: "Pilot",
    price: 99,
    icon: <Zap className="size-5 text-blue-500" />,
    description: "Perfect for getting started",
    features: ["2 active agents", "500 messages / mo", "SMS + Email", "Execution logs", "Email support"],
    color: "border-blue-200 dark:border-blue-800",
    badge: "",
  },
  {
    id: "growth",
    name: "Growth",
    price: 299,
    icon: <TrendingUp className="size-5 text-purple-500" />,
    description: "Scale your outreach",
    features: ["10 active agents", "2,000 messages / mo", "SMS + Email + Voice", "Priority support", "Analytics dashboard"],
    color: "border-purple-200 dark:border-purple-800",
    badge: "Most Popular",
  },
  {
    id: "pro",
    name: "Enterprise",
    price: 599,
    icon: <Infinity className="size-5 text-green-500" />,
    description: "No limits",
    features: ["Unlimited agents", "Unlimited messages", "All channels", "Dedicated support", "Custom integrations"],
    color: "border-green-200 dark:border-green-800",
    badge: "",
  },
]

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "destructive" },
  unpaid: { label: "Unpaid", variant: "destructive" },
}

export default function BillingSettings() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const success = searchParams.get("success")
  const canceled = searchParams.get("canceled")

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/billing/status`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStatus(d) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubscribe(planId: string) {
    setCheckoutLoading(planId)
    setError(null)
    try {
      const r = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ plan: planId }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && data.url) {
        window.location.href = data.url
        return
      }
      if (r.status === 401) {
        setError("Your session expired. Please log out and back in, then try again.")
      } else {
        setError(data.detail || `Checkout failed (HTTP ${r.status}). Please contact support.`)
      }
    } catch {
      setError("Couldn't reach the billing service. Check your connection and try again.")
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/v1/billing/portal`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      })
      const data = await r.json()
      if (data.url) window.location.href = data.url
    } catch { /* noop */ }
    finally { setPortalLoading(false) }
  }

  const currentPlan = PLANS.find(p => p.id === status?.plan)
  const subStatus = STATUS_CONFIG[status?.subscription_status ?? ""] ?? null

  return (
    <BaseLayout title="Plans & Billing" description="Manage your subscription">
      <div className="px-4 lg:px-6 space-y-6">

        {/* Success / canceled banners */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 px-4 py-3">
            <CheckCircle2 className="size-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Subscription activated! Your agents are now live.
            </p>
          </div>
        )}
        {canceled && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 px-4 py-3">
            <AlertCircle className="size-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">Checkout canceled. You haven't been charged.</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3">
            <AlertCircle className="size-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Current plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></div>
            ) : status?.plan ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  {currentPlan?.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg capitalize">{status.plan}</span>
                      {subStatus && <Badge variant={subStatus.variant}>{subStatus.label}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">${currentPlan?.price}/mo</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <ExternalLink className="size-4 mr-1.5" />}
                  Manage Billing
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">No active subscription</p>
                  <p className="text-sm text-muted-foreground">Choose a plan below to activate your agents.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans grid */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Available Plans</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrent = status?.plan === plan.id
              const isLoading = checkoutLoading === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${plan.color} ${isCurrent ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="px-3">{plan.badge}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      {plan.icon}
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-4">
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || isLoading}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {isLoading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                      {isCurrent ? "Current Plan" : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              ["Can I change plans?", "Yes — upgrade or downgrade anytime through the Manage Billing portal. Changes take effect immediately."],
              ["What payment methods are accepted?", "All major credit cards via Stripe. No setup fees."],
              ["What happens if I go over my message limit?", "We'll notify you. Agents pause until you upgrade or the next billing cycle."],
              ["Can I cancel anytime?", "Yes. Cancel through the Manage Billing portal. Your plan stays active until the end of the billing period."],
            ].map(([q, a]) => (
              <div key={q}>
                <p className="font-medium text-foreground">{q}</p>
                <p className="mt-0.5">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
