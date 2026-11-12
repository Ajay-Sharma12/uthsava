import request from "supertest";
import express from "express";
import contentApprovalRoutes from "../../../../src/modules/admin/routes/content-approval.routes";
import {
  listPendingApprovals,
  getContentForApproval,
  approveContent,
  rejectContent,
  getApprovalSummary,
  getApprovalStats
} from "../../../../src/modules/admin/controllers/content-approval.controller";

jest.mock("../../../../src/modules/admin/controllers/content-approval.controller");
jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authorize: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));
jest.mock("../../../../src/core/middleware/subadmin-permission.middleware", () => ({
  requireSubAdminPermission: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));
jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  validateParams: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  validateQuery: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));

describe("Content Approval Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/", contentApprovalRoutes);
  });

  it("should route GET /approvals/pending to listPendingApprovals", async () => {
    (listPendingApprovals as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/approvals/pending");
    expect(res.status).toBe(200);
    expect(listPendingApprovals).toHaveBeenCalled();
  });

  it("should route GET /approvals/summary to getApprovalSummary", async () => {
    (getApprovalSummary as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/approvals/summary");
    expect(res.status).toBe(200);
    expect(getApprovalSummary).toHaveBeenCalled();
  });

  it("should route GET /approvals/stats to getApprovalStats", async () => {
    (getApprovalStats as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/approvals/stats");
    expect(res.status).toBe(200);
    expect(getApprovalStats).toHaveBeenCalled();
  });

  it("should route GET /:contentId/approval-details to getContentForApproval", async () => {
    (getContentForApproval as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/1/approval-details");
    expect(res.status).toBe(200);
    expect(getContentForApproval).toHaveBeenCalled();
  });

  it("should route PATCH /:contentId/approve to approveContent", async () => {
    (approveContent as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/1/approve").send({});
    expect(res.status).toBe(200);
    expect(approveContent).toHaveBeenCalled();
  });

  it("should route PATCH /:contentId/reject to rejectContent", async () => {
    (rejectContent as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/1/reject").send({});
    expect(res.status).toBe(200);
    expect(rejectContent).toHaveBeenCalled();
  });
});
