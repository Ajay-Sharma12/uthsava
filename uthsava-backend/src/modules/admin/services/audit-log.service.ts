import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog, AuditModule, AuditStatus } from "../../../models/audit-log.model";
import { logger } from "../../../core/constants/logger";
import { PaginationParams } from "../../shared/helpers/pagination.helper";

export class AuditLogService {
  /**
   * Helper to format User-Agent into clean OS / Browser string
   */
  private static parseDevice(userAgent: string | undefined): string {
    if (!userAgent) return "Unknown";

    let os = "Unknown OS";
    if (/Macintosh|Mac OS X/i.test(userAgent)) os = "Mac";
    else if (/Windows NT/i.test(userAgent)) os = "Windows";
    else if (/Android/i.test(userAgent)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";

    let browser = "Browser";
    if (/Edg/i.test(userAgent)) browser = "Edge";
    else if (/Chrome/i.test(userAgent)) browser = "Chrome";
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = "Safari";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Opera|OPR/i.test(userAgent)) browser = "Opera";

    return `${os} - ${browser}`;
  }

  /**
   * Log an action performed by an admin, sub-admin, producer, or system event.
   */
  public static async logAction(params: {
    adminId?: Types.ObjectId | string | null;
    module: AuditModule;
    action: string;
    entityId?: Types.ObjectId | string | null;
    oldData?: Record<string, any> | null;
    newData?: Record<string, any> | null;
    req?: Request;
    status?: AuditStatus;
    failureReason?: string | null;
  }): Promise<void> {
    try {
      let ipAddress: string | null = null;
      let device = "Unknown";

      const adminId =
        params.adminId ||
        (params.req as any)?.user?._id ||
        (params.req as any)?.user?.sub ||
        null;

      if (params.req) {
        // Capture IP Address
        const forwarded = params.req.headers["x-forwarded-for"];
        ipAddress =
          (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
          params.req.socket?.remoteAddress ||
          params.req.ip ||
          null;

        if (Array.isArray(ipAddress)) {
          ipAddress = ipAddress[0];
        }

        // Capture Device / Browser Information
        const userAgent = params.req.headers["user-agent"] as string | undefined;
        device = AuditLogService.parseDevice(userAgent);
      }

      await AuditLog.create({
        adminId: adminId && Types.ObjectId.isValid(String(adminId)) ? new Types.ObjectId(String(adminId)) : null,
        module: params.module,
        action: params.action,
        entityId: params.entityId && Types.ObjectId.isValid(String(params.entityId)) ? new Types.ObjectId(String(params.entityId)) : null,
        oldData: params.oldData || null,
        newData: params.newData || null,
        ipAddress,
        device,
        status: params.status || AuditStatus.SUCCESS,
        failureReason: params.failureReason || null,
      });
    } catch (error) {
      // Internal logging without blocking main transaction
      logger.error("Failed to create audit log", error);
    }
  }

  /**
   * List paginated audit logs
   */
  public static async listLogs(
    pagination: PaginationParams,
    query: any,
  ): Promise<{ data: any[]; total: number; totalPages: number; page: number; limit: number }> {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AuditLog.find(query)
        .populate("adminId", "fullName firstName lastName email role companyName profileImage avatar")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      totalPages,
      page,
      limit,
    };
  }

  /**
   * Get an audit log by ID
   */
  public static async getLogById(logId: string): Promise<any> {
    const log = await AuditLog.findById(logId)
      .populate("adminId", "fullName firstName lastName email role companyName profileImage avatar")
      .lean();

    if (!log) {
      throw new Error("error.auditLogNotFound");
    }

    return log;
  }
}
