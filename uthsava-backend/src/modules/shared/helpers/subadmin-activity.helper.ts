import { Types } from "mongoose";
import { SubAdminActivity } from "../../../models/subadmin-activity.model";
import { Role } from "../../../common/types/auth.types";
import { logger } from "../../../core/constants/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityAction = "view" | "create" | "edit" | "delete";

export interface LogActivityOptions {
  /** ID of the sub-admin who performed the action */
  subAdminId: string | Types.ObjectId;
  /** Role of the actor – activity is only logged for ADMIN_SUB_USER */
  role: Role | string;
  /** The functional module name, e.g. "Content", "User", "Season" */
  module: string;
  /** CRUD action type */
  action: ActivityAction;
  /** HTTP method of the originating request (optional, e.g. "POST") */
  method?: string;
  /** Route path of the originating request (optional, e.g. "/api/v1/admin/contents") */
  path?: string;
  /** HTTP status code returned to the client (optional) */
  statusCode?: number;
  /** Requester IP address (optional) */
  ipAddress?: string;
  /** Requester User-Agent string (optional) */
  userAgent?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * SubAdminActivityHelper
 *
 * A thin wrapper around the SubAdminActivity model that provides a single
 * `logActivity` method.  Call this at the end of any service method that
 * performs a write operation so that every sub-admin action is audited.
 *
 * Usage example (inside a service method):
 *
 *   await SubAdminActivityHelper.logActivity({
 *     subAdminId: uploadedById,
 *     role:       uploadedByRole,
 *     module:     "Content",
 *     action:     "create",
 *     method:     "POST",
 *     path:       "/api/v1/admin/contents",
 *   });
 */
export class SubAdminActivityHelper {
  /**
   * Log a sub-admin activity.
   *
   * This method silently swallows any DB error so that a logging failure
   * never breaks the caller's business logic.  Errors are reported via the
   * application logger instead.
   *
   * @returns The saved SubAdminActivity document, or `null` if the role is not
   *          ADMIN_SUB_USER or if saving failed.
   */
  static async logActivity(
    options: LogActivityOptions,
  ): Promise<InstanceType<typeof SubAdminActivity> | null> {
    // Only log activities for sub-admins
    if (options.role !== Role.ADMIN_SUB_USER) {
      return null;
    }

    try {
      const activity = new SubAdminActivity({
        subAdminId: new Types.ObjectId(options.subAdminId.toString()),
        module: options.module,
        action: options.action,
        method: options.method ?? "UNKNOWN",
        path: options.path ?? "/",
        statusCode: options.statusCode,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      });

      await activity.save();
      return activity;
    } catch (error) {
      // Log but never throw – activity logging must not block the main flow
      logger.error("[SubAdminActivityHelper] Failed to log activity:", {
        error,
        options,
      });
      return null;
    }
  }

  /**
   * Convenience method – derives the action from an HTTP method string.
   *
   * GET  → "view"
   * POST → "create"
   * PUT / PATCH → "edit"
   * DELETE → "delete"
   */
  static httpMethodToAction(httpMethod: string): ActivityAction {
    const map: Record<string, ActivityAction> = {
      GET: "view",
      POST: "create",
      PUT: "edit",
      PATCH: "edit",
      DELETE: "delete",
    };
    return map[httpMethod?.toUpperCase()] ?? "view";
  }
}
