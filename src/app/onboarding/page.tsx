import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

const schema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().min(1, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
  industry: z.string().min(1, "Select your industry"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormValues = z.infer<typeof schema>

const industries = [
  "HVAC", "Plumbing", "Electrical", "Landscaping", "Roofing",
  "Cleaning Services", "Auto Repair", "Real Estate", "Dental/Medical",
  "Restaurant / Food Service", "Fitness / Gym", "Salon / Spa", "Other",
]

export default function OnboardingPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "", contact_name: "", email: "", phone: "", industry: "", password: "" },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    try {
      const resp = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          company_name: data.company_name,
          contact_name: data.contact_name,
          phone: data.phone,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.detail ?? "Something went wrong")
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed")
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <CheckCircle2 className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground mb-6">
            Welcome to SD AI Solutions. Our team will reach out within 24 hours to get your AI agents set up.
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? Email us at <a href="mailto:sandiegoaisolutions@gmail.com" className="underline">sandiegoaisolutions@gmail.com</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg font-bold">
              SD
            </div>
            <span className="text-xl font-semibold">SD AI Solutions</span>
          </div>
          <h1 className="text-2xl font-bold">Get Started with AI Agents</h1>
          <p className="text-muted-foreground mt-1">
            Automate your follow-ups, win-backs, and customer outreach with AI.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Takes 2 minutes. We'll handle the rest.</CardDescription>
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

                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl><Input type="email" placeholder="you@yourbusiness.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
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
                  {form.formState.isSubmitting ? "Creating your account..." : "Get Started — It's Free"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/auth/sign-in" className="underline underline-offset-4">Sign in</a>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Social proof */}
        <div className="text-center text-sm text-muted-foreground">
          🤝 Trusted by local businesses in San Diego
        </div>
      </div>
    </div>
  )
}
