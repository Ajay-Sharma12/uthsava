import request from "supertest";
import express from "express";
import staticPagesRoutes from "../../../src/modules/static-pages/static-pages.routes";
import { CmsPageService } from "../../../src/modules/admin/services/cms-page.service";

// Mock service
jest.mock("../../../src/modules/admin/services/cms-page.service", () => ({
  CmsPageService: {
    getPageBySlug: jest.fn(),
  },
}));

describe("Public Static Pages Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/static", staticPagesRoutes);
  });

  it("[Positive] GET /api/v1/static/about-us should successfully return about-us static page data", async () => {
    const mockPage = { slug: "about-us", title: "About Us", content: "Content here" };
    (CmsPageService.getPageBySlug as jest.Mock).mockResolvedValue(mockPage);

    const res = await request(app).get("/api/v1/static/about-us");

    expect(CmsPageService.getPageBySlug).toHaveBeenCalledWith("about-us");
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(mockPage);
  });

  it("[Positive] GET /api/v1/static/privacy-policy should successfully return privacy-policy static page data", async () => {
    const mockPage = { slug: "privacy-policy", title: "Privacy Policy" };
    (CmsPageService.getPageBySlug as jest.Mock).mockResolvedValue(mockPage);

    const res = await request(app).get("/api/v1/static/privacy-policy");

    expect(CmsPageService.getPageBySlug).toHaveBeenCalledWith("privacy-policy");
    expect(res.status).toBe(200);
  });

  it("[Negative] should return 404 if page is not found", async () => {
    (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("Page not found"));

    const res = await request(app).get("/api/v1/static/about-us");

    expect(res.status).toBe(404);
  });

  it("[Edge] should return 500 if database query throws a general error", async () => {
    (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/v1/static/about-us");

    expect(res.status).toBe(500);
  });
});
