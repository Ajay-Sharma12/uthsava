import { requireSubAdminPermission } from "../../../src/core/middleware/subadmin-permission.middleware";
import { User, SubAdminActivity } from "../../../src/models";
import { RoleModel } from "../../../src/models/role.model";
import { Role } from "../../../src/common/types/auth.types";

jest.mock("../../../src/models", () => ({
  User: {
    findById: jest.fn(),
  },
  SubAdminActivity: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../../src/models/role.model", () => ({
  RoleModel: {
    findOne: jest.fn(),
  },
}));

describe("SubAdmin Permission Middleware Unit Tests", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: "GET",
      originalUrl: "/api/v1/admin/contents",
      ip: "127.0.0.1",
      headers: {},
      user: {
        sub: "507f1f77bcf86cd799439011",
        role: Role.ADMIN_SUB_USER,
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
      once: jest.fn(),
    };
    next = jest.fn();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should grant immediate access to super admin (Role.ADMIN)", async () => {
    req.user.role = Role.ADMIN;
    const middleware = requireSubAdminPermission("contents");

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("[Positive] should grant access to sub-admin with valid module view permission", async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: Role.ADMIN_SUB_USER,
        status: "active",
        refreshToken: "token123",
        permissions: {
          contents: { view: true, create: false, edit: false, delete: false },
        },
      }),
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("[Positive] should grant access for POST when module.all is true and record activity", async () => {
    req.method = "POST";
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: Role.ADMIN_SUB_USER,
        status: "active",
        refreshToken: "token123",
        permissions: {
          contents: { all: true },
        },
      }),
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.once).toHaveBeenCalled();
  });

  it("[Positive] should resolve producer permissions from database RoleModel", async () => {
    req.user.role = Role.PRODUCER;
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: Role.PRODUCER,
        status: "active",
        refreshToken: "token123",
      }),
    });

    (RoleModel.findOne as jest.Mock).mockResolvedValue({
      name: "producer",
      permissions: {
        contents: { view: true },
      },
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  /* =========================================================================
   * NEGATIVE & VALIDATION TEST CASES
   * ========================================================================= */
  it("[Negative] should return 403 Forbidden if req.user is missing", async () => {
    delete req.user;
    const middleware = requireSubAdminPermission("contents");

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("[Negative] should return 403 Forbidden if user is not found in database", async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("[Negative] should return 403 Forbidden if sub-admin user is inactive", async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        status: "inactive",
        refreshToken: "token123",
      }),
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("[Negative] should return PERMISSION_DENIED 403 if sub-admin lacks requested permission", async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: Role.ADMIN_SUB_USER,
        status: "active",
        refreshToken: "token123",
        permissions: {
          contents: { view: false, create: false },
        },
      }),
    });

    const middleware = requireSubAdminPermission("contents", "create");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "PERMISSION_DENIED",
        action: "create",
      })
    );
  });

  /* =========================================================================
   * EDGE CASES
   * ========================================================================= */
  it("[Edge] should return 500 Internal Server Error if database query throws an exception", async () => {
    (User.findById as jest.Mock).mockImplementation(() => {
      throw new Error("Database connection error");
    });

    const middleware = requireSubAdminPermission("contents");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});
