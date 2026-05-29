"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  Settings,
  HelpCircle,
  CreditCard,
  BarChart3,
  UserCog,
  Inbox,
  UserPlus,
  Contact,
  LineChart,
  LayoutTemplate,
} from "lucide-react"
import { Link } from "react-router-dom"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        url: "/dashboard-2",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        title: "Messages",
        url: "/mail",
        icon: MessageSquare,
      },
      {
        title: "AI Agents",
        url: "/tasks",
        icon: Bot,
      },
      {
        title: "Contacts",
        url: "/users",
        icon: Users,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Client Manager",
        url: "/admin",
        icon: UserCog,
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: LineChart,
      },
      {
        title: "Templates",
        url: "/admin/templates",
        icon: LayoutTemplate,
      },
      {
        title: "Contacts",
        url: "/admin/contacts",
        icon: Contact,
      },
      {
        title: "Replies & Opt-Outs",
        url: "/admin/replies",
        icon: Inbox,
      },
      {
        title: "Invitations",
        url: "/admin/invitations",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        url: "#",
        icon: Settings,
        items: [
          { title: "Profile", url: "/settings/user" },
          { title: "Account", url: "/settings/account" },
          { title: "Billing", url: "/settings/billing" },
          { title: "Appearance", url: "/settings/appearance" },
          { title: "Notifications", url: "/settings/notifications" },
        ],
      },
      {
        title: "Plans & Billing",
        url: "/settings/billing",
        icon: CreditCard,
      },
      {
        title: "Help & FAQ",
        url: "/faqs",
        icon: HelpCircle,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                  <span className="truncate font-semibold">SDAI Solutions</span>
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
