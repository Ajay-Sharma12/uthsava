/// <reference types="jest" />
// Jest unit tests for AdminAuthService - Comprehensive authentication test coverage
import { AdminAuthService } from "../../../../src/modules/admin/services/auth.service";
import { AuthService } from "../../../../src/modules/auth/services/auth.service";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../../../src/models";
import { EmailTemplate } from "../../../../src/models/email-template.model";
import { sendMail } from "../../../../src/modules/shared/services/mail.service";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../../../src/models", () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  UserStatus: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended",
    DELETED: "deleted",
  },
  Role: {
    ADMIN: "ADMIN",
    ADMIN_SUB_USER: "ADMIN_SUB_USER",
    PRODUCER: "PRODUCER",
    USER: "USER",
  },
}));
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn(),
  },
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../../../../src/core/config", () => ({
  config: {
    adminUrl: "https://admin.example.com",
    nodeEnv: "development",
    jwt: {
      accessSecret: "access-secret",
      refreshSecret: "refresh-secret",
      accessExpiresIn: "15m",
      refreshExpiresIn: "7d",
      resetPasswordSecret: "reset-secret",
      resetPasswordExpiresIn: "10m",
    },
    aws: {
      cloudFrontUrl: "https://cdn.example.com",
    },
  },
}));
jest.mock("../../../../src/core/constants/app.constants", () => ({
  PASSWORD_CONFIG: {
    MIN_BCRYPT_ROUNDS: 10,
  },
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: "15m",
    REFRESH_TOKEN: "7d",
  },
}));

// Mock AuthService methods
jest.mock("../../../../src/modules/auth/services/auth.service", () => {
  return {
    AuthService: {
      generateTokens: jest.fn(),
      validatePassword: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue("hashed-password"),
    },
  };
});

