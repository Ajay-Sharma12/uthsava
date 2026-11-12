import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, Surface } from "@/components/admin/Primitives";
import { Check, Plus, Shield, ShieldCheck, Trash2, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchRoles,
  updateRole,
  createRole,
  deleteRole,
  type Role,
  type RolePermission,
} from "@/lib/services/roles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — Uthsava Admin" }] }),
  component: RolesPage,
});

export const ALL_SYSTEM_MODULES = [
  "dashboard",
  "users",
  "sub_admins",
  "roles",
  "cms_pages",
  "faqs",
  "email_templates",
  "settings",
  "notifications",
  "utils",
  "producers",
  "categories",
  "contents",
  "banners",
  "content_approval",
  "tutorial_slides",
  "avatars",
  "analytics",
  "activity_logs",
  "cms_media",
  "earnings",
  "subscriptions",
  "coupons",
  "producer_payouts",
  "reports",
] as const;

const VALID_PERMISSION_MODULE_KEYS = new Set(ALL_SYSTEM_MODULES);

const PERMISSION_ITEMS = [
  {
    id: "dashboard",
    name: "Dashboard Access",
    modules: ["dashboard"],
    description: "Platform analytics, streaming metrics, KPI overview, and real-time operations.",
    category: "CORE",
  },
  {
    id: "users",
    name: "User Management",
    modules: ["users"],
    description: "Manage end-users, subscriber accounts, device sessions, and consumer profiles.",
    category: "AUDIENCE",
  },
  {
    id: "producers",
    name: "Producer Management",
    modules: ["producers"],
    description: "Manage registered producers, business documentation, and contract agreements.",
    category: "AUDIENCE",
  },
  {
    id: "content",
    name: "Content Library (Movies & Series)",
    modules: ["contents", "categories"],
    description: "Create, view, and organize movies, TV series, episodes, categories, and genres.",
    category: "CATALOG",
  },
  {
    id: "content_approval",
    name: "Content Approval Queue",
    modules: ["content_approval"],
    description: "Review, approve, hold, reject, or request re-edits on producer submissions.",
    category: "CATALOG",
  },
  {
    id: "banners_avatars",
    name: "Banners & Media Assets",
    modules: ["banners", "avatars"],
    description: "Manage promotional carousel banners, hero billboards, and profile avatar packs.",
    category: "CATALOG",
  },
  {
    id: "subscriptions",
    name: "Subscription Plans",
    modules: ["subscriptions"],
    description: "Manage consumer pricing tiers, streaming packages, and subscription features.",
    category: "MONETIZATION",
  },
  {
    id: "revenue",
    name: "Revenue & Transactions",
    modules: ["earnings"],
    description: "Inspect customer payments, gateway charges, refunds, and financial logs.",
    category: "MONETIZATION",
  },
  {
    id: "producer_payouts",
    name: "Producer Payouts & Settlements",
    modules: ["producer_payouts"],
    description: "Track revenue-share calculations, earnings settlements, and payout disbursements.",
    category: "MONETIZATION",
  },
  {
    id: "coupons",
    name: "Coupons & Promotions",
    modules: ["coupons"],
    description: "Generate discount coupons, promotional voucher codes, and marketing campaigns.",
    category: "MONETIZATION",
  },
  {
    id: "cms",
    name: "Static Pages & Media CMS",
    modules: ["cms_pages", "cms_media"],
    description: "Publish legal static pages (Terms, Privacy Policy) and CDN media assets.",
    category: "OPERATIONS",
  },
  {
    id: "tutorials_faqs",
    name: "Tutorials & FAQs",
    modules: ["tutorial_slides", "faqs"],
    description: "Manage interactive onboarding tutorial slides and customer knowledge base FAQs.",
    category: "OPERATIONS",
  },
  {
    id: "email_templates",
    name: "Email Templates",
    modules: ["email_templates"],
    description: "Customize transactional email copy, notification alerts, and welcome emails.",
    category: "OPERATIONS",
  },
  {
    id: "notifications",
    name: "Push Notifications",
    modules: ["notifications"],
    description: "Compose and dispatch bulk push notifications, platform announcements, and alerts.",
    category: "ENGAGEMENT",
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    modules: ["reports", "analytics", "activity_logs"],
    description: "Access executive business intelligence, churn analytics, and security audit trails.",
    category: "ENGAGEMENT",
  },
  {
    id: "sub_admins",
    name: "Sub-Admin Manager",
    modules: ["sub_admins"],
    description: "Provision internal team staff accounts and configure individual delegations.",
    category: "GOVERNANCE",
  },
  {
    id: "roles",
    name: "Roles & Permissions",
    modules: ["roles"],
    description: "Configure role-based access control policies and permission matrices.",
    category: "GOVERNANCE",
  },
  {
    id: "settings",
    name: "Platform Settings",
    modules: ["settings", "utils"],
    description: "Configure system infrastructure, cloud storage endpoints, and security keys.",
    category: "GOVERNANCE",
  },
];

