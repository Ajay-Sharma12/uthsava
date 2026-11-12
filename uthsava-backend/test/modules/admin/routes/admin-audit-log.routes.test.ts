import request from "supertest";
import express from "express";
import { listAuditLogs, getAuditLogById } from "../../../../src/modules/admin/controllers/audit-log.controller";
import auditLogRoutes from "../../../../src/modules/admin/routes/audit-log.routes";

// Mock the controller methods to test express routing isolated from controller logic
jest.mock("../../../../src/modules/admin/controllers/audit-log.controller", () => ({
  listAuditLogs: jest.fn((req, res) => res.status(200).json({ success: true, route: "listLogs" })),
  getAuditLogById: jest.fn((req, res) => res.status(200).json({ success: true, route: "getLogById" })),
}));

const app = express();
app.use(express.json());
app.use("/api/v1/admin/audit-logs", auditLogRoutes);

describe("Admin Audit Log Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] GET /api/v1/admin/audit-logs should route to listAuditLogs successfully", async () => {
    const res = await request(app).get("/api/v1/admin/audit-logs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, route: "listLogs" });
    expect(listAuditLogs).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/admin/audit-logs/:logId should route to getAuditLogById successfully", async () => {
    const res = await request(app).get("/api/v1/admin/audit-logs/12345");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, route: "getLogById" });
    expect(getAuditLogById).toHaveBeenCalled();
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] POST /api/v1/admin/audit-logs should return 404 because POST is not registered", async () => {
    const res = await request(app).post("/api/v1/admin/audit-logs").send({ data: "invalid" });
    expect(res.status).toBe(404);
    expect(listAuditLogs).not.toHaveBeenCalled();
  });

  it("[Negative] DELETE /api/v1/admin/audit-logs/:logId should return 404 because DELETE is not registered", async () => {
    const res = await request(app).delete("/api/v1/admin/audit-logs/12345");
    expect(res.status).toBe(404);
    expect(getAuditLogById).not.toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE & VALIDATION TEST CASES
   * ========================================================================= */
  it("[Edge] GET /api/v1/admin/audit-logs should pass query parameters down to the controller", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-logs")
      .query({ page: "2", limit: "5", status: "SUCCESS" });

    expect(res.status).toBe(200);
    expect(listAuditLogs).toHaveBeenCalled();
    
    // Check that express request mock received query params
    const calledReq = (listAuditLogs as jest.Mock).mock.calls[0][0];
    expect(calledReq.query).toEqual({ page: "2", limit: "5", status: "SUCCESS" });
  });
});
