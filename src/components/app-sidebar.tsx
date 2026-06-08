"use client"

import * as React from "react"
import {
  LayoutDashboard, Users, Settings,
  CreditCard, BarChart3, ListChecks, Inbox, MessageSquarePlus, Workflow,
} from "lucide-react"
import { Link } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"

const API_BASE = import.meta.env.VITE_API_URL ?? ""
const INBOX_SEEN_KEY = "sdai_inbox_seen"

const buildNavGroups = (inboxBadge: number) => [
  {
    label: "Overview",
    items: [
      { title: "Dashboard",  url: "/dashboard",  icon: LayoutDashboard },
      { title: "Analytics",  url: "/analytics",  icon: BarChart3 },
    ],
  },
  {
    label: "My Agents",
    items: [
      { title: "Sequences",  url: "/enrollments", icon: ListChecks },
      { title: "Agent Flow", url: "/agent-flow",  icon: Workflow },
      { title: "Inbox",      url: "/inbox",        icon: Inbox, badge: inboxBadge },
      { title: "Contacts",   url: "/contacts",     icon: Users },
      { title: "Requests",   url: "/requests",     icon: MessageSquarePlus },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings", url: "#", icon: Settings,
        items: [
          { title: "Profile",       url: "/settings/user" },
          { title: "Account",       url: "/settings/account" },
          { title: "Notifications", url: "/settings/notifications" },
          { title: "Appearance",    url: "/settings/appearance" },
        ],
      },
      { title: "Plans & Billing", url: "/settings/billing", icon: CreditCard },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [inboxBadge, setInboxBadge] = React.useState(0)

  React.useEffect(() => {
    const token = localStorage.getItem("sdai_token")
    if (!token) return
    fetch(`${API_BASE}/api/v1/dashboard/summary?period_days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.recent_interactions) return
        const seen = Number(localStorage.getItem(INBOX_SEEN_KEY) ?? 0)
        const unread = data.recent_interactions.filter(
          (i: { direction: string; created_at: string }) =>
            i.direction === "inbound" && new Date(i.created_at).getTime() > seen,
        ).length
        setInboxBadge(unread)
      })
      .catch(() => {})
  }, [])

  const navGroups = buildNavGroups(inboxBadge)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex items-center justify-center size-8 shrink-0">
                  <img src="/sdai-logo-dark.png" alt="SDAI" className="h-6 w-auto object-contain dark:hidden" />
                  <img src="/sdai-logo-white.png" alt="SDAI" className="h-6 w-auto object-contain hidden dark:block" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SD AI Solutions</span>
                  <span className="truncate text-xs text-muted-foreground">Agent Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
