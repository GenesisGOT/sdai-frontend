"use client"

import { CopilotKit } from "@copilotkit/react-core"
import { useAuth } from "@/context/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface CopilotProviderProps {
  children: React.ReactNode
}

/**
 * Wraps the app with CopilotKit, forwarding the user's JWT so the
 * /copilotkit backend endpoint can authenticate the request.
 * Must live inside <AuthProvider>.
 */
export function CopilotProvider({ children }: CopilotProviderProps) {
  const { token } = useAuth()

  return (
    <CopilotKit
      runtimeUrl={`${API_BASE}/copilotkit`}
      headers={token ? { Authorization: `Bearer ${token}` } : {}}
    >
      {children}
    </CopilotKit>
  )
}
