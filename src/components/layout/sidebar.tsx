"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  ShieldAlert,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Bell,
  Compass,
  Star,
  ChevronLeft,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, useUser, authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Nav config per role ──────────────────────────────────────────────────────

const adminNav = [
  { label: "Dashboard",   href: "/admin/dashboard",   icon: LayoutDashboard },
  { label: "Users",       href: "/admin/users",        icon: Users },
  { label: "Courses",     href: "/admin/courses",      icon: BookOpen },
  { label: "Moderation",  href: "/admin/moderation",   icon: ShieldAlert },
  { label: "Analytics",   href: "/admin/analytics",    icon: BarChart3 },
];

const teacherNav = [
  { label: "Dashboard",     href: "/teacher/dashboard",    icon: LayoutDashboard },
  { label: "My Courses",    href: "/teacher/courses",      icon: BookOpen },
  { label: "Assessments",   href: "/teacher/assessments",  icon: ClipboardList },
  { label: "Messages",      href: "/teacher/messages",     icon: MessageSquare },
  { label: "Notifications", href: "/teacher/notifications",icon: Bell },
];

const studentNav = [
  { label: "Dashboard",   href: "/student/dashboard",   icon: LayoutDashboard },
  { label: "Browse",      href: "/student/browse",      icon: Compass },
  { label: "My Courses",  href: "/student/mycourse",    icon: GraduationCap },
  { label: "Assessments", href: "/student/assessments", icon: ClipboardList },
  { label: "Grades",      href: "/student/grade",       icon: Star },
  { label: "Messages",    href: "/student/messages",    icon: MessageSquare },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const role = useRole();
  const user = useUser();
  const router = useRouter();

  const navItems =
    role === "admin" ? adminNav :
    role === "teacher" ? teacherNav :
    studentNav;

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[220px]",
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-14 items-center border-b px-3",
          collapsed ? "justify-center" : "gap-2",
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-foreground">
              EduPlatform
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center" : "",
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </nav>

        <Separator />

        {/* User + sign out */}
        <div className={cn("flex flex-col gap-1 p-2")}>
          {/* Profile link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center",
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={user?.image ?? ""} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user?.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="truncate text-xs">{user?.name}</span>
                )}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{user?.name}</TooltipContent>}
          </Tooltip>

          {/* Sign out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive",
                  collapsed && "justify-center",
                )}
              >
                <LogOut className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!collapsed && <span>Sign out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
          </Tooltip>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-accent"
        >
          <ChevronLeft
            className={cn("h-3 w-3 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </aside>
    </TooltipProvider>
  );
}