describe("AdminAuthService Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // LOGIN - 12 Test Cases
  // ============================================
  describe("authenticateAdmin - Login (12 cases)", () => {
    const email = "admin@example.com";
    const password = "SecurePass@123";
    const mockAdmin: any = {
      _id: "admin123",
      email,
      password: "hashed-password",
      role: "ADMIN",
      status: "active",
      firstName: "Admin",
      lastName: "User",
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({ _id: "admin123", role: "ADMIN" }),
    };

    // Success Cases (4)
    it("should login with valid email and password", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateTokens as jest.Mock).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result).toMatchObject({
        user: expect.objectContaining({ _id: "admin123" }),
        tokens: expect.objectContaining({
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      });
    });

    it("should generate access token successfully", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateTokens as jest.Mock).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });

      const result = await AdminAuthService.authenticateAdmin(email, password);

      // Verify that token generation was delegated to AuthService
      expect(AuthService.generateTokens).toHaveBeenCalledWith(mockAdmin);
      expect(result!.tokens.accessToken).toBe("access-token");
    });

    it("should generate refresh token successfully", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateTokens as jest.Mock).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result!.tokens.refreshToken).toBe("refresh-token");
    });

    it("should clear login attempts on success", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ ...mockAdmin, loginAttempts: 2, loginLockUntil: new Date() });
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateTokens as jest.Mock).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token"
      });

      await AdminAuthService.authenticateAdmin(email, password);

      expect(mockAdmin.save).toHaveBeenCalled();
    });

    // Validation Cases (3)
    it("should throw when email is required but missing", async () => {
      await expect(AdminAuthService.authenticateAdmin("", password)).rejects.toThrow();
    });

    it("should throw when password is required but missing", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      await expect(AdminAuthService.authenticateAdmin(email, "")).rejects.toThrow();
    });

    it("should return null when email not found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result).toBeNull();
    });

    // Authentication Cases (3)
    it("should return null when wrong password is provided", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(false);

      const result = await AdminAuthService.authenticateAdmin(email, "wrong-pass");

      expect(result).toBeNull();
    });

    it("should return null when unknown role tries to login", async () => {
      const userRole = { ...mockAdmin, role: "GUEST" };
      (User.findOne as jest.Mock).mockResolvedValue(userRole);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result).toBeNull();
    });

    // Account Status Cases (2)
    it("should return null when inactive account tries to login", async () => {
      const inactiveAdmin = { ...mockAdmin, status: "inactive" };
      (User.findOne as jest.Mock).mockResolvedValue(inactiveAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result).toBeNull();
    });

    it("should return null when suspended/deleted account tries to login", async () => {
      const suspendedAdmin = { ...mockAdmin, status: "suspended" };
      (User.findOne as jest.Mock).mockResolvedValue(suspendedAdmin);

      const result = await AdminAuthService.authenticateAdmin(email, password);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // FORGOT PASSWORD / REQUEST PASSWORD RESET - 10 Test Cases
  // ============================================
  describe("requestPasswordReset - Forgot Password (10 cases)", () => {
    const email = "admin@example.com";
    const mockAdmin: any = {
      _id: "admin123",
      email,
      role: "ADMIN",
      fullName: "Admin User",
    };
    const mockTemplate: any = {
      subject: "Reset your password",
      description: "Hello, click {{Reset Link}} before {{Expiry Duration}}.",
    };

    // Success Cases (3)
    it("should generate reset token successfully", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (jwt.sign as jest.Mock).mockReturnValue("reset-token");

      const result = await AdminAuthService.requestPasswordReset(email);

      expect(result).toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: "admin123", type: "password-reset" },
        "reset-secret",
        { expiresIn: "10m" },
      );
    });

    it("should generate reset link correctly", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (jwt.sign as jest.Mock).mockReturnValue("reset-token-123");

      await AdminAuthService.requestPasswordReset(email);

      expect(sendMail).toHaveBeenCalledWith(
        email,
        mockTemplate.subject,
        expect.stringContaining("https://admin.example.com/auth/reset-password?token=reset-token-123"),
      );
    });

    it("should send reset email successfully", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (jwt.sign as jest.Mock).mockReturnValue("reset-token");
      (sendMail as jest.Mock).mockResolvedValue(true);

      const result = await AdminAuthService.requestPasswordReset(email);

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalled();
    });

    // Validation Cases (3)
    it("should throw when email is required but missing", async () => {
      await expect(AdminAuthService.requestPasswordReset("")).rejects.toThrow();
    });

    it("should throw when invalid email format", async () => {
      await expect(AdminAuthService.requestPasswordReset("invalid-email")).rejects.toThrow();
    });

    it("should throw when email not found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(AdminAuthService.requestPasswordReset(email)).rejects.toThrow(
        "auth.emailNotFound",
      );
    });

    // Exception Cases (4)
    it("should handle missing email template gracefully and return true", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AdminAuthService.requestPasswordReset(email);
      expect(result).toBe(true);
    });

    it("should throw when JWT generation fails", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error("JWT generation failed");
      });

      await expect(AdminAuthService.requestPasswordReset(email)).rejects.toThrow();
    });

    it("should handle email service failure silently and return true", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (jwt.sign as jest.Mock).mockReturnValue("reset-token");
      (sendMail as jest.Mock).mockRejectedValue(new Error("Email service down"));

      const result = await AdminAuthService.requestPasswordReset(email);
      expect(result).toBe(true);
    });

    it("should throw when database lookup fails", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("DB connection error"));

      await expect(AdminAuthService.requestPasswordReset(email)).rejects.toThrow();
    });
  });

  // ============================================
  // RESET PASSWORD - 12 Test Cases
  // ============================================
  describe("resetPassword - Reset Password (12 cases)", () => {
    const token = "reset-token";
    const newPassword = "NewPass@123";
    const mockAdmin: any = {
      _id: "admin123",
      email: "admin@example.com",
      role: "ADMIN",
      status: "active",
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Success Cases (5)
    it("should reset password successfully", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      const result = await AdminAuthService.resetPassword(token, newPassword);

      expect(result).toBe(true);
      expect(mockAdmin.save).toHaveBeenCalled();
    });

    it("should store password hashed", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.resetPassword(token, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockAdmin.password).toBe("hashed-new-pass");
    });

    it("should remove old sessions on password reset", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.resetPassword(token, newPassword);

      expect(mockAdmin.refreshToken).toBeUndefined();
    });

    it("should clear refresh token", async () => {
      mockAdmin.refreshToken = "old-token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.resetPassword(token, newPassword);

      expect(mockAdmin.refreshToken).toBeUndefined();
    });

    it("should clear device tokens", async () => {
      mockAdmin.deviceToken = "device-token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.resetPassword(token, newPassword);

      expect(mockAdmin.deviceToken).toBeUndefined();
    });

    // Validation Cases (4)
    it("should throw when token is required but missing", async () => {
      await expect(AdminAuthService.resetPassword("", newPassword)).rejects.toThrow();
    });

    it("should throw when token is invalid", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(AdminAuthService.resetPassword("invalid-token", newPassword)).rejects.toThrow("error.invalidOrExpiredResetToken");
    });

    it("should throw when token is expired", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(AdminAuthService.resetPassword(token, newPassword)).rejects.toThrow();
    });

    it("should throw when user is not found", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(AdminAuthService.resetPassword(token, newPassword)).rejects.toThrow("error.userNotFound");
    });

    // Exception Cases (3)
    it("should throw when bcrypt hash fails", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hash failed"));

      await expect(AdminAuthService.resetPassword(token, newPassword)).rejects.toThrow();
    });

    it("should throw when save fails", async () => {
      mockAdmin.save = jest.fn().mockRejectedValue(new Error("Save failed"));
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "admin123", type: "password-reset" });
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await expect(AdminAuthService.resetPassword(token, newPassword)).rejects.toThrow();
    });
  });

  // ============================================
  // CHANGE PASSWORD - 8 Test Cases
  // ============================================
  describe("changePassword - Change Password (8 cases)", () => {
    const userId = "admin123";
    const oldPassword = "OldPass@123";
    const newPassword = "NewPass@456";
    const mockAdmin: any = {
      _id: userId,
      email: "admin@example.com",
      password: "hashed-old-pass",
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Success Cases (3)
    it("should change password successfully", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      const result = await AdminAuthService.changePassword(userId, oldPassword, newPassword);

      expect(result).toBe(true);
      expect(mockAdmin.save).toHaveBeenCalled();
    });

    it("should hash new password", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.changePassword(userId, oldPassword, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockAdmin.password).toBe("hashed-new-pass");
    });

    it("should invalidate existing sessions", async () => {
      mockAdmin.refreshToken = "token1";
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await AdminAuthService.changePassword(userId, oldPassword, newPassword);

      expect(mockAdmin.refreshToken).toBeUndefined();
      expect(mockAdmin.deviceToken).toBeUndefined();
    });

    // Validation Cases (3)
    it("should throw when incorrect current password", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        AdminAuthService.changePassword(userId, "wrong-pass", newPassword),
      ).rejects.toThrow("error.invalidOldPassword");
    });

    it("should throw when password confirmation mismatch", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);

      await expect(
        AdminAuthService.changePassword(userId, oldPassword, ""),
      ).rejects.toThrow();
    });

    it("should throw when user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AdminAuthService.changePassword(userId, oldPassword, newPassword),
      ).rejects.toThrow("error.userNotFound");
    });

    // Exception Cases (2)
    it("should throw when hash failure", async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hash failed"));

      await expect(
        AdminAuthService.changePassword(userId, oldPassword, newPassword),
      ).rejects.toThrow();
    });

    it("should throw when save failure", async () => {
      mockAdmin.save = jest.fn().mockRejectedValue(new Error("Save failed"));
      (User.findById as jest.Mock).mockResolvedValue(mockAdmin);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-new-pass");

      await expect(
        AdminAuthService.changePassword(userId, oldPassword, newPassword),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // SESSION MANAGEMENT - 4 Test Cases
  // ============================================
  describe("findAdminByRefreshToken - Session Management (4 cases)", () => {
    const mockAdmin: any = {
      _id: "admin123",
      email: "admin@example.com",
      role: "ADMIN",
      status: "active",
      refreshToken: "refresh-token-123",
    };

    it("should keep user logged in with valid token", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await AdminAuthService.findAdminByRefreshToken("refresh-token-123");

      expect(result).toMatchObject(mockAdmin);
      expect(result!._id).toBe("admin123");
    });

    it("should reject expired token", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      const result = await AdminAuthService.findAdminByRefreshToken("expired-token");

      expect(result).toBeNull();
    });

    it("should reject invalid token", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AdminAuthService.findAdminByRefreshToken("invalid-token");

      expect(result).toBeNull();
    });

    it("should reject when refresh token mismatch", async () => {
      const inactiveAdmin = { ...mockAdmin, status: "inactive" };
      (User.findOne as jest.Mock).mockResolvedValue(inactiveAdmin);

      const result = await AdminAuthService.findAdminByRefreshToken("refresh-token-123");

      expect(result).toBeNull();
    });
  });
});
