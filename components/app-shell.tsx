"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import {
  Building2,
  Menu,
  Search,
  SlidersHorizontal,
  LogOut,
  User,
  Users,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Houses", icon: Building2, path: "/houses" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Configuration", icon: SlidersHorizontal, path: "/configurations" },
  { label: "Settings", icon: Settings, path: "/settings" },
]

function initialsFromUser(name?: string | null, email?: string | null) {
  const src = (name?.trim() || "")
  if (src) {
    return src
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("")
  }
  if (email?.trim()) return email.trim().slice(0, 2).toUpperCase()
  return "MC"
}

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = useMemo(
    () => initialsFromUser(session?.user?.name ?? null, session?.user?.email ?? null),
    [session?.user?.name, session?.user?.email],
  )

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-2.5 py-5 transition-all",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xs">
          MC
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">MiCasa</span>}
      </div>

      <nav className={cn("flex-1 space-y-0.5 pt-2", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/")
          const Icon = item.icon

          const linkContent = (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )

          if (!collapsed) return linkContent

          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className={cn("border-t border-border p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? ""}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email ?? ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()

  const initials = initialsFromUser(session?.user?.name ?? null, session?.user?.email ?? null)

  const pathname = usePathname()
  const isStandalone =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/setup"

  if (isStandalone) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <div className="flex h-svh overflow-hidden">
        <aside
          className={cn(
            "hidden lg:flex flex-col bg-card border-r border-border relative transition-all duration-200",
            collapsed ? "w-[60px]" : "w-[220px]",
          )}
        >
          <SidebarContent collapsed={collapsed} />
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="absolute -right-3 top-7 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground transition-colors"
            type="button"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[220px] p-0 bg-card border-border">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="hidden sm:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search houses..." className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 text-sm" />
              </div>
            </div>

            <div className="flex-1 sm:hidden" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
