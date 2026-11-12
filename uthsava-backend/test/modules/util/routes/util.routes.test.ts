import request from "supertest";
import express from "express";
import utilRoutes from "../../../../src/modules/util/routes/util.routes";
import { getPresignedUrl, sendEmail, deleteFile } from "../../../../src/modules/util/controllers/util.controller";

jest.mock("../../../../src/modules/util/controllers/util.controller", () => ({
  getPresignedUrl: jest.fn((req, res) => res.status(200).json({ success: true })),
  sendEmail: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteFile: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
}));

describe("Utility Routes Tests", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/util", utilRoutes);
  });

  /* =========================================================================
   * ROUTING VERIFICATION
   * ========================================================================= */
  it("[Positive] POST /api/v1/util/email should route to sendEmail controller", async () => {
    await request(app)
      .post("/api/v1/util/email")
      .send({ to: "user@test.com", subject: "Test", html: "<p>test</p>" });

    expect(sendEmail).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/util/presigned-url should route to getPresignedUrl controller", async () => {
    await request(app)
      .post("/api/v1/util/presigned-url")
      .send({ fileName: "photo.png", fileType: "image/png" });

    expect(getPresignedUrl).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/util/delete-file should route to deleteFile controller", async () => {
    await request(app)
      .post("/api/v1/util/delete-file")
      .send({ key: "uploads/photo.png" });

    expect(deleteFile).toHaveBeenCalled();
  });
});
