import request from "supertest";
import express from "express";
import utilRoutes from "../../../../src/modules/admin/routes/util.routes";
import { getPresignedUrl } from "../../../../src/modules/util/controllers/util.controller";

jest.mock("../../../../src/modules/util/controllers/util.controller", () => ({
  getPresignedUrl: jest.fn((req, res) => res.status(200).json({ success: true, url: "https://s3.amazonaws.com/presigned-url" })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Admin Util Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/admin", utilRoutes);
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] POST /api/v1/admin/util/presigned-url should route to getPresignedUrl", async () => {
    const res = await request(app)
      .post("/api/v1/admin/util/presigned-url")
      .send({ fileName: "poster.png", fileType: "image/png" });

    expect(res.status).toBe(200);
    expect(getPresignedUrl).toHaveBeenCalled();
  });

  /* =========================================================================
   * NEGATIVE / EDGE TEST CASES
   * ========================================================================= */
  it("[Negative/Edge] POST /api/v1/admin/util/presigned-url should handle empty request body gracefully", async () => {
    const res = await request(app)
      .post("/api/v1/admin/util/presigned-url")
      .send({});

    expect(res.status).toBe(200);
    expect(getPresignedUrl).toHaveBeenCalled();
  });
});
