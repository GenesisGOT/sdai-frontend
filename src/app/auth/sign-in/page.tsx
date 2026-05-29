import { LoginForm1 } from "./components/login-form-1"

export default function Page() {
  return (
    <div className="min-h-svh flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm text-center">
          <img src="/sdai-logo-white.png" alt="SDAI Solutions" className="w-72 object-contain" />
          <p className="text-white/60 text-sm leading-relaxed">
            AI-powered automation for local service businesses. SMS sequences, follow-ups, and customer retention — on autopilot.
          </p>
          <div className="flex flex-col gap-3 w-full text-left mt-4">
            {[
              { icon: "🤖", text: "Intelligent multi-step sequences" },
              { icon: "📱", text: "SMS & Email automation" },
              { icon: "📊", text: "Real-time client analytics" },
              { icon: "🔗", text: "Zapier & CRM integrations" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/70 text-sm">
                <span className="text-base">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-sm flex flex-col gap-6">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <img src="/sdai-logo-dark.png" alt="SDAI Solutions" className="h-10 object-contain dark:hidden" />
            <img src="/sdai-logo-white.png" alt="SDAI Solutions" className="h-10 object-contain hidden dark:block" />
          </div>
          <LoginForm1 />
        </div>
      </div>
    </div>
  )
}
