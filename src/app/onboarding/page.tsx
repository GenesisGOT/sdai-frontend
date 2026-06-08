"use client"

import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CheckCircle2, Loader2, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAuth } from "@/context/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const MARKETING_URL = "https://sandiegoaisolutions.com"

const schema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().min(1, "Your name is required"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormValues = z.infer<typeof schema>

interface Preview {
  valid: boolean
  email?: string
  company_name?: string | null
  contact_name?: string | null
  expires_at?: string
}

type Phase = "loading" | "invalid" | "form" | "done"

export default function OnboardingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  // Accept both the new (?token=) and any legacy (?invite=) magic-link params.
  const token = params.get("token") || params.get("invite") || ""

  const [phase, setPhase] = useState<Phase>("loading")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "", contact_name: "", phone: "", password: "" },
  })

  // Managed / done-for-you model: onboarding is invite-only. No token → send
  // visitors to the marketing site to request access. Otherwise validate it.
  useEffect(() => {
    if (!token) {
      window.location.replace(MARKETING_URL)
      return
    }
    let cancelled = false
    fetch(`${API_BASE}/api/v1/invitations/accept?token=${encodeURIComponent(token)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: Preview) => {
        if (cancelled) return
        if (!p.valid) { setPhase("invalid"); return }
        setEmail(p.email ?? "")
        form.reset({
          company_name: p.company_name ?? "",
          contact_name: p.contact_name ?? "",
          phone: "",
          password: "",
        })
        setPhase("form")
      })
      .catch(() => { if (!cancelled) setPhase("invalid") })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function onSubmit(data: FormValues) {
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/api/v1/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          company_name: data.company_name,
          contact_name: data.contact_name,
          phone: data.phone || null,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.detail ?? "Could not finish setting up your account.")
      }
      // Account is now active with the password they just chose — log them in
      // (populates auth context + token) and drop them into their dashboard.
      setPhase("done")
      try {
        await login(email, data.password)
        navigate("/dashboard", { replace: true })
      } catch {
        // Account is set up but auto-login failed — send them to sign in.
        navigate("/auth/sign-in", { replace: true })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Checking your invitation…
        </div>
      </div>
    )
  }

  // ── Invalid / expired invite ─────────────────────────────────────────────────
  if (phase === "invalid") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <ShieldX className="size-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">This invitation isn't valid</h1>
          <p className="text-muted-foreground mb-6">
            It may have expired or already been used. Reach out to your SD AI account
            manager for a fresh invite.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="outline">
              <a href={MARKETING_URL}>Visit our site</a>
            </Button>
            <Button asChild>
              <a href="/auth/sign-in">Sign in</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Done (brief, before redirect) ────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <CheckCircle2 className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Taking you to your dashboard…
          </p>
        </div>
      </div>
    )
  }

  // ── Set-password form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg font-bold">
              SD
            </div>
            <span className="text-xl font-semibold">SD AI Solutions</span>
          </div>
          <h1 className="text-2xl font-bold">Finish setting up your account</h1>
          <p className="text-muted-foreground mt-1">
            Your AI agents are already staged. Choose a password to access your dashboard.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome aboard</CardTitle>
            <CardDescription>
              Signing in as <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="company_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl><Input placeholder="Pacific HVAC" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contact_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="+16195551234" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Create Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Setting up…" : "Access My Dashboard"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          🤝 Managed AI agents for local businesses
        </div>
      </div>
    </div>
  )
}
