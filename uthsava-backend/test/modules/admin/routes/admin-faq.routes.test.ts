import request from "supertest";
import express from "express";
import faqRoutes from "../../../../src/modules/admin/routes/faq.routes";
import { listFaqs, createFaq, getFaqById, updateFaq, updateFaqStatus, deleteFaq } from "../../../../src/modules/admin/controllers/faq.controller";

jest.mock("../../../../src/modules/admin/controllers/faq.controller", () => ({
  listFaqs: jest.fn((req, res) => res.status(200).json({ success: true })),
  createFaq: jest.fn((req, res) => res.status(201).json({ success: true })),
  getFaqById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateFaq: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateFaqStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteFaq: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

const app = express();
app.use(express.json());
app.use("/api/v1/admin/faqs", faqRoutes);

describe("Admin Faq Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/admin/faqs should route to listFaqs", async () => {
    const res = await request(app).get("/api/v1/admin/faqs");
    expect(res.status).toBe(200);
    expect(listFaqs).toHaveBeenCalled();
  });

  it("POST /api/v1/admin/faqs should route to createFaq", async () => {
    const res = await request(app).post("/api/v1/admin/faqs").send({});
    expect(res.status).toBe(201);
    expect(createFaq).toHaveBeenCalled();
  });

  it("GET /api/v1/admin/faqs/:faqId should route to getFaqById", async () => {
    const res = await request(app).get("/api/v1/admin/faqs/123");
    expect(res.status).toBe(200);
    expect(getFaqById).toHaveBeenCalled();
  });

  it("PUT /api/v1/admin/faqs/:faqId should route to updateFaq", async () => {
    const res = await request(app).put("/api/v1/admin/faqs/123").send({});
    expect(res.status).toBe(200);
    expect(updateFaq).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/faqs/:faqId/status should route to updateFaqStatus", async () => {
    const res = await request(app).patch("/api/v1/admin/faqs/123/status").send({});
    expect(res.status).toBe(200);
    expect(updateFaqStatus).toHaveBeenCalled();
  });

  it("DELETE /api/v1/admin/faqs/:faqId should route to deleteFaq", async () => {
    const res = await request(app).delete("/api/v1/admin/faqs/123");
    expect(res.status).toBe(200);
    expect(deleteFaq).toHaveBeenCalled();
  });
});
