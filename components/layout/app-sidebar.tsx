"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Star,
  BarChart2,
  Settings,
  Briefcase,
  FlaskConical,
  Bell,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",    href: "/",              icon: LayoutDashboard },
  { label: "Markets",      href: "/markets",       icon: BarChart2       },
  { label: "Watchlist",    href: "/watchlist",     icon: Star            },
  { label: "Portfolio",    href: "/portfolio",     icon: Briefcase       },
  { label: "Paper Trading",href: "/paper-trading", icon: FlaskConical    },
  { label: "Alerts",       href: "/alerts",        icon: Bell            },
  { label: "Journal",      href: "/journal",       icon: BookOpen        },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-semibold tracking-tight text-sm group-data-[collapsible=icon]:hidden">
            Portfolio
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2",
                          pathname === item.href && "text-sidebar-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/settings"}
              tooltip="Settings"
              render={
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-2",
                    pathname === "/settings" && "text-sidebar-primary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
