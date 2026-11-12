import express from "express";
import request from "supertest";
import adminRoutes from "../../../src/modules/admin/admin.routes";

// We mock the middleware to allow routes to pass through
jest.mock("../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  adminInactivityTimeout: jest.fn((req, res, next) => next()),
}));

jest.mock("../../../src/core/middleware/subadmin-permission.middleware", () => ({
  requireSubAdminPermission: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock the sub-routers so we don't need to load their full dependencies
jest.mock("../../../src/modules/admin/routes/auth.routes", () => {
  const router = express.Router();
  router.get("/test", (req, res) => res.status(200).json({ route: "auth" }));
  return { __esModule: true, default: router };
});

jest.mock("../../../src/modules/admin/routes/util.routes", () => {
  const router = express.Router();
  router.get("/test", (req, res) => res.status(200).json({ route: "utils" }));
  return { __esModule: true, default: router };
});

describe("Admin Master Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Mount the admin router
    app.use("/api/v1/admin", adminRoutes);
  });

  it("should mount the auth routes correctly", async () => {
    const res = await request(app).get("/api/v1/admin/auth/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "auth" });
  });

  it("should mount the utils routes correctly with middlewares", async () => {
    const res = await request(app).get("/api/v1/admin/utils/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "utils" });
  });

  it("should return 404 for unknown routes on the admin router", async () => {
    const res = await request(app).get("/api/v1/admin/unknown-route");
    expect(res.status).toBe(404);
  });
});