// Recommended baseline module mappings per role
const RECOMMENDED_ROLE_MODULES: Record<string, string[]> = {
  "super admin": [...ALL_SYSTEM_MODULES],
  admin: [...ALL_SYSTEM_MODULES],
  moderator: [
    "dashboard",
    "users",
    "contents",
    "categories",
    "content_approval",
    "banners",
    "avatars",
    "tutorial_slides",
    "faqs",
    "reports",
    "analytics",
    "activity_logs",
  ],
  finance: [
    "dashboard",
    "subscriptions",
    "earnings",
    "producer_payouts",
    "coupons",
    "reports",
    "analytics",
    "activity_logs",
  ],
  producer: [
    "dashboard",
    "contents",
    "categories",
    "banners",
    "avatars",
    "producer_payouts",
    "reports",
    "analytics",
  ],
  "content manager": [
    "dashboard",
    "contents",
    "categories",
    "content_approval",
    "banners",
    "avatars",
    "cms_pages",
    "cms_media",
    "tutorial_slides",
    "faqs",
    "notifications",
    "reports",
    "analytics",
  ],
  "support lead": [
    "dashboard",
    "users",
    "tutorial_slides",
    "faqs",
    "email_templates",
    "notifications",
    "reports",
    "analytics",
    "activity_logs",
  ],
};

