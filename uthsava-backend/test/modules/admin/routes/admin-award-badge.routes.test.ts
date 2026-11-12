import request from "supertest";
import express from "express";
import awardBadgeRoutes from "../../../../src/modules/admin/routes/award-badge.routes";
import { listAwardBadges, createAwardBadge, getAwardBadgeById, updateAwardBadge, updateAwardBadgeStatus } from "../../../../src/modules/admin/controllers/award-badge.controller";

jest.mock("../../../../src/modules/admin/controllers/award-badge.controller", () => ({
  listAwardBadges: jest.fn((req, res) => res.status(200).json({ success: true })),
  createAwardBadge: jest.fn((req, res) => res.status(201).json({ success: true })),
  getAwardBadgeById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateAwardBadge: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateAwardBadgeStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
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
app.use("/api/v1/admin/award-badges", awardBadgeRoutes);

describe("Admin AwardBadge Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/admin/award-badges should route to listAwardBadges", async () => {
    const res = await request(app).get("/api/v1/admin/award-badges");
    expect(res.status).toBe(200);
    expect(listAwardBadges).toHaveBeenCalled();
  });

  it("POST /api/v1/admin/award-badges should route to createAwardBadge", async () => {
    const res = await request(app).post("/api/v1/admin/award-badges").send({});
    expect(res.status).toBe(201);
    expect(createAwardBadge).toHaveBeenCalled();
  });

  it("GET /api/v1/admin/award-badges/:awardBadgeId should route to getAwardBadgeById", async () => {
    const res = await request(app).get("/api/v1/admin/award-badges/123");
    expect(res.status).toBe(200);
    expect(getAwardBadgeById).toHaveBeenCalled();
  });

  it("PUT /api/v1/admin/award-badges/:awardBadgeId should route to updateAwardBadge", async () => {
    const res = await request(app).put("/api/v1/admin/award-badges/123").send({});
    expect(res.status).toBe(200);
    expect(updateAwardBadge).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/award-badges/:awardBadgeId/status should route to updateAwardBadgeStatus", async () => {
    const res = await request(app).patch("/api/v1/admin/award-badges/123/status").send({});
    expect(res.status).toBe(200);
    expect(updateAwardBadgeStatus).toHaveBeenCalled();
  });
});
