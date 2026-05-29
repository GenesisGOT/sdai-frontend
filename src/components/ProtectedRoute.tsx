import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    )
  }

  if (!token) return <Navigate to="/auth/sign-in" replace />
  return <>{children}</>
}
