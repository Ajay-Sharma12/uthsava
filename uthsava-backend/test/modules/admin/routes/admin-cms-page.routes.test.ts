import request from "supertest";
import express from "express";
import cmsPageRoutes from "../../../../src/modules/admin/routes/cms-page.routes";
import { listCmsPages, createCmsPage, getCmsPageById, updateCmsPage, updateCmsPageStatus, deleteCmsPage } from "../../../../src/modules/admin/controllers/cms-page.controller";

jest.mock("../../../../src/modules/admin/controllers/cms-page.controller", () => ({
  listCmsPages: jest.fn((req, res) => res.status(200).json({ success: true })),
  createCmsPage: jest.fn((req, res) => res.status(201).json({ success: true })),
  getCmsPageById: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCmsPageBySlug: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateCmsPage: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateCmsPageStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateCmsPagePublicationStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteCmsPage: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPublicStaticPage: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("CMS Page Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/cms-pages", cmsPageRoutes);
  });

  it("GET /cms-pages routes to listCmsPages", async () => {
    await request(app).get("/cms-pages");
    expect(listCmsPages).toHaveBeenCalled();
  });

  it("POST /cms-pages routes to createCmsPage", async () => {
    await request(app).post("/cms-pages").send({});
    expect(createCmsPage).toHaveBeenCalled();
  });

  it("GET /cms-pages/:pageId routes to getCmsPageById", async () => {
    await request(app).get("/cms-pages/1");
    expect(getCmsPageById).toHaveBeenCalled();
  });

  it("PUT /cms-pages/:pageId routes to updateCmsPage", async () => {
    await request(app).put("/cms-pages/1").send({});
    expect(updateCmsPage).toHaveBeenCalled();
  });

  it("PATCH /cms-pages/:pageId/status routes to updateCmsPageStatus", async () => {
    await request(app).patch("/cms-pages/1/status").send({});
    expect(updateCmsPageStatus).toHaveBeenCalled();
  });

  it("DELETE /cms-pages/:pageId routes to deleteCmsPage", async () => {
    await request(app).delete("/cms-pages/1");
    expect(deleteCmsPage).toHaveBeenCalled();
  });
});
