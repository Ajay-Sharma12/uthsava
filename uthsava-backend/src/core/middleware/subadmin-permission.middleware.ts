import { Request, Response, NextFunction } from "express";
import { Role } from "../../common/types/auth.types";
import { SubAdminActivity, User } from "../../models";
import { sanitizeSubAdminPermissions } from "../../modules/admin/helpers/subadmin-permissions.helper";
import { logger } from "../constants/logger";

type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

/** Map HTTP methods to their corresponding permission actions */
const methodActionMap: Record<string, PermissionAction> = {
  GET: "view",
  POST: "create",
  PUT: "edit",
  PATCH: "edit",
  DELETE: "delete",
};

/** Resolve the required permission action from the HTTP method */
function resolveAction(method: string): PermissionAction {
  return methodActionMap[method.toUpperCase()] || "view";
}

/**
 * Log a write activity for sub-admins and producers.
 * Only fires once per response via res.once to avoid duplicate records.
 */
function recordActivity(
  req: Request,
  res: Response,
  module: string,
  action: PermissionAction,
): void {
  const user = req.user;

  // Only record for role types that are tracked
  if (
    !user ||
    (user.role !== Role.ADMIN_SUB_USER && user.role !== Role.PRODUCER)
  ) {
    return;
  }

  res.once("finish", () => {
    const userId = user._id;
    logger.info(
      `[Activity] Recording: userId=${userId} role=${user.role} module=${module} action=${action} status=${res.statusCode}`,
    );
    SubAdminActivity.create({
      subAdminId: userId,
      module,
      action,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    }).catch((error: unknown) => {
      logger.error("Failed to record activity:", error);
    });
  });
}

/**
 * Middleware to enforce module-level permissions.
 *
 * - ADMIN role → always allowed (full access)
 * - ADMIN_SUB_USER / PRODUCER → checked against their `permissions` document field
 * - Any other role → 403 Forbidden
 *
 * Usage:
 *   requireSubAdminPermission('contents')           — auto-detect action from HTTP method
 *   requireSubAdminPermission('content_approval', 'edit') — explicit action override
 */
export const requireSubAdminPermission =
  (module: string, explicitAction?: PermissionAction) =>
    async (req: Request, res: Response, next: NextFunction) => {
      const action = explicitAction || resolveAction(req.method);

      if (!req.user) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Platform admins (case-insensitive) always have full access — skip permission check
      const userRole = String(req.user.role).toLowerCase();
      if (userRole === "admin") {
        return next();
      }

      try {
        const userId = req.user._id;
        const user = await User.findById(userId).select(
          "permissions status role refreshToken",
        );

        // Block if user doesn't exist, is inactive, or lost their session token
        if (
          !user ||
          user.status !== "active" ||
          !user.refreshToken
        ) {
          return res.status(403).json({ message: "Forbidden" });
        }

        let rawPermissions = (user as any).permissions;

        // If the user has a producer role, retrieve permissions dynamically from the database "producer" role
        if (String(user.role).toLowerCase() === "producer") {
          const { RoleModel } = require("../../models/role.model");
          const dbRole = await RoleModel.findOne({ name: { $regex: /^producer$/i } });
          if (dbRole) {
            rawPermissions = dbRole.permissions;
          }
        }

        // Check the module permission against the stored permissions map
        const permissions = sanitizeSubAdminPermissions(
          rawPermissions,
        );
        const modulePermission = permissions[module];

        if (!modulePermission?.all && !modulePermission?.[action]) {
          return res.status(403).json({
            message: `You do not have ${action} permission for this module`,
            code: "PERMISSION_DENIED",
            module,
            action,
            requiredPermission: `${module}.${action}`,
          });
        }

        // Record write activity (skip GET/view to avoid log noise)
        if (action !== "view") {
          recordActivity(req, res, module, action);
        }

        return next();
      } catch (error) {
        logger.error("Permission check error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error" });
      }
    };
