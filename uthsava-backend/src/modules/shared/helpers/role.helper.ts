import { Role } from "../../../common/types/auth.types";

/**
 * Format role name for display
 */
export class RoleHelper {
  static formatRole(role: Role): string {
    const roleMap: Record<Role, string> = {
      [Role.ADMIN]: "Admin",
      [Role.PRODUCER]: "Producer",
      [Role.USER]: "User",
      [Role.ADMIN_SUB_USER]: "Sub Admin",
    };

    return roleMap[role] || role;
  }
}
