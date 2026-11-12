import { useRouterState, useNavigate } from "@tanstack/react-router";
import { logout } from "@/lib/services/auth";
import { getStoredUser, SESSION_UPDATED_EVENT } from "@/lib/session";
import { Search, Bell, Sun, Moon, Plus, ChevronDown, CircleDot } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { quickActions, QA } from "@/lib/quick-actions";
import { useTheme } from "@/lib/theme";
import { GlobalSearchDialog } from "@/components/admin/GlobalSearchDialog";

function useBreadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [{ label: "Dashboard", href: "/" }];
  return [
    { label: "Admin", href: "/" },
    ...segs.map((s, i) => ({
      label: s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      href: "/" + segs.slice(0, i + 1).join("/"),
    })),
  ];
}

type QuickActionItem = {
  label: string;
  to: string;
  event: string;
  modules?: string[];
};

const QUICK_ACTIONS: QuickActionItem[] = [
  { label: "Upload New Content", to: "/content", event: QA.ADD_CONTENT, modules: ["contents"] },
  { label: "Add Series", to: "/series", event: QA.ADD_SERIES, modules: ["contents"] },
  { label: "Add Producer", to: "/producers", event: QA.ADD_PRODUCER, modules: ["producers"] },
  { label: "Add User", to: "/users", event: QA.ADD_USER, modules: ["users"] },
  { label: "Add Subscription Plan", to: "/plans", event: QA.ADD_PLAN, modules: ["subscriptions"] },
  { label: "Add Category", to: "/categories", event: QA.ADD_CATEGORY, modules: ["categories"] },
  { label: "Create Coupon", to: "/coupons", event: QA.ADD_COUPON, modules: ["coupons"] },
  { label: "Send Notification", to: "/notifications", event: QA.SEND_NOTIFICATION, modules: ["notifications"] },
  { label: "Review Pending Content", to: "/content-approval", event: "", modules: ["content_approval"] },
];

export function Header() {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isDark, toggleTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener(SESSION_UPDATED_EVENT, syncUser);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, syncUser);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  const roleStr = String(currentUser?.role || "").toLowerCase();
  const isSuperAdmin = roleStr === "admin" || roleStr === "super admin" || roleStr === "superadmin";

  const allowedQuickActions = QUICK_ACTIONS.filter((action) => {
    if (isSuperAdmin || !action.modules) return true;
    const perms = currentUser?.permissions || {};
    return action.modules.some((mod) => {
      const p = perms[mod];
      return Boolean(p && (p === true || p.all || p.view || p.create || p.edit));
    });
  });

  const displayName =
    currentUser?.fullName ||
    `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
    currentUser?.name ||
    "Administrator";

  const displayRole =
    currentUser?.roleName ||
    (isSuperAdmin ? "Super Admin" : currentUser?.role || "Staff Member");

  const initials =
    displayName
      .split(" ")
      .map((s: string) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD";

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
        <div className="hidden items-center gap-2 text-sm md:flex">
          {crumbs.map((c, i) => (
            <div key={c.href} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              <button
                onClick={() => navigate({ to: c.href as any })}
                className={cn(
                  "transition hover:text-foreground",
                  i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {c.label}
              </button>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Global Search Trigger Bar */}
          <div
            onClick={() => setSearchOpen(true)}
            className="relative hidden md:flex items-center h-10 w-[280px] rounded-xl border border-border/80 bg-card/80 hover:bg-secondary/50 px-3 transition-all duration-200 cursor-pointer shadow-2xs hover:border-primary/40 group"
          >
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mr-2.5" />
            <span className="text-xs text-muted-foreground/80 truncate flex-1 select-none">
              Search content, users, producers…
            </span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs group-hover:border-primary/30 group-hover:text-primary transition-colors">
              ⌘K
            </kbd>
          </div>

          {/* Mobile Search Icon Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="grid md:hidden h-9 w-9 place-items-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground lg:flex">
            <CircleDot className="h-3 w-3 text-success" />
            All systems operational
          </div>

          {allowedQuickActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 cursor-pointer">
                  <Plus className="h-4 w-4" /> Quick Actions{" "}
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allowedQuickActions.map((a) => (
                  <DropdownMenuItem
                    key={a.label}
                    onClick={() => {
                      navigate({ to: a.to as any });
                      if (a.event) {
                        setTimeout(() => quickActions.emit(a.event), 60);
                      }
                    }}
                  >
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
                aria-label="Toggle theme"
              >
                {!mounted ? (
                  <span className="h-4 w-4" />
                ) : isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? "Switch to light" : "Switch to dark"}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { t: "Producers awaiting approval", to: "/producers" },
                { t: "Titles in review queue", to: "/content-approval" },
                { t: "Payouts ready for settlement", to: "/transactions" },
                { t: "Support tickets escalated", to: "/support" },
              ].map((n) => (
                <DropdownMenuItem key={n.t} onClick={() => navigate({ to: n.to as any })}>
                  {n.t}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/notifications" })}>
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card pl-1 pr-2.5 text-sm transition hover:bg-secondary cursor-pointer">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent to-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="hidden text-left leading-tight md:block">
                  <div className="text-xs font-medium truncate max-w-[120px]">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[120px] capitalize">
                    {displayRole}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/sub-admins" })}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/audit-logs" })}>
                Activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  logout();
                  toast.success("Signed out");
                  navigate({ to: "/login" });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}
