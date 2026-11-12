import request from "supertest";
import express from "express";
import authRoutes from "../../../../src/modules/admin/routes/auth.routes";
import { login, refreshToken, getProfile, logout, forgotPassword, verifyResetToken, resetPassword, updateProfile, changePassword } from "../../../../src/modules/admin/controllers/auth.controller";

jest.mock("../../../../src/modules/admin/controllers/auth.controller", () => ({
  login: jest.fn((req, res) => res.status(200).json({ success: true })),
  refreshToken: jest.fn((req, res) => res.status(200).json({ success: true })),
  getProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  logout: jest.fn((req, res) => res.status(200).json({ success: true })),
  forgotPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  verifyResetToken: jest.fn((req, res) => res.status(200).json({ success: true })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  changePassword: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  adminInactivityTimeout: jest.fn((req, res, next) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/rateLimiter.middleware", () => ({
  loginRateLimiter: jest.fn((req, res, next) => next()),
  forgotPasswordRateLimiter: jest.fn((req, res, next) => next()),
}));

describe("Auth Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/auth", authRoutes);
  });

  it("POST /auth/login routes to login", async () => {
    await request(app).post("/auth/login").send({});
    expect(login).toHaveBeenCalled();
  });

  it("POST /auth/refresh-token routes to refreshToken", async () => {
    await request(app).post("/auth/refresh-token").send({});
    expect(refreshToken).toHaveBeenCalled();
  });

  it("GET /auth/profile routes to getProfile", async () => {
    await request(app).get("/auth/profile");
    expect(getProfile).toHaveBeenCalled();
  });

  it("POST /auth/logout routes to logout", async () => {
    await request(app).post("/auth/logout").send({});
    expect(logout).toHaveBeenCalled();
  });

  it("POST /auth/forgot-password routes to forgotPassword", async () => {
    await request(app).post("/auth/forgot-password").send({});
    expect(forgotPassword).toHaveBeenCalled();
  });

  it("POST /auth/verify-reset-token routes to verifyResetToken", async () => {
    await request(app).post("/auth/verify-reset-token").send({});
    expect(verifyResetToken).toHaveBeenCalled();
  });

  it("POST /auth/reset-password routes to resetPassword", async () => {
    await request(app).post("/auth/reset-password").send({});
    expect(resetPassword).toHaveBeenCalled();
  });

  it("PUT /auth/profile routes to updateProfile", async () => {
    await request(app).put("/auth/profile").send({});
    expect(updateProfile).toHaveBeenCalled();
  });

  it("POST /auth/change-password routes to changePassword", async () => {
    await request(app).post("/auth/change-password").send({});
    expect(changePassword).toHaveBeenCalled();
  });
});
