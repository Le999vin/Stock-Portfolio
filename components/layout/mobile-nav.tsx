"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Star, Briefcase, FlaskConical, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",  href: "/",              icon: LayoutDashboard },
  { label: "Markets",    href: "/markets",       icon: BarChart2       },
  { label: "Watchlist",  href: "/watchlist",     icon: Star            },
  { label: "Portfolio",  href: "/portfolio",     icon: Briefcase       },
  { label: "Paper",      href: "/paper-trading", icon: FlaskConical    },
  { label: "Settings",   href: "/settings",      icon: Settings        },
];

export function MobileNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-150 active:scale-95",
              isActive ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
