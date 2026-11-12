import request from "supertest";
import express from "express";
import categoryRoutes from "../../../src/modules/content-category/content-category.routes";
import { listPublicContentCategories } from "../../../src/modules/admin/controllers/content-category.controller";

// Mock controller
jest.mock("../../../src/modules/admin/controllers/content-category.controller", () => ({
  listPublicContentCategories: jest.fn((req, res) => res.status(200).json({ success: true })),
  listActiveContentCategoriesMobile: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Public Content Category Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/categories", categoryRoutes);
  });

  it("[Positive] GET /api/v1/categories routes to listPublicContentCategories successfully", async () => {
    (listPublicContentCategories as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/api/v1/categories");
    expect(listPublicContentCategories).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("[Edge] GET /api/v1/categories handles controller errors correctly", async () => {
    (listPublicContentCategories as jest.Mock).mockImplementation((req, res) => res.status(500).json({ success: false, error: "Internal Error" }));
    const res = await request(app).get("/api/v1/categories");
    expect(listPublicContentCategories).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Internal Error" });
  });
});
