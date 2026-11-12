import {
  User, IUser, UserStatus
} from "../../../models";
import { EmailTemplate } from "../../../models/email-template.model";
import { AuthService } from "../../auth/services/auth.service";
import { Role } from "../../../common/types/auth.types";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../../../core/config";
import { sendMail } from "../../shared/services/mail.service";
import { logger } from "../../../core/constants/logger";
import { AuditLogService } from "./audit-log.service";
import { AuditModule, AuditStatus } from "../../../models/audit-log.model";
import { Request } from "express";
import { getAdminBaseUrl } from "../../shared/helpers/url.helper";

/**
 * Admin Auth Service
 * Handles business logic for admin authentication
 */
export class AdminAuthService {
  /**
   * Authenticate admin user
   * Finds user by email and validates credentials
   */
  static async authenticateAdmin(
    email: string,
    password: string,
    req?: Request
  ): Promise<{
    user: IUser;
    tokens: { accessToken: string; refreshToken: string };
  } | null> {
    if (!email) {
      throw new Error("error.emailIsRequired");
    }
    if (!password) {
      throw new Error("error.passwordIsRequired");
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });

    if (!user) {
      AuditLogService.logAction({
        module: AuditModule.AUTH,
        action: "Admin Login Failed",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Email does not exist",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      throw new Error("error.emailNotFound");
    }

    if (
      user.status === UserStatus.INACTIVE ||
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.DELETED
    ) {
      AuditLogService.logAction({
        adminId: user._id,
        module: AuditModule.AUTH,
        action: "Admin Login Blocked",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Account is inactive",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      throw new Error("auth.accountInactive");
    }

    // Allow authentication for admin, sub-admin, users and producer roles
    const isValidUser =
      [Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER, Role.USER].includes(user.role as any) ||
      ["ADMIN", "ADMIN_SUB_USER", "PRODUCER", "USER"].includes(user.role as any);

    // Check if user has valid role
    if (!isValidUser) {
      throw new Error("auth.accessDenied");
    }

    // Check if account is temporarily blocked
    if (user.loginLockUntil && user.loginLockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.loginLockUntil.getTime() - Date.now()) / 60000);
      throw new Error(`auth.accountLocked:${remainingMinutes}`);
    }

    // Validate password
    const isValidPassword = await AuthService.validatePassword(user, password);
    if (!isValidPassword) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      AuditLogService.logAction({
        adminId: user._id,
        module: AuditModule.AUTH,
        action: "Admin Login Failed",
        req,
        status: AuditStatus.FAILED,
        failureReason: "Incorrect password",
        newData: { email },
      }).catch(err => logger.error("Audit log error:", err));

      if (user.loginAttempts >= 3) {
        // Block for 2 minutes
        user.loginLockUntil = new Date(Date.now() + 2 * 60 * 1000);
        await user.save();
        throw new Error(`auth.accountLocked:2`);
      }

      await user.save();
      throw new Error("error.invalidPassword");
    }

    // Reset login attempts on successful login
    if (user.loginAttempts && user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.loginLockUntil = null;
      await user.save();
    }

    // Generate tokens (persistence handled by login controller)
    const tokens = AuthService.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Persist login session fields in a single DB write.
   */
  static async persistLoginSession(
    userId: string,
    data: {
      refreshToken: string;
      clientIp: string;
      deviceId?: string;
      deviceType?: string;
      deviceToken?: string;
      rememberMe?: boolean;
    },
  ): Promise<void> {
    const updatePayload: Record<string, any> = {
      refreshToken: data.refreshToken,
      lastLoginAt: new Date(),
      lastLoginIp: data.clientIp,
      lastLoginDevice: data.deviceType || "web",
      deviceId: data.deviceId || null,
      deviceType: data.deviceType || null,
      deviceToken: data.deviceToken || null,
    };

    if (data.rememberMe !== undefined) {
      updatePayload.rememberMe = Boolean(data.rememberMe);
    }

    const result = await User.updateOne(
      { _id: userId },
      {
        $set: updatePayload,
      },
    );

    if (result.matchedCount === 0) {
      throw new Error("error.userNotFoundWhileSavingLoginSession");
    }

    if (result.modifiedCount === 0) {
      logger.warn(
        `[AdminAuthService.persistLoginSession] Session fields unchanged for user ${userId}`,
      );
    }
  }

  /**
   * Find admin by refresh token
   * Also accepts producers for token refresh
   */
  static async findAdminByRefreshToken(
    refreshToken: string,
  ): Promise<IUser | null> {
    try {
      jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (error) {
      return null;
    }

    const user = await User.findOne({ refreshToken });

    if (!user) {
      return null;
    }

    // Allow refresh token for admin, sub-admin, and producer roles
    const isValidUser =
      [Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER].includes(user?.role as any) ||
      ["ADMIN", "ADMIN_SUB_USER", "PRODUCER"].includes(user?.role as any);
    if (!isValidUser) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return user;
  }

  /**
   * Generate password reset token
   * Creates a JWT token with configurable expiry
   */
  static generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: "password-reset" },
      config.jwt.resetPasswordSecret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: config.jwt.resetPasswordExpiresIn as any },
    );
  }

  /**
   * Verify password reset token
   * Returns userId if valid, null otherwise
   */
  static verifyPasswordResetToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, config.jwt.resetPasswordSecret) as {
        sub: string;
        type: string;
      };
      if (decoded.type !== "password-reset") {
        return null;
      }
      return decoded.sub;
    } catch (error) {
      logger.error("Password reset token verification failed:", error);
      return null;
    }
  }

  /**
   * Request password reset
   * Generates reset token and sends email with reset link
   * Allows admins, sub-admins, and producers to reset password
   * Note: Email sending failures don't block the reset process
   */
  static async requestPasswordReset(
    email: string,
    req?: Request,
  ): Promise<{ success: boolean; resetLink: string }> {
    // Validate email input is not empty
    if (!email) {
      throw new Error("error.emailIsRequired");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("error.invalidEmailFormat");
    }

    try {
      // Find user by email address
      const user = await User.findOne({ email });

      // Throw error if user email does not exist
      if (!user) {
        logger.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
        throw new Error("auth.emailNotFound");
      }

      // Verify user is authorized to reset password (must be admin, sub-admin, or producer)
      const isValidUser =
        [Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER].includes(user.role as any) ||
        ["ADMIN", "ADMIN_SUB_USER", "PRODUCER"].includes(user.role as any);
      if (!isValidUser) {
        logger.warn(`Password reset requested for invalid user role: ${email}`);
        throw new Error("auth.emailNotFound");
      }

      // Generate JWT reset token with expiry
      const resetToken = this.generatePasswordResetToken(user._id.toString());

      // Dynamically resolve frontend base URL based on incoming request origin/domain
      const baseUrl = getAdminBaseUrl(req);

      // Build reset link URL that user will click in email
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      // Fetch email template from database for "forgot password" emails
      const emailTemplate = await EmailTemplate.findOne({
        keyword: "FORGOT_PASSWORD",
        status: "active",
      });

      const userName = user.firstName || user.fullName || "User";

      let emailSubject = "Reset Your Uthsava Admin Password";
      let emailBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="margin-bottom: 24px; text-align: center;">
            <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">Uthsava Admin Portal</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
          </div>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your Uthsava Admin account (<code>${user.email}</code>). Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #e11d48, #be123c); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">Reset My Password</a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If the button above does not work, copy and paste this link into your web browser:</p>
          <p style="word-break: break-all; font-size: 13px;"><a href="${resetLink}" style="color: #e11d48; text-decoration: underline;">${resetLink}</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">This password reset link is valid for ${config.jwt.resetPasswordExpiresIn || "1 hour"}. If you did not request this password reset, please ignore this email or contact support if you suspect unauthorized access.</p>
        </div>
      `;

      if (emailTemplate) {
        if (emailTemplate.subject) {
          emailSubject = emailTemplate.subject;
        }
        if (emailTemplate.description) {
          emailBody = emailTemplate.description;
        }

        // Replace template placeholders in subject
        emailSubject = emailSubject
          .replaceAll("{{Platform Name}}", "Uthsava")
          .replaceAll("{{platformName}}", "Uthsava")
          .replaceAll("{{Platform_Name}}", "Uthsava")
          .replaceAll("{{userName}}", userName)
          .replaceAll("{{User Name}}", userName)
          .replaceAll("{{name}}", userName);

        // Replace template placeholders in body
        emailBody = emailBody.replaceAll("{{userName}}", userName);
        emailBody = emailBody.replaceAll("{{User Name}}", userName);
        emailBody = emailBody.replaceAll("{{name}}", userName);
        emailBody = emailBody.replaceAll("{{userEmail}}", user.email || "");
        emailBody = emailBody.replaceAll("{{email}}", user.email || "");
        emailBody = emailBody.replaceAll("{{Email}}", user.email || "");
        emailBody = emailBody.replaceAll("{{resetLink}}", resetLink);
        emailBody = emailBody.replaceAll("{{Reset Link}}", resetLink);
        emailBody = emailBody.replaceAll("{{expiryTime}}", config.jwt.resetPasswordExpiresIn);
        emailBody = emailBody.replaceAll("{{Expiry Duration}}", config.jwt.resetPasswordExpiresIn);
      }

      // Send email - silently catch if SMTP is unavailable so it doesn't crash the request
      try {
        console.log("\n========================================================");
        console.log("🔑 [PASSWORD RESET LINK GENERATED]");
        console.log("📧 Recipient:", user.email);
        console.log("🔗 Reset Link:", resetLink);
        console.log("========================================================\n");

        await sendMail(user.email || "admin@example.com", emailSubject, emailBody);
      } catch (emailError) {
        logger.warn("Failed to send password reset email via SMTP:", emailError);
      }

      // Return success and resetLink for development/testing
      return {
        success: true,
        resetLink,
      };
    } catch (error) {
      logger.error("Password reset request failed:", error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * Validates token and updates user password
   * Invalidates all existing sessions when password is reset
   * Allows admins, sub-admins, and producers to reset password
   *
   * SRS Requirement: Password reset through forgot password also logs out from all devices
   */
  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    if (!token) {
      throw new Error("error.tokenIsRequired");
    }
    if (!newPassword) {
      throw new Error("error.passwordIsRequired");
    }

    try {
      // Verify token
      const userId = this.verifyPasswordResetToken(token);

      if (!userId) {
        throw new Error("error.invalidOrExpiredResetToken");
      }

      // Find user
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("error.userNotFound");
      }

      // Check if user is admin, sub-admin, or producer
      const isValidUser =
        [Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER].includes(user.role as any) ||
        ["ADMIN", "ADMIN_SUB_USER", "PRODUCER"].includes(user.role as any);
      if (!isValidUser) {
        throw new Error("Unauthorized");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and invalidate all refresh tokens (logout from all devices)
      user.password = hashedPassword;
      (user as any).refreshToken = undefined; // Clear refresh token to force logout from all devices
      const appUser = user as unknown as IUser;
      appUser.deviceToken = undefined; // Clear device token
      appUser.deviceType = undefined; // Clear device type
      appUser.deviceId = undefined; // Clear device ID

      await user.save();

      logger.info(
        `Password reset successful and all sessions invalidated for user: ${user.email}`,
      );
      return true;
    } catch (error) {
      logger.error("Password reset failed:", error);
      throw error;
    }
  }

  /**
   * Update admin profile
   * Updates user profile information
   */
  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; profileImage?: string },
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("error.userNotFound");
    }

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.firstName || data.lastName) {
      user.fullName = `${user.firstName} ${user.lastName}`.trim();
    }
    if (data.profileImage !== undefined) {
      if (!data.profileImage) {
        // Empty string means the user removed the profile image
        user.profileImage = "";
      } else if (data.profileImage.startsWith(config.aws.cloudFrontUrl)) {
        user.profileImage = data.profileImage.replace(
          `${config.aws.cloudFrontUrl}/`,
          "",
        );
      } else {
        user.profileImage = data.profileImage;
      }
    }

    await user.save();

    // Return full URL for profile image
    const userToReturn = user.toObject();
    if (
      userToReturn.profileImage &&
      !userToReturn.profileImage.startsWith("http")
    ) {
      userToReturn.profileImage = `${config.aws.cloudFrontUrl}/${userToReturn.profileImage}`;
    }

    return userToReturn;
  }

  /**
   * Change password
   * Verifies old password and updates with new password
   * Invalidates all existing sessions (logout from all devices)
   *
   * SRS Requirement: When password is changed, admin is logged out from all devices
   */
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    if (!newPassword) {
      throw new Error("error.newPasswordIsRequired");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new Error("error.userNotFound");
    }

    // Verify old password
    const isValidPassword = await AuthService.validatePassword(
      user,
      oldPassword,
    );
    if (!isValidPassword) {
      throw new Error("error.invalidOldPassword");
    }

    if (!user.password) {
      throw new Error("error.userPasswordNotFound");
    }

    // Check if the new password is the same as the current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new Error("error.newPasswordSameAsCurrent");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and invalidate all refresh tokens (logout from all devices)
    user.password = hashedPassword;
    (user as any).refreshToken = undefined; // Clear refresh token to force logout from all devices
    const appUser = user as unknown as IUser;
    appUser.deviceToken = undefined; // Clear device token
    appUser.deviceType = undefined; // Clear device type
    appUser.deviceId = undefined; // Clear device ID

    // Clear password expiry fields
    const anyUser = user as any;
    anyUser.passwordExpiryDate = null;
    anyUser.passwordExpiryDays = null;
    anyUser.isPasswordExpired = false;

    await user.save();

    logger.info(
      `Password changed and all sessions invalidated for user: ${user.email}`,
    );
    return true;
  }
}

export default AdminAuthService;
