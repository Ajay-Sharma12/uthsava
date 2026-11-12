import { Request, Response } from "express";
import { AuthService } from "../../auth/services/auth.service";
import { TokenService } from "../../auth/services/token.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { AdminAuthService } from "../services/auth.service";
import { logger } from "../../../core/constants/logger";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule, AuditStatus } from "../../../models/audit-log.model";
import {
  TOKEN_EXPIRY,
  HTTP_STATUS,
} from "../../../core/constants/app.constants";
import { UserService } from "../services/user.service";
import { JwtPayload, Role } from "../../../common/types/auth.types";
import { sanitizeSubAdminPermissions, ALLOWED_SUBADMIN_PERMISSION_MODULES } from "../helpers/subadmin-permissions.helper";
import { sendMail } from "../../shared/services/mail.service";
import { EmailTemplate } from "../../../models/email-template.model";
import { getAdminBaseUrl } from "../../shared/helpers/url.helper";
import { RoleHelper } from "../../shared/helpers/role.helper";
import { RoleModel } from "../../../models/role.model";
import { mergeRoleAndCustomPermissions } from "../helpers/permission-merge.helper";
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
/**
 * Admin Login Controller
 * Handles admin user authentication
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, deviceId, deviceType, deviceToken } = req.body;
    const rememberMe = req.body.rememberMe !== undefined
      ? Boolean(req.body.rememberMe)
      : (req.body.remember !== undefined ? Boolean(req.body.remember) : undefined);
    const lang = getLanguage(req);

    // Get client IP address
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "unknown";

    // Authenticate admin user
    const result = await AdminAuthService.authenticateAdmin(email, password, req);

    if (!result) {
      AuditLogService.logAction({
        module: AuditModule.AUTH,
        action: "Admin Login Failed",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Invalid email or password",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      return ResponseHandler.error(res, "auth.loginFailed", lang, 400);
    }

    const { user, tokens } = result;

    // Block login if user has pending action/verification requirements (any role except super admin)
    if (user.role !== Role.ADMIN && (user as any).isActionRequired) {
      AuditLogService.logAction({
        adminId: user._id,
        module: AuditModule.AUTH,
        action: "Admin Login Blocked",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Permission action or verification required",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      return ResponseHandler.forbidden(res, "auth.permissionActionRequired", lang);
    }

    const { accessToken, refreshToken } = tokens;

    await AdminAuthService.persistLoginSession(String(user._id), {
      refreshToken,
      clientIp,
      deviceId,
      deviceType,
      deviceToken,
      rememberMe,
    });

    const appUser = user as unknown as any;
    appUser.deviceId = deviceId || null;
    appUser.deviceType = deviceType || null;
    appUser.deviceToken = deviceToken || null;

    // Check if user account is active
    if (user.status === "inactive") {
      AuditLogService.logAction({
        adminId: user._id,
        module: AuditModule.AUTH,
        action: "Admin Login Blocked",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Account is inactive",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      return ResponseHandler.forbidden(res, "auth.accountInactive", lang);
    }
    await EmailTemplate.findOne({ keyword: "WELCOME_EMAIL" })
      .then((EmailTemplate) => {
        if (!EmailTemplate) {
          logger.warn("Email template WELCOME_EMAIL not found");
          return;
        }
        let emailBody = EmailTemplate.description || "";
        let emailSubject = EmailTemplate.subject || "Welcome to Uthsava!";
        const userName = user.firstName || user.fullName || "User";
        const loginUrl = getAdminBaseUrl(req);

        // Replace placeholders in subject
        emailSubject = emailSubject
          .replaceAll("{{Platform Name}}", "Uthsava")
          .replaceAll("{{platformName}}", "Uthsava")
          .replaceAll("{{Platform_Name}}", "Uthsava")
          .replaceAll("{{site_name}}", "Uthsava")
          .replaceAll("{{User Name}}", userName)
          .replaceAll("{{userName}}", userName)
          .replaceAll("{{name}}", userName);

        // Replace placeholders in body
        emailBody = emailBody.replaceAll("{{name}}", userName);
        emailBody = emailBody.replaceAll("{{User Name}}", userName);
        emailBody = emailBody.replaceAll("{{userName}}", userName);
        emailBody = emailBody.replaceAll("{{email}}", user.email || "");
        emailBody = emailBody.replaceAll("{{Email}}", user.email || "");
        emailBody = emailBody.replaceAll("{{site_name}}", "Uthsava");
        emailBody = emailBody.replaceAll("{{Platform Name}}", "Uthsava");
        emailBody = emailBody.replaceAll("{{Login URL}}", loginUrl);
        emailBody = emailBody.replaceAll("{{login_url}}", loginUrl);

        sendMail(
          user.email || "admin@example.com",
          emailSubject,
          emailBody,
        )
          .then(() => logger.info(`Welcome email sent to: ${user.email}`))
          .catch((emailError: any) =>
            logger.error("Failed to send welcome email:", emailError),
          );
      })
      .catch((err: any) => {

        logger.error("Error fetching email template:", err);
      }
      );
    // Set refresh token in HTTP-only cookie
    AuthService.setRefreshTokenCookie(res, refreshToken, rememberMe);

    // Log successful login
    AuditLogService.logAction({
      adminId: user._id,
      module: AuditModule.AUTH,
      action: "Admin Login",
      req,
      status: AuditStatus.SUCCESS,
      newData: { email: user.email, role: user.role },
    }).catch(err => logger.error("Audit log error:", err));

    // Load and check role-based permissions dynamically
    let loginPermissions = (user as any).permissions;
    let loginCustomPermissions = (user as any).customPermissions;
    let roleDisplayName = RoleHelper.formatRole(user.role);

    const userRoleStr = String(user.role).toLowerCase();
    if (userRoleStr === "admin") {
      // Super admins always have full access to everything
      const fullPerms = ALLOWED_SUBADMIN_PERMISSION_MODULES.reduce((acc, module) => {
        acc[module] = { all: true, view: true, create: true, edit: true, delete: true };
        return acc;
      }, {} as any);
      loginPermissions = fullPerms;
      loginCustomPermissions = fullPerms;
      roleDisplayName = "Super Admin";
    } else if (userRoleStr === "admin_sub_user" || (user as any).roleId) {
      if ((user as any).roleId) {
        const dbRole = await RoleModel.findById((user as any).roleId);
        if (dbRole) {
          roleDisplayName = dbRole.name;
          loginPermissions = mergeRoleAndCustomPermissions(
            dbRole.permissions,
            (user as any).customPermissions,
          );
        }
      }
    } else if (userRoleStr === "producer") {
      // Producers fetch their role-based permissions dynamically from the database Role configuration
      const dbRole = await RoleModel.findOne({ name: { $regex: /^producer$/i } });
      if (dbRole) {
        roleDisplayName = "Producer";
        loginPermissions = dbRole.permissions;
        loginCustomPermissions = dbRole.permissions;
      }
    }

    // Return success response
    return ResponseHandler.success(
      res,
      {
        token: accessToken,
        refreshToken: refreshToken,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        fullName: user.fullName || "",
        mobile: user.mobile || "",
        countryCode: user.countryCode || 0,
        profileImage: user.profileImage || "",
        role: user.role,
        roleId: (user as any).roleId,
        roleName: roleDisplayName,
        permissions: sanitizeSubAdminPermissions(loginPermissions as any),
        customPermissions: sanitizeSubAdminPermissions(loginCustomPermissions as any),
        status: "active",
        adminId: user._id,
        _id: user._id,
        deviceId: appUser.deviceId || null,
        deviceType: appUser.deviceType || null,
        deviceToken: appUser.deviceToken || null,
        notificationEnabled: appUser.notificationEnabled,
        rememberMe: rememberMe !== undefined ? rememberMe : Boolean((user as any).rememberMe),
      },
      "auth.loginSuccess",
      lang,
    );
  } catch (error: any) {
    logger.error("Admin login error:", error);

    const lang = getLanguage(req);

    if (error.message === "error.emailNotFound" || error.message === "auth.emailNotFound") {
      return ResponseHandler.validationError(
        res,
        { email: "Email does not exist" },
        "auth.emailNotFound",
        lang,
      );
    }

    if (error.message === "error.invalidPassword" || error.message === "auth.invalidPassword") {
      return ResponseHandler.validationError(
        res,
        { password: "Incorrect password" },
        "error.currentPasswordIsNotCorrect",
        lang,
      );
    }

    if (error.message === "auth.accountInactive") {
      return ResponseHandler.forbidden(res, "auth.accountInactive", lang);
    }

    if (error.message === "auth.accessDenied") {
      return ResponseHandler.forbidden(res, "auth.accessDenied", lang);
    }

    if (error.message && error.message.startsWith("auth.accountLocked:")) {
      const remainingMinutes = error.message.split(":")[1];
      return ResponseHandler.error(
        res,
        `Account is temporarily blocked due to multiple failed login attempts. Please try again after ${remainingMinutes} minutes.`,
        lang,
        HTTP_STATUS.FORBIDDEN,
      );
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
 * Admin Refresh Token Controller
 * Generates new access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Verify the user exists and is an admin
    const user = await AdminAuthService.findAdminByRefreshToken(refreshToken);
    if (!user) {
      return ResponseHandler.unauthorized(res, "auth.tokenExpired", lang);
    }

    // Verify refresh token and generate new access token
    const accessToken = await TokenService.refreshAccessToken(refreshToken);

    // Refresh the cookie
    AuthService.setRefreshTokenCookie(res, refreshToken);

    return ResponseHandler.success(
      res,
      {
        accessToken,
        expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
      },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("Admin refresh token error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.unauthorized(res, "auth.tokenExpired", lang);
  }
};


/**
 * Get Profile Controller
 * Returns the logged-in user's profile information
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);

    // Get user ID from authenticated request
    const userId = req.user?._id || req.user?.sub;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Get user profile
    const user = await UserService.getUserProfile(userId);

    return ResponseHandler.success(res, user, "general.success", lang);
  } catch (error: any) {
    logger.error("Get profile error:", error);
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
 * Forgot Password Controller
 * Initiates password reset process by sending reset link via email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const lang = getLanguage(req);

    // Request password reset - handles token generation and email sending using dynamic request domain
    const result = await AdminAuthService.requestPasswordReset(email, req);

    return ResponseHandler.success(
      res,
      {
        message: "Password reset link has been sent to your email",
        ...(typeof result === "object" ? result : {}),
      },
      "auth.resetLinkSent",
      lang,
    );
  } catch (error) {
    // Log error for debugging
    logger.error("Forgot password error:", error);
    const lang = getLanguage(req);
    const errorMessage =
      error instanceof Error ? error.message : "general.error";

    // Handle specific error for non-existent email
    if (errorMessage === "auth.emailNotFound") {
      return ResponseHandler.error(
        res,
        "auth.emailNotFound",
        lang,
        HTTP_STATUS.BAD_REQUEST,
        error,
      );
    }

    // For any other error, return generic error response to prevent info leakage
    // Actual error details are logged for debugging
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
 * Verify Reset Token Controller
 * Validates if reset token is still valid
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const lang = getLanguage(req);

    const userId = AdminAuthService.verifyPasswordResetToken(token);

    if (!userId) {
      return ResponseHandler.error(
        res,
        "auth.invalidOrExpiredToken",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return ResponseHandler.success(
      res,
      { valid: true },
      "auth.tokenValid",
      lang,
    );
  } catch (error) {
    logger.error("Verify reset token error:", error);
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
 * Reset Password Controller
 * Resets user password using valid reset token
 *
 * SRS Requirement: Password reset also logs out from all devices
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const lang = getLanguage(req);

    await AdminAuthService.resetPassword(token, newPassword);

    return ResponseHandler.success(
      res,
      {
        message:
          "Password has been reset successfully. Please login again on all devices.",
        requireReLogin: true,
      },
      "auth.passwordResetSuccess",
      lang,
    );
  } catch (error: unknown) {
    logger.error("Reset password error:", error);
    const lang = getLanguage(req);
    const errorMessage =
      error instanceof Error ? error.message : "general.error";
    const statusCode = errorMessage.includes("Invalid or expired")
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    return ResponseHandler.error(res, errorMessage, lang, statusCode, error);
  }
};

/**
 * Logout Controller
 * Clears the refresh token cookie and optionally invalidates tokens
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = (req as any).user?.sub || (req as any).user?._id;

    // Clear device token, device type and refresh token from DB
    if (userId) {
      const { User } = require("../../../models");
      await User.findByIdAndUpdate(userId, {
        $set: { deviceToken: null, deviceType: null, refreshToken: null },
      });

      AuditLogService.logAction({
        adminId: userId,
        module: AuditModule.AUTH,
        action: "Admin Logout",
        req,
        status: AuditStatus.SUCCESS,
      }).catch(err => logger.error("Audit log error:", err));
    }

    // Clear the refresh token cookie
    AuthService.clearRefreshTokenCookie(res);

    return ResponseHandler.success(res, null, "auth.logoutSuccess", lang);
  } catch (error) {
    logger.error("Logout error:", error);
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
 * Change Password Controller
 * Changes the logged-in user's password
 */
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub;

    // Extract current password and new password from request body.
    // Confirm password matching is automatically handled by the validation schema.
    const { currentPassword, newPassword } = req.body;

    // Ensure the user is properly authenticated
    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Call service to verify the current password and securely hash/store the new password.
    // If successful, this will also invalidate all active sessions for security.
    await AdminAuthService.changePassword(userId, currentPassword, newPassword);

    AuditLogService.logAction({
      adminId: userId,
      module: AuditModule.AUTH,
      action: "Change Password",
      req,
      status: AuditStatus.SUCCESS,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      {
        message:
          "Password changed successfully. You have been logged out from all devices.",
        requireReLogin: true,
      },
      "auth.passwordChanged",
      lang,
    );
  } catch (error: any) {
    logger.error("Change password error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.userNotFound") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    // Return the specific error message requested if the current password is wrong
    if (error.message === "error.invalidOldPassword") {
      return ResponseHandler.error(
        res, "error.currentPasswordIsNotCorrect",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (error.message === "error.newPasswordSameAsCurrent") {
      return ResponseHandler.error(
        res,
        "error.newPasswordSameAsCurrent",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
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
 * Update Profile Controller
 * Updates the logged-in user's profile information
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const { firstName, lastName, profileImage } = req.body;

    const updatedUser = await AdminAuthService.updateProfile(userId, {
      firstName,
      lastName,
      profileImage,
    });

    AuditLogService.logAction({
      adminId: userId,
      module: AuditModule.AUTH,
      action: "Update Profile",
      req,
      status: AuditStatus.SUCCESS,
      newData: { firstName, lastName, profileImage },
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, updatedUser, "profile.updated", lang);
  } catch (error: any) {
    logger.error("Update profile error:", error);
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

export default {
  login,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
};
