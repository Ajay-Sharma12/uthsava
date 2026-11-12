/// <reference types="jest" />
import express from "express";
import request from "supertest";
import v1Routes from "../../../../src/api/routes/v1/index";
import { listPublicFaqs } from "../../../../src/modules/admin/controllers/faq.controller";

jest.mock("../../../../src/modules/admin/controllers/faq.controller", () => ({
  listPublicFaqs: jest.fn((req, res) => res.status(200).json({ success: true, message: "listPublicFaqs" })),
  listFaqs: jest.fn((req, res) => res.status(200).json({ success: true })),
  createFaq: jest.fn((req, res) => res.status(201).json({ success: true })),
  getFaqById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateFaq: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateFaqStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteFaq: jest.fn((req, res) => res.status(200).json({ success: true })),
  reorderFaqs: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/modules/auth/controllers/user-auth.controller", () => ({
  ...jest.requireActual("../../../../src/modules/auth/controllers/user-auth.controller"),
  getMyGenres: jest.fn((req, res) => res.status(200).json({ success: true, message: "getMyGenres" })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  adminInactivityTimeout: jest.fn((req, res, next) => next()),
}));

describe("V1 Router Aggregator Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1", v1Routes);
  });

  it("[Positive] /api/v1 router should be mounted and handle requests", async () => {
    const res = await request(app).get("/api/v1/faqs");
    expect(res.status).toBe(200);
    expect(listPublicFaqs).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/my-genres should route to getMyGenres", async () => {
    const res = await request(app).get("/api/v1/my-genres");
    expect(res.status).toBe(200);
  });
});
