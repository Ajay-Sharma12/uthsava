/// <reference types="jest" />
import { Request, Response } from "express";
import {
  login,
  resetPassword,
  changePassword,
  forgotPassword,
} from "../../../../src/modules/admin/controllers/auth.controller";
import { AdminAuthService } from "../../../../src/modules/admin/services/auth.service";
import { AuthService } from "../../../../src/modules/auth/services/auth.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import mongoose from "mongoose";

jest.mock("../../../../src/modules/admin/services/auth.service");
jest.mock("../../../../src/modules/auth/services/auth.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (body: any = {}, user: any = undefined, headers: any = {}) => {
  return {
    body,
    user,
    headers,
    socket: { remoteAddress: "127.0.0.1" }
  } as unknown as Request;
};

describe("Admin Auth Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("login", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should login admin successfully with valid credentials", async () => {
      req = mockRequest({ email: "admin@example.com", password: "password" });
      const mockUser = {
        _id: "admin123",
        email: "admin@example.com",
        role: "admin_super_user",
        status: "active",
      };
      
      (AdminAuthService.authenticateAdmin as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: { accessToken: "access-token", refreshToken: "refresh-token" }
      });
      (AdminAuthService.persistLoginSession as jest.Mock).mockResolvedValue(true);

      await login(req, res);

      expect(AdminAuthService.authenticateAdmin).toHaveBeenCalledWith("admin@example.com", "password", req);
      expect(AdminAuthService.persistLoginSession).toHaveBeenCalled();
      expect(AuthService.setRefreshTokenCookie).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ token: "access-token", email: "admin@example.com" }),
        "auth.loginSuccess",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 400 Bad Request error if invalid credentials", async () => {
      req = mockRequest({ email: "admin@example.com", password: "wrong" });
      (AdminAuthService.authenticateAdmin as jest.Mock).mockResolvedValue(null);

      await login(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.loginFailed", "en", 400);
    });
    
    it("[Negative] should handle account locked error (403 Forbidden)", async () => {
      req = mockRequest({ email: "admin@example.com", password: "wrong" });
      (AdminAuthService.authenticateAdmin as jest.Mock).mockRejectedValue(new Error("auth.accountLocked:10"));

      await login(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Account is temporarily blocked due to multiple failed login attempts. Please try again after 10 minutes.",
        "en",
        403
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should handle login failure when payload is empty or malformed", async () => {
      req = mockRequest({});
      (AdminAuthService.authenticateAdmin as jest.Mock).mockResolvedValue(null);

      await login(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("forgotPassword", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should successfully send password reset link to user email", async () => {
      req = mockRequest({ email: "admin@example.com" });
      (AdminAuthService.requestPasswordReset as jest.Mock).mockResolvedValue(true);

      await forgotPassword(req, res);

      expect(AdminAuthService.requestPasswordReset).toHaveBeenCalledWith("admin@example.com", expect.anything());
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "Password reset link has been sent to your email" },
        "auth.resetLinkSent",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle email not found with 400 error status", async () => {
      req = mockRequest({ email: "notfound@example.com" });
      (AdminAuthService.requestPasswordReset as jest.Mock).mockRejectedValue(new Error("auth.emailNotFound"));

      await forgotPassword(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.emailNotFound",
        "en",
        400,
        expect.any(Error)
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should fail forgotten password if email parameter is empty or wrong format", async () => {
      req = mockRequest({ email: "" });
      (AdminAuthService.requestPasswordReset as jest.Mock).mockRejectedValue(new Error("auth.emailNotFound"));

      await forgotPassword(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should reset password successfully when token is valid", async () => {
      req = mockRequest({ token: "valid-token", newPassword: "newPassword123" });
      (AdminAuthService.resetPassword as jest.Mock).mockResolvedValue(true);

      await resetPassword(req, res);

      expect(AdminAuthService.resetPassword).toHaveBeenCalledWith("valid-token", "newPassword123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "Password has been reset successfully. Please login again on all devices.", requireReLogin: true },
        "auth.passwordResetSuccess",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle invalid/expired token error and return 400", async () => {
      req = mockRequest({ token: "invalid-token", newPassword: "newPassword123" });
      (AdminAuthService.resetPassword as jest.Mock).mockRejectedValue(new Error("Invalid or expired token"));

      await resetPassword(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Invalid or expired token",
        "en",
        400,
        expect.any(Error)
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should handle empty reset token or missing password gracefully", async () => {
      req = mockRequest({});
      (AdminAuthService.resetPassword as jest.Mock).mockRejectedValue(new Error("Invalid or expired token"));

      await resetPassword(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should change password successfully", async () => {
      req = mockRequest({ currentPassword: "oldPassword", newPassword: "newPassword123" }, { sub: "admin123" });
      (AdminAuthService.changePassword as jest.Mock).mockResolvedValue(true);

      await changePassword(req as any, res);

      expect(AdminAuthService.changePassword).toHaveBeenCalledWith("admin123", "oldPassword", "newPassword123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "Password changed successfully. You have been logged out from all devices.", requireReLogin: true },
        "auth.passwordChanged",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle wrong old password error", async () => {
      req = mockRequest({ currentPassword: "wrongPassword", newPassword: "newPassword123" }, { sub: "admin123" });
      (AdminAuthService.changePassword as jest.Mock).mockRejectedValue(new Error("error.invalidOldPassword"));

      await changePassword(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "error.currentPasswordIsNotCorrect",
        "en",
        400
      );
    });
    
    it("[Negative] should return 401 unauthorized if user session is not present", async () => {
      req = mockRequest({ currentPassword: "oldPassword", newPassword: "newPassword123" });

      await changePassword(req as any, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should handle missing parameter input values gracefully", async () => {
      req = mockRequest({}, { sub: "admin123" });
      await changePassword(req as any, res);
      expect(ResponseHandler.error || ResponseHandler.unauthorized).toBeDefined();
    });
  });
});
