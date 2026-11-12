import { useNavigate } from "@tanstack/react-router";
import { logout } from "@/lib/services/auth";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getStoredUser, SESSION_UPDATED_EVENT } from "@/lib/session";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Film,
  Tv2,
  Tags,
  CreditCard,
  Wallet,
  Ticket,
  Bell,
  BarChart3,
  Smartphone,
  LifeBuoy,
  FileText,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  modules?: string[];
};

const NAV: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, group: "Overview", modules: ["dashboard"] },

  { to: "/users", label: "User Management", icon: Users, group: "Audience", modules: ["users"] },
  { to: "/producers", label: "Producer Management", icon: Briefcase, group: "Audience", modules: ["producers"] },

  { to: "/content-approval", label: "Content Approval", icon: ShieldCheck, group: "Catalog", modules: ["content_approval"] },
  { to: "/content", label: "Content Library", icon: Film, group: "Catalog", modules: ["contents", "categories"] },
  { to: "/movies", label: "Movies", icon: Film, group: "Catalog", modules: ["contents"] },
  { to: "/series", label: "Series & Episodes", icon: Tv2, group: "Catalog", modules: ["contents"] },
  { to: "/categories", label: "Categories & Genres", icon: Tags, group: "Catalog", modules: ["categories"] },

  { to: "/plans", label: "Subscription Plans", icon: CreditCard, group: "Monetization", modules: ["subscriptions"] },
  { to: "/transactions", label: "Revenue & Transactions", icon: Wallet, group: "Monetization", modules: ["earnings"] },
  { to: "/payouts", label: "Producer Payouts", icon: Wallet, group: "Monetization", modules: ["producer_payouts"] },
  { to: "/coupons", label: "Coupons & Promotions", icon: Ticket, group: "Monetization", modules: ["coupons"] },

  { to: "/notifications", label: "Notifications", icon: Bell, group: "Engagement", modules: ["notifications"] },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3, group: "Engagement", modules: ["reports", "analytics"] },

  { to: "/devices", label: "Device Management", icon: Smartphone, group: "Operations", modules: ["users", "settings"] },
  { to: "/support", label: "Support Center", icon: LifeBuoy, group: "Operations", modules: ["users", "faqs"] },
  { to: "/cms", label: "CMS Management", icon: FileText, group: "Operations", modules: ["cms_pages", "cms_media", "tutorial_slides", "email_templates", "faqs"] },

  { to: "/sub-admins", label: "Sub-Admin Manager", icon: UserCog, group: "Governance", modules: ["sub_admins"] },
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, group: "Governance", modules: ["roles"] },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, group: "Governance", modules: ["activity_logs", "reports"] },
  { to: "/settings", label: "Platform Settings", icon: Settings, group: "Governance", modules: ["settings", "utils"] },
];

const GROUP_ORDER = [
  "Overview",
  "Audience",
  "Catalog",
  "Monetization",
  "Engagement",
  "Operations",
  "Governance",
];

function hasAccess(item: Item, user: any): boolean {
  if (!user) return true;
  const role = String(user.role || "").toLowerCase();
  if (role === "admin" || role === "super admin" || role === "superadmin") {
    return true; // Super Admin has unrestricted access to all modules
  }

  if (!item.modules || item.modules.length === 0) {
    return true;
  }

  const permissions = user.permissions || {};
  return item.modules.some((mod) => {
    const perm = permissions[mod];
    if (!perm) return false;
    return Boolean(
      perm === true ||
      perm.all ||
      perm.view ||
      perm.create ||
      perm.edit ||
      perm.delete,
    );
  });
}

export function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    window.addEventListener(SESSION_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, syncUser);
  }, []);

  const visibleNav = NAV.filter((item) => hasAccess(item, currentUser));
  const grouped = GROUP_ORDER
    .map((g) => ({ name: g, items: visibleNav.filter((n) => n.group === g) }))
    .filter((g) => g.items.length > 0);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUP_ORDER.map((g) => [g, true])),
  );

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex",
        collapsed ? "w-[72px]" : "w-[268px]",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.22_18)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">UTHSAVA</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Entertainment
              </div>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {grouped.map((g) => (
          <div key={g.name} className="mb-4">
            {!collapsed && (
              <button
                onClick={() => setOpenGroups((s) => ({ ...s, [g.name]: !s[g.name] }))}
                className="mb-1.5 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 hover:text-foreground cursor-pointer"
              >
                {g.name}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !openGroups[g.name] && "-rotate-90",
                  )}
                />
              </button>
            )}
            {(collapsed || openGroups[g.name]) && (
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all",
                          active
                            ? "bg-gradient-to-r from-primary/15 to-transparent text-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <Icon
                          className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={async () => {
            logout();
            const { toast } = await import("sonner");
            toast.success("Signed out successfully");
            navigate({ to: "/login" });
          }}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground cursor-pointer"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
