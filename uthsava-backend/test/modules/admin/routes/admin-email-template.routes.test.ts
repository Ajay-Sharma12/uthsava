import request from "supertest";
import express from "express";
import emailTemplateRoutes from "../../../../src/modules/admin/routes/email-template.routes";
import { listEmailTemplates, getEmailTemplateById, updateEmailTemplate, updateEmailTemplateStatus } from "../../../../src/modules/admin/controllers/email-template.controller";

jest.mock("../../../../src/modules/admin/controllers/email-template.controller", () => ({
  createEmailTemplate: jest.fn((req, res) => res.status(201).json({ success: true })),
  sendBulkEmail: jest.fn((req, res) => res.status(200).json({ success: true })),
  listEmailTemplates: jest.fn((req, res) => res.status(200).json({ success: true })),
  getEmailTemplateById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateEmailTemplate: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateEmailTemplateStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
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
app.use("/api/v1/admin/email-templates", emailTemplateRoutes);

describe("Admin EmailTemplate Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/admin/email-templates should route to listEmailTemplates", async () => {
    const res = await request(app).get("/api/v1/admin/email-templates");
    expect(res.status).toBe(200);
    expect(listEmailTemplates).toHaveBeenCalled();
  });

  it("GET /api/v1/admin/email-templates/:templateId should route to getEmailTemplateById", async () => {
    const res = await request(app).get("/api/v1/admin/email-templates/123");
    expect(res.status).toBe(200);
    expect(getEmailTemplateById).toHaveBeenCalled();
  });

  it("PUT /api/v1/admin/email-templates/:templateId should route to updateEmailTemplate", async () => {
    const res = await request(app).put("/api/v1/admin/email-templates/123").send({});
    expect(res.status).toBe(200);
    expect(updateEmailTemplate).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/email-templates/:templateId/status should route to updateEmailTemplateStatus", async () => {
    const res = await request(app).patch("/api/v1/admin/email-templates/123/status").send({});
    expect(res.status).toBe(200);
    expect(updateEmailTemplateStatus).toHaveBeenCalled();
  });
});