function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [applyingDefaults, setApplyingDefaults] = useState(false);

  // Add / Edit Role Dialog State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await fetchRoles();
      if (data && data.length > 0) {
        setRoles(data);
      }
    } catch (err: any) {
      console.error("Failed to load roles:", err);
      toast.error(err?.data?.message || err?.message || "Failed to load roles from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const hasPermission = (role: Role, permItem: (typeof PERMISSION_ITEMS)[0]): boolean => {
    if (role.name?.toLowerCase() === "super admin" || role.name?.toLowerCase() === "admin") {
      return true;
    }
    const perms = role.permissions;
    if (!perms || typeof perms !== "object") return false;

    return permItem.modules.some((mod) => {
      const p = perms[mod];
      return Boolean(p && (p.all || p.view || p.create || p.edit));
    });
  };

  const cleanPermissionsMap = (raw: Record<string, any> | undefined): Record<string, RolePermission> => {
    const clean: Record<string, RolePermission> = {};
    if (!raw || typeof raw !== "object") return clean;

    Object.entries(raw).forEach(([mod, p]) => {
      if (!VALID_PERMISSION_MODULE_KEYS.has(mod as any)) return;
      if (p && typeof p === "object") {
        clean[mod] = {
          view: Boolean(p.view),
          create: Boolean(p.create),
          edit: Boolean(p.edit),
          delete: Boolean(p.delete),
          all: Boolean(p.all),
        };
      }
    });
    return clean;
  };

  const togglePermission = async (role: Role, permItem: (typeof PERMISSION_ITEMS)[0]) => {
    if (role.name?.toLowerCase() === "super admin" || role.name?.toLowerCase() === "admin") {
      toast.info("Super Admin permanently possesses unrestricted access to all modules.");
      return;
    }

    const currentlyGranted = hasPermission(role, permItem);
    const nextGranted = !currentlyGranted;

    // Clean existing permissions to avoid sending MongoDB _id fields
    const updatedPermissions: Record<string, RolePermission> = cleanPermissionsMap(role.permissions);

    for (const mod of permItem.modules) {
      updatedPermissions[mod] = {
        all: nextGranted,
        view: nextGranted,
        create: nextGranted,
        edit: nextGranted,
        delete: nextGranted,
      };
    }

    // Optimistic UI update
    const previousRoles = [...roles];
    setRoles((prev) =>
      prev.map((r) =>
        r._id === role._id ? { ...r, permissions: updatedPermissions } : r,
      ),
    );

    setSavingRoleId(role._id);

    try {
      await updateRole(role._id, { permissions: updatedPermissions });
      toast.success(
        `${permItem.name} ${nextGranted ? "granted to" : "revoked from"} ${role.name}`,
      );
    } catch (err: any) {
      // Revert on error
      setRoles(previousRoles);
      toast.error(err?.data?.message || err?.message || "Failed to update role permission");
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleApplyDefaults = async () => {
    if (
      !confirm(
        "Apply standard recommended permissions to all standard platform roles (Moderator, Finance, Producer, Content Manager, Support Lead)?",
      )
    ) {
      return;
    }

    try {
      setApplyingDefaults(true);
      let updatedCount = 0;

      for (const role of roles) {
        const roleKey = role.name?.toLowerCase().trim() || "";
        const targetModuleKeys = RECOMMENDED_ROLE_MODULES[roleKey];
        if (!targetModuleKeys) continue;

        const newPerms: Record<string, RolePermission> = {};
        for (const mod of ALL_SYSTEM_MODULES) {
          const isGranted = targetModuleKeys.includes(mod);
          newPerms[mod] = {
            view: isGranted,
            create: isGranted,
            edit: isGranted,
            delete: isGranted,
            all: isGranted,
          };
        }

        await updateRole(role._id, { permissions: newPerms });
        updatedCount++;
      }

      toast.success(`Standard permissions applied to ${updatedCount} roles successfully!`);
      await loadRoles();
    } catch (err: any) {
      console.error("Failed to apply recommended defaults:", err);
      toast.error(err?.data?.message || err?.message || "Failed to apply recommended defaults");
    } finally {
      setApplyingDefaults(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error("Please provide a valid role name");
      return;
    }

    try {
      setAddLoading(true);
      const defaultPermissions: Record<string, RolePermission> = {
        dashboard: { all: true, view: true, create: true, edit: true, delete: true },
      };

      const created = await createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        status: "active",
        permissions: defaultPermissions,
      });

      toast.success(`Role "${created.name}" created successfully`);
      setNewRoleName("");
      setNewRoleDesc("");
      setAddDialogOpen(false);
      await loadRoles();
    } catch (err: any) {
      console.error("Create role error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to create role");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.name?.toLowerCase() === "super admin" || role.name?.toLowerCase() === "admin") {
      toast.error("The system Super Admin role cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    try {
      setLoading(true);
      await deleteRole(role._id);
      toast.success(`Role "${role.name}" removed`);
      setRoles((prev) => prev.filter((r) => r._id !== role._id));
    } catch (err: any) {
      console.error("Delete role error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Granular role-based access control across the admin panel. Click any cell to toggle."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={applyingDefaults || loading}
              onClick={handleApplyDefaults}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer disabled:opacity-50"
            >
              {applyingDefaults ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              <span>Apply Recommended Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow hover:brightness-110 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Role</span>
            </button>
          </div>
        }
      />

      <Surface className="overflow-hidden">
        {loading && roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading roles and permissions matrix…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4 min-w-[240px]">PERMISSION MODULE</th>
                  {roles.map((r) => (
                    <th key={r._id || r.name} className="px-4 py-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1.5 group">
                        <span className="font-semibold text-foreground tracking-wide uppercase">
                          {r.name}
                        </span>
                        {r.name?.toLowerCase() !== "super admin" && r.name?.toLowerCase() !== "admin" && (
                          <button
                            type="button"
                            title="Delete custom role"
                            onClick={() => handleDeleteRole(r)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-0.5 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {PERMISSION_ITEMS.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</div>
                    </td>
                    {roles.map((r) => {
                      const on = hasPermission(r, p);
                      const isSuper =
                        r.name?.toLowerCase() === "super admin" || r.name?.toLowerCase() === "admin";
                      const isSavingThis = savingRoleId === r._id;

                      return (
                        <td key={r._id || r.name} className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(r, p)}
                            disabled={isSuper || isSavingThis}
                            aria-pressed={on}
                            title={`${on ? "Revoke" : "Grant"} ${p.name} for ${r.name}`}
                            className={cn(
                              "inline-grid h-7 w-7 place-items-center rounded-full transition cursor-pointer",
                              "focus:outline-none focus:ring-2 focus:ring-primary/40",
                              isSuper && "cursor-default opacity-90",
                              on
                                ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/25 active:scale-95"
                                : "bg-muted/80 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground active:scale-95",
                            )}
                          >
                            {on ? (
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      {/* Add Role Modal */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Create Administrative Role</span>
            </DialogTitle>
            <DialogDescription>
              Define a new administrative role title. You can customize its permissions directly on the matrix.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Role Name *
              </label>
              <input
                required
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Content Reviewer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Brief summary of duties and responsibilities..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {addLoading ? "Creating..." : "Create Role"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
