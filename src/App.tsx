import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { AuthProvider } from '@/context/AuthContext'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <SidebarConfigProvider>
            <Router basename={basename}>
              <AppRouter />
            </Router>
          </SidebarConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
