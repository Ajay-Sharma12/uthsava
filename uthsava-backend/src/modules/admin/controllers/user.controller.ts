import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { USER_SORT_FIELDS } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { UserStatus } from "../../../models";
import { SubscriptionStatus } from "../../../models/user-subscription.model";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";


/**
 * List Users Controller
 * Returns paginated, filtered, and sorted list of users
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    const paginationParams = PaginationHelper.parseParams(
      req.query,
      USER_SORT_FIELDS as unknown as string[],
    );

    const result = await UserService.listUsers({
      ...paginationParams,
      search: req.query.search as string | undefined,
      status: req.query.status as UserStatus | undefined,
      accountStatus: req.query.accountStatus as UserStatus | undefined,
      subscriptionStatus: req.query.subscriptionStatus as
        | SubscriptionStatus
        | "Inactive"
        | undefined,
      subscriptionPlan: req.query.subscriptionPlan as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: {
          search: req.query.search || null,
          accountStatus: req.query.accountStatus || req.query.status || null,
          subscriptionStatus: req.query.subscriptionStatus || null,
          subscriptionPlan: req.query.subscriptionPlan || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
          sortBy: paginationParams.sortBy,
          sortOrder: paginationParams.sortOrder,
        },
      },
      "general.success",
      lang,
    );

  } catch (error) {
    logger.error("List users error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * List Users Lookup Controller
 * Returns a lightweight list for notification targeting
 */
export const listUserLookup = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const search = req.query.search as string | undefined;
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const users = await UserService.listUserLookup(search, limit);

    return ResponseHandler.success(
      res,
      { data: users },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("List user lookup error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Get User By ID Controller
 * Returns a single user by MongoDB _id
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { userId } = req.params;

    const user = await UserService.getUserById(userId);
    return ResponseHandler.success(res, user, "general.success", lang);
  } catch (error: any) {
    logger.error("Get user error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.userNotFound") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update User Status Controller
 * Updates user account status (active, inactive, suspended, deleted)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { userId } = req.params;
    const { status } = req.body;

    const user = await UserService.updateUserStatus(userId, status);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.USERS,
        action: "Update User Status",
        entityId: userId,
        newData: { status },
        req,
      });
    }

    return ResponseHandler.success(res, user, "general.success", lang);
  } catch (error: any) {
    logger.error("Update user status error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.invalidStatusValue") {
      return ResponseHandler.validationError(
        res,
        { status: "Invalid status value" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "error.userNotFound") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(res, "general.error", lang, 500, error);
  }
};

/**
 * Create User Controller
 * Creates a new subscriber / user account
 */
export const createUser = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const user = await UserService.createUser(req.body);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.USERS,
        action: "Create User",
        entityId: user.userId?.toString() || (user as any)._id?.toString() || "",
        newData: req.body,
        req,
      });
    }

    return ResponseHandler.success(res, user, "general.success", lang, 201);
  } catch (error: any) {
    logger.error("Create user error:", error);

    if (error.message === "error.emailAlreadyExists") {
      return ResponseHandler.validationError(
        res,
        { email: "Email address already registered" },
        "error.emailAlreadyExists",
        lang,
      );
    }

    if (error.message === "error.mobileNumberAlreadyExistsWithThisCountryCode") {
      return ResponseHandler.validationError(
        res,
        { mobile: "Phone number already registered" },
        "error.mobileNumberAlreadyExistsWithThisCountryCode",
        lang,
      );
    }

    if (error.message === "error.fullNameIsRequired") {
      return ResponseHandler.validationError(
        res,
        { fullName: "Full name is required" },
        "validation.failed",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      error.message || "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update User Controller
 * Updates user profile and account information
 */
export const updateUser = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { userId } = req.params;
    const updatedUser = await UserService.updateUser(userId, req.body);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.USERS,
        action: "Update User",
        entityId: userId,
        newData: req.body,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      updatedUser,
      "user.updatedSuccessfully",
      lang,
    );
  } catch (error: any) {
    logger.error("Update user error:", error);

    if (error.message === "error.userNotFound") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    if (error.message === "error.emailAlreadyExists") {
      return ResponseHandler.validationError(
        res,
        { email: "Email address already registered" },
        "error.emailAlreadyExists",
        lang,
      );
    }

    if (error.message === "error.mobileNumberAlreadyExistsWithThisCountryCode") {
      return ResponseHandler.validationError(
        res,
        { mobile: "Phone number already registered" },
        "error.mobileNumberAlreadyExistsWithThisCountryCode",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      error.message || "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Delete User Controller
 * Soft-deletes user account
 */
export const deleteUser = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { userId } = req.params;
    const result = await UserService.deleteUser(userId);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.USERS,
        action: "Delete User",
        entityId: userId,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      result,
      "user.deletedSuccessfully",
      lang,
    );
  } catch (error: any) {
    logger.error("Delete user error:", error);

    if (error.message === "error.userNotFound") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export default {
  listUsers,
  listUserLookup,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
};
