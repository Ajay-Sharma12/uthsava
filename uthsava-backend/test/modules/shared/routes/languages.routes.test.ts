import request from "supertest";
import express from "express";
import languagesRoutes from "../../../../src/modules/shared/routes/languages.routes";
import { getLanguages } from "../../../../src/modules/shared/controllers/languages.controller";

// Mock controller
jest.mock("../../../../src/modules/shared/controllers/languages.controller", () => ({
  getLanguages: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Languages Routes Integration Tests", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/languages", languagesRoutes);
  });

  it("[Positive] GET /api/v1/languages should route to getLanguages controller successfully", async () => {
    const res = await request(app).get("/api/v1/languages");
    expect(getLanguages).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("[Edge] GET /api/v1/languages handles controller failure correctly", async () => {
    (getLanguages as jest.Mock).mockImplementation((req, res) => res.status(500).json({ success: false, error: "Internal error" }));
    
    const res = await request(app).get("/api/v1/languages");
    expect(getLanguages).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Internal error" });
  });
});
