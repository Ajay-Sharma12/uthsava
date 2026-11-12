/// <reference types="jest" />
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticate, authorize, adminInactivityTimeout } from "../../../src/core/middleware/auth.middleware";
import { User, UserStatus } from "../../../src/models";
import { Role } from "../../../src/common/types/auth.types";

// Mock jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

// Mock User model
jest.mock("../../../src/models", () => {
  const mockUserInstance = {
    _id: "userId123",
    status: "ACTIVE",
    refreshToken: "token123",
    role: "USER",
    isActionRequired: false,
    lastActiveAt: new Date(),
  };
  return {
    User: {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
    UserStatus: {
      ACTIVE: "ACTIVE",
      INACTIVE: "INACTIVE",
    },
  };
});

describe("Auth Middleware Unit Tests", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  const mockResponse = () => {
    const response: any = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
    req = {
      headers: {},
    } as unknown as Request;
  });

  /* =========================================================================
   * authenticate MIDDLEWARE TESTS
   * ========================================================================= */
  describe("authenticate", () => {
    it("[Positive] should authenticate successfully with valid authorization header", async () => {
      req.headers.authorization = "Bearer valid_token";
      const mockPayload = { sub: "userId123", role: Role.USER };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        status: UserStatus.ACTIVE,
        refreshToken: "token123",
        role: Role.USER,
        isActionRequired: false,
      });

      await authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith("userId123");
      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
    });

    it("[Negative] should fail if Authorization header is missing", async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail if Authorization header doesn't start with 'Bearer '", async () => {
      req.headers.authorization = "Basic basic_token";
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail if token verification fails", async () => {
      req.headers.authorization = "Bearer invalid_token";
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail if user does not exist in DB", async () => {
      req.headers.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "userId123" });
      (User.findById as jest.Mock).mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
        code: "SESSION_EXPIRED",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail if user has no refreshToken (session expired)", async () => {
      req.headers.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "userId123" });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        status: UserStatus.ACTIVE,
        refreshToken: null,
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session expired",
        code: "SESSION_EXPIRED",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail and deactivate session if user is not ACTIVE", async () => {
      req.headers.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "userId123" });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        status: UserStatus.INACTIVE,
        refreshToken: "token123",
      });

      await authenticate(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("userId123", expect.objectContaining({
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
      }));
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account deactivated",
        code: "ACCOUNT_INACTIVE",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should fail and clear token if permissions updated (isActionRequired)", async () => {
      req.headers.authorization = "Bearer valid_token";
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "userId123" });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        status: UserStatus.ACTIVE,
        refreshToken: "token123",
        role: Role.ADMIN_SUB_USER,
        isActionRequired: true,
      });

      await authenticate(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("userId123", {
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Your permissions have been updated by an administrator. Please sign in again.",
        code: "SESSION_INVALIDATED",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * authorize MIDDLEWARE TESTS
   * ========================================================================= */
  describe("authorize", () => {
    it("[Positive] should call next() if user role is in the allowed roles", () => {
      req.user = { sub: "user123", role: Role.ADMIN };
      const middleware = authorize([Role.ADMIN]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("[Negative] should return 403 Forbidden if req.user is missing", () => {
      const middleware = authorize([Role.ADMIN]);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Negative] should return 403 Forbidden if user role is not allowed", () => {
      req.user = { sub: "user123", role: Role.USER };
      const middleware = authorize([Role.ADMIN]);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * adminInactivityTimeout MIDDLEWARE TESTS
   * ========================================================================= */
  describe("adminInactivityTimeout", () => {
    it("[Positive] should proceed if user is not logged in (no req.user)", async () => {
      await adminInactivityTimeout(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("[Positive] should proceed and update lastActiveAt if inactivity duration is within timeout", async () => {
      req.user = { sub: "userId123", role: Role.USER };
      const lastActiveAt = new Date(Date.now() - 5000); // 5 seconds ago
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        lastActiveAt,
      });

      await adminInactivityTimeout(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("[Negative] should expire session if inactive for more than the timeout duration", async () => {
      req.user = { sub: "userId123", role: Role.USER };
      // 31 minutes ago (timeout is 30 mins)
      const lastActiveAt = new Date(Date.now() - 31 * 60 * 1000);
      (User.findById as jest.Mock).mockResolvedValue({
        _id: "userId123",
        lastActiveAt,
      });

      await adminInactivityTimeout(req, res, next);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("userId123", {
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
        deviceId: null,
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session expired due to inactivity",
        code: "SESSION_TIMEOUT",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("[Edge] should call next() if database findById fails or throws", async () => {
      req.user = { sub: "userId123", role: Role.USER };
      (User.findById as jest.Mock).mockRejectedValue(new Error("DB error"));

      await adminInactivityTimeout(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
