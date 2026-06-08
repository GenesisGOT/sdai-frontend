import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Lazy load components for better performance
const Landing = lazy(() => import('@/app/landing/page'))
const Admin = lazy(() => import('@/app/admin/page'))
const AdminClientDetail = lazy(() => import('@/app/admin/clients/page'))
const AdminReplies = lazy(() => import('@/app/admin/replies/page'))
const AdminContacts = lazy(() => import('@/app/admin/contacts/page'))
const AdminInvitations = lazy(() => import('@/app/admin/invitations/page'))
const AdminAnalytics = lazy(() => import('@/app/admin/analytics/page'))
const AdminTemplates = lazy(() => import('@/app/admin/templates/page'))
const Onboarding = lazy(() => import('@/app/onboarding/page'))
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Analytics = lazy(() => import('@/app/analytics/page'))
const Enrollments = lazy(() => import('@/app/enrollments/page'))
const AgentFlow = lazy(() => import('@/app/agent-flow/page'))
const RepliesInbox = lazy(() => import('@/app/replies-inbox/page'))
const Requests = lazy(() => import('@/app/requests/page'))
const Users = lazy(() => import('@/app/users/page'))

// Auth pages
const SignIn = lazy(() => import('@/app/auth/sign-in/page'))
const SignIn2 = lazy(() => import('@/app/auth/sign-in-2/page'))
const SignIn3 = lazy(() => import('@/app/auth/sign-in-3/page'))
const SignUp = lazy(() => import('@/app/auth/sign-up/page'))
const SignUp2 = lazy(() => import('@/app/auth/sign-up-2/page'))
const SignUp3 = lazy(() => import('@/app/auth/sign-up-3/page'))
const ForgotPassword = lazy(() => import('@/app/auth/forgot-password/page'))
const ForgotPassword2 = lazy(() => import('@/app/auth/forgot-password-2/page'))
const ForgotPassword3 = lazy(() => import('@/app/auth/forgot-password-3/page'))

// Error pages
const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

// Settings pages
const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const BillingSettings = lazy(() => import('@/app/settings/billing/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))
const ConnectionSettings = lazy(() => import('@/app/settings/connections/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Default route - redirect to dashboard
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },

  // Public pages (no auth required)
  {
    path: "/landing",
    element: <Landing />
  },
  {
    path: "/onboarding",
    element: <Onboarding />
  },

  // Admin (protected)
  {
    path: "/admin",
    element: <ProtectedRoute><Admin /></ProtectedRoute>
  },
  {
    path: "/admin/clients/:id",
    element: <ProtectedRoute><AdminClientDetail /></ProtectedRoute>
  },
  {
    path: "/admin/replies",
    element: <ProtectedRoute><AdminReplies /></ProtectedRoute>
  },
  {
    path: "/admin/contacts",
    element: <ProtectedRoute><AdminContacts /></ProtectedRoute>
  },
  {
    path: "/admin/invitations",
    element: <ProtectedRoute><AdminInvitations /></ProtectedRoute>
  },
  {
    path: "/admin/analytics",
    element: <ProtectedRoute><AdminAnalytics /></ProtectedRoute>
  },
  {
    path: "/admin/templates",
    element: <ProtectedRoute><AdminTemplates /></ProtectedRoute>
  },

  // Dashboard Routes (protected)
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>
  },
  {
    path: "/analytics",
    element: <ProtectedRoute><Analytics /></ProtectedRoute>
  },
  {
    path: "/enrollments",
    element: <ProtectedRoute><Enrollments /></ProtectedRoute>
  },
  {
    path: "/agent-flow",
    element: <ProtectedRoute><AgentFlow /></ProtectedRoute>
  },
  {
    path: "/inbox",
    element: <ProtectedRoute><RepliesInbox /></ProtectedRoute>
  },
  {
    path: "/requests",
    element: <ProtectedRoute><Requests /></ProtectedRoute>
  },
  {
    path: "/contacts",
    element: <ProtectedRoute><Users /></ProtectedRoute>
  },
  {
    path: "/users",
    element: <Navigate to="/contacts" replace />
  },

  // Authentication Routes
  {
    path: "/auth/sign-in",
    element: <SignIn />
  },
  {
    path: "/auth/sign-in-2",
    element: <SignIn2 />
  },
  {
    path: "/auth/sign-in-3",
    element: <SignIn3 />
  },
  {
    path: "/auth/sign-up",
    element: <SignUp />
  },
  {
    path: "/auth/sign-up-2",
    element: <SignUp2 />
  },
  {
    path: "/auth/sign-up-3",
    element: <SignUp3 />
  },
  {
    path: "/auth/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/auth/forgot-password-2",
    element: <ForgotPassword2 />
  },
  {
    path: "/auth/forgot-password-3",
    element: <ForgotPassword3 />
  },

  // Error Pages
  {
    path: "/errors/unauthorized",
    element: <Unauthorized />
  },
  {
    path: "/errors/forbidden",
    element: <Forbidden />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "/errors/internal-server-error",
    element: <InternalServerError />
  },
  {
    path: "/errors/under-maintenance",
    element: <UnderMaintenance />
  },

  // Settings Routes (protected)
  {
    path: "/settings/user",
    element: <ProtectedRoute><UserSettings /></ProtectedRoute>
  },
  {
    path: "/settings/account",
    element: <ProtectedRoute><AccountSettings /></ProtectedRoute>
  },
  {
    path: "/settings/billing",
    element: <ProtectedRoute><BillingSettings /></ProtectedRoute>
  },
  {
    path: "/settings/appearance",
    element: <ProtectedRoute><AppearanceSettings /></ProtectedRoute>
  },
  {
    path: "/settings/notifications",
    element: <ProtectedRoute><NotificationSettings /></ProtectedRoute>
  },
  {
    path: "/settings/connections",
    element: <ProtectedRoute><ConnectionSettings /></ProtectedRoute>
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]
