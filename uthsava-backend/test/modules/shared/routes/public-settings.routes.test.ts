import request from "supertest";
import express from "express";
import publicSettingsRoutes from "../../../../src/modules/shared/routes/public-settings.routes";
import { getSettings } from "../../../../src/modules/admin/controllers/settings.controller";

// Mock settings controller
jest.mock("../../../../src/modules/admin/controllers/settings.controller", () => ({
  getSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Public Settings Routes Integration Tests", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/settings", publicSettingsRoutes);
  });

  it("[Positive] GET /api/v1/settings should route to getSettings controller successfully", async () => {
    const res = await request(app).get("/api/v1/settings");
    expect(getSettings).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("[Edge] GET /api/v1/settings handles controller failure correctly", async () => {
    (getSettings as jest.Mock).mockImplementation((req, res) => res.status(500).json({ success: false, error: "Database error" }));

    const res = await request(app).get("/api/v1/settings");
    expect(getSettings).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Database error" });
  });
});
