import { BrowserRouter as Router } from 'react-router-dom'
import { Component, type ReactNode } from 'react'
import { CopilotKit } from '@copilotkit/react-core'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { AuthProvider } from '@/context/AuthContext'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div className="max-w-lg space-y-3">
            <p className="font-semibold text-red-600">App Error</p>
            <pre className="rounded bg-muted p-4 text-left text-xs whitespace-pre-wrap break-all">{this.state.error}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const basename = import.meta.env.VITE_BASENAME || ''
const API_BASE = import.meta.env.VITE_API_URL ?? ''

function App() {
  return (
    <ErrorBoundary>
      <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <AuthProvider>
            <CopilotKit runtimeUrl={`${API_BASE}/copilotkit`}>
              <SidebarConfigProvider>
                <Router basename={basename}>
                  <AppRouter />
                </Router>
              </SidebarConfigProvider>
            </CopilotKit>
          </AuthProvider>
        </ThemeProvider>
      </div>
    </ErrorBoundary>
  )
}

export default App
