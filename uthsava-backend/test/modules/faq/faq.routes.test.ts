import request from "supertest";
import express from "express";
import faqRoutes from "../../../src/modules/faq/faq.routes";
import { listPublicFaqs } from "../../../src/modules/admin/controllers/faq.controller";

// Mock controller
jest.mock("../../../src/modules/admin/controllers/faq.controller", () => ({
  listPublicFaqs: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Public FAQ Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/faqs", faqRoutes);
  });

  it("[Positive] GET /api/v1/faqs routes to listPublicFaqs successfully", async () => {
    (listPublicFaqs as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/api/v1/faqs");
    expect(listPublicFaqs).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("[Edge] GET /api/v1/faqs handles controller errors correctly", async () => {
    (listPublicFaqs as jest.Mock).mockImplementation((req, res) => res.status(500).json({ success: false, error: "Internal Error" }));
    const res = await request(app).get("/api/v1/faqs");
    expect(listPublicFaqs).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Internal Error" });
  });
});
