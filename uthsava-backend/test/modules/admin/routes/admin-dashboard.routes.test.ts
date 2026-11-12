import request from "supertest";
import express from "express";
import dashboardRoutes from "../../../../src/modules/admin/routes/dashboard.routes";
import { getDashboardStats } from "../../../../src/modules/admin/controllers/dashboard.controller";

jest.mock("../../../../src/modules/admin/controllers/dashboard.controller", () => ({
  getDashboardStats: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Dashboard Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/dashboard", dashboardRoutes);
  });

  it("GET /dashboard/stats routes to getDashboardStats", async () => {
    await request(app).get("/dashboard/stats");
    expect(getDashboardStats).toHaveBeenCalled();
  });
});
