import request from "supertest";
import express from "express";
import couponRoutes from "../../../../src/modules/admin/routes/coupon.routes";
import { listCoupons, createCoupon, getCouponById, updateCoupon, updateCouponStatus, assignUsersToCoupon } from "../../../../src/modules/admin/controllers/coupon.controller";

jest.mock("../../../../src/modules/admin/controllers/coupon.controller", () => ({
  listCoupons: jest.fn((req, res) => res.status(200).json({ success: true })),
  createCoupon: jest.fn((req, res) => res.status(201).json({ success: true })),
  getCouponById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateCoupon: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateCouponStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  assignUsersToCoupon: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

const app = express();
app.use(express.json());
app.use("/api/v1/admin/coupons", couponRoutes);

describe("Admin Coupon Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/admin/coupons should route to listCoupons", async () => {
    const res = await request(app).get("/api/v1/admin/coupons");
    expect(res.status).toBe(200);
    expect(listCoupons).toHaveBeenCalled();
  });

  it("POST /api/v1/admin/coupons should route to createCoupon", async () => {
    const res = await request(app).post("/api/v1/admin/coupons").send({});
    expect(res.status).toBe(201);
    expect(createCoupon).toHaveBeenCalled();
  });

  it("GET /api/v1/admin/coupons/:couponId should route to getCouponById", async () => {
    const res = await request(app).get("/api/v1/admin/coupons/123");
    expect(res.status).toBe(200);
    expect(getCouponById).toHaveBeenCalled();
  });

  it("PUT /api/v1/admin/coupons/:couponId should route to updateCoupon", async () => {
    const res = await request(app).put("/api/v1/admin/coupons/123").send({});
    expect(res.status).toBe(200);
    expect(updateCoupon).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/coupons/:couponId/status should route to updateCouponStatus", async () => {
    const res = await request(app).patch("/api/v1/admin/coupons/123/status").send({});
    expect(res.status).toBe(200);
    expect(updateCouponStatus).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/coupons/:couponId/assign-users should route to assignUsersToCoupon", async () => {
    const res = await request(app).patch("/api/v1/admin/coupons/123/assign-users").send({});
    expect(res.status).toBe(200);
    expect(assignUsersToCoupon).toHaveBeenCalled();
  });
});
