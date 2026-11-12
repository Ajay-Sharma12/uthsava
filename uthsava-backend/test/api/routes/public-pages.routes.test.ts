/// <reference types="jest" />
import express from "express";
import request from "supertest";
import publicPagesRoutes from "../../../src/api/routes/public-pages.routes";
import { getPublicStaticPage } from "../../../src/modules/admin/controllers/cms-page.controller";

jest.mock("../../../src/modules/admin/controllers/cms-page.controller", () => ({
  getPublicStaticPage: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: "getPublicStaticPage" })
  ),
}));

describe("Public Pages Routes Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/pages", publicPagesRoutes);
  });

  it("[Positive] GET /api/v1/pages should route to getPublicStaticPage", async () => {
    const res = await request(app).get("/api/v1/pages?slug=terms");
    expect(res.status).toBe(200);
    expect(getPublicStaticPage).toHaveBeenCalled();
  });
});
