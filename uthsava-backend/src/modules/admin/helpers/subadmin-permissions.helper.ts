import { IModulePermission } from "../../../models/admin.model";

export const ALLOWED_SUBADMIN_PERMISSION_MODULES = [
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

export type AllowedModule =
  (typeof ALLOWED_SUBADMIN_PERMISSION_MODULES)[number];

export interface PermissionModule {
  id: AllowedModule;
  label: string;
  group: string;
  viewOnly?: boolean;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  // ── AUDIENCE ──
  { id: "users", label: "User Management", group: "Audience" },
  { id: "producers", label: "Producer Management", group: "Audience" },

  // ── CATALOG ──
  { id: "categories", label: "Categories & Genres", group: "Catalog" },
  { id: "contents", label: "Content Library", group: "Catalog" },
  { id: "banners", label: "Banner Manager", group: "Catalog" },
  { id: "avatars", label: "Avatar Management", group: "Catalog" },


  // ── ENGAGEMENT ──
  { id: "notifications", label: "Notifications", group: "Engagement" },

  // ── OPERATIONS ──
  { id: "cms_pages", label: "Static Content Manager", group: "Operations" },
  { id: "tutorial_slides", label: "Tutorial Manager", group: "Operations" },
  { id: "email_templates", label: "Email Template Manager", group: "Operations" },

  // ── GOVERNANCE ──
  { id: "sub_admins", label: "Sub-Admin Manager", group: "Governance" },
  { id: "roles", label: "Roles & Permissions", group: "Governance" },
  { id: "settings", label: "Platform Settings", group: "Governance" },
];

type PermissionLike = Partial<IModulePermission> | undefined;

type SubAdminPermissionsInput =
  | Record<string, PermissionLike>
  | Map<string, PermissionLike>
  | undefined
  | null;

function normalizePermissionSource(
  rawPermissions: SubAdminPermissionsInput,
): Record<string, PermissionLike> {
  if (!rawPermissions || typeof rawPermissions !== "object") {
    return {};
  }

  if (rawPermissions instanceof Map) {
    return Object.fromEntries(rawPermissions.entries());
  }

  if (typeof (rawPermissions as any).toObject === "function") {
    const result = (rawPermissions as any).toObject();
    if (result && typeof result === "object") {
      return result;
    }
  }

  if (typeof (rawPermissions as any).entries === "function") {
    try {
      return Object.fromEntries((rawPermissions as any).entries());
    } catch {
      // Fall through to object access
    }
  }

  return rawPermissions;
}

/**
 * Sanitize and normalize subadmin permissions.
 *
 * Rules:
 * - Only modules in ALLOWED_SUBADMIN_PERMISSION_MODULES are kept.
 * - If `all` is true for a module, all individual actions (view/create/edit/delete)
 *   are also set to true — "full manager access" for that module.
 * - Missing modules default to all-false.
 */
export function sanitizeSubAdminPermissions(
  rawPermissions: SubAdminPermissionsInput,
): Record<string, IModulePermission> {
  const sanitized: Record<string, IModulePermission> = {};

  const permissionSource = normalizePermissionSource(rawPermissions);

  for (const moduleId of ALLOWED_SUBADMIN_PERMISSION_MODULES) {
    const permission = permissionSource[moduleId];
    const hasAll = Boolean(permission?.all);

    sanitized[moduleId] = {
      // When `all` is true, every individual action is also true
      view: hasAll || Boolean(permission?.view),
      create: hasAll || Boolean(permission?.create),
      edit: hasAll || Boolean(permission?.edit),
      delete: hasAll || Boolean(permission?.delete),
      approve: hasAll || Boolean(permission?.approve),
      all: hasAll,
    };
  }

  return sanitized;
}
