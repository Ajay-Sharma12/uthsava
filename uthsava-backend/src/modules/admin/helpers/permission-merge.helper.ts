import { IModulePermission } from "../../../models";
import { sanitizeSubAdminPermissions } from "./subadmin-permissions.helper";

/**
 * Merges role permissions and custom permissions.
 * Follows an additive (OR) logic where custom permissions add to the role permissions.
 * Never overwrites a manually added custom permission.
 */
export function mergeRoleAndCustomPermissions(
  rolePermissions: any,
  customPermissions: any
): Record<string, IModulePermission> {
  const merged: Record<string, IModulePermission> = {};

  const rolePerms = sanitizeSubAdminPermissions(rolePermissions);
  const customPerms = sanitizeSubAdminPermissions(customPermissions);

  // Get all unique module keys from both
  const allModules = new Set([
    ...Object.keys(rolePerms),
    ...Object.keys(customPerms),
  ]);

  allModules.forEach((module) => {
    const rp = rolePerms[module] || { view: false, create: false, edit: false, delete: false, approve: false, all: false };
    const cp = customPerms[module] || { view: false, create: false, edit: false, delete: false, approve: false, all: false };

    merged[module] = {
      view: rp.view || cp.view || false,
      create: rp.create || cp.create || false,
      edit: rp.edit || cp.edit || false,
      delete: rp.delete || cp.delete || false,
      approve: rp.approve || cp.approve || false,
      all: rp.all || cp.all || false,
    };
  });

  return merged;
}
