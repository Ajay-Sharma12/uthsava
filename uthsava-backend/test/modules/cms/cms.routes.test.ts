import request from "supertest";
import express from "express";
import cmsRoutes from "../../../src/modules/cms/cms.routes";
import { getCmsPageBySlug } from "../../../src/modules/admin/controllers/cms-page.controller";

// Mock controller
jest.mock("../../../src/modules/admin/controllers/cms-page.controller", () => ({
  getCmsPageBySlug: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Public CMS Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/cms", cmsRoutes);
  });

  it("GET /api/v1/cms/:slug routes to getCmsPageBySlug", async () => {
    await request(app).get("/api/v1/cms/privacy-policy");
    expect(getCmsPageBySlug).toHaveBeenCalled();
  });
});
