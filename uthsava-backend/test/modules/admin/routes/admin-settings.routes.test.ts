import request from "supertest";
import express from "express";
import settingsRoutes from "../../../../src/modules/admin/routes/settings.routes";
import { getSettings, updateSettings, updateFreePreview, getRevenueBrackets, addRevenueBracket, updateRevenueBracket, deleteRevenueBracket, updatePayoutSettings } from "../../../../src/modules/admin/controllers/settings.controller";

jest.mock("../../../../src/modules/admin/controllers/settings.controller", () => ({
  getSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateFreePreview: jest.fn((req, res) => res.status(200).json({ success: true })),
  getRevenueBrackets: jest.fn((req, res) => res.status(200).json({ success: true })),
  addRevenueBracket: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateRevenueBracket: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteRevenueBracket: jest.fn((req, res) => res.status(200).json({ success: true })),
  updatePayoutSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Settings Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/settings", settingsRoutes);
  });

  it("GET /settings routes to getSettings", async () => {
    await request(app).get("/settings");
    expect(getSettings).toHaveBeenCalled();
  });

  it("GET /settings/revenue-brackets routes to getRevenueBrackets", async () => {
    await request(app).get("/settings/revenue-brackets");
    expect(getRevenueBrackets).toHaveBeenCalled();
  });

  it("PUT /settings routes to updateSettings", async () => {
    await request(app).put("/settings").send({});
    expect(updateSettings).toHaveBeenCalled();
  });

  it("PUT /settings/free-preview routes to updateFreePreview", async () => {
    await request(app).put("/settings/free-preview").send({});
    expect(updateFreePreview).toHaveBeenCalled();
  });

  it("POST /settings/revenue-brackets routes to addRevenueBracket", async () => {
    await request(app).post("/settings/revenue-brackets").send({});
    expect(addRevenueBracket).toHaveBeenCalled();
  });

  it("PUT /settings/revenue-brackets/edit routes to updateRevenueBracket", async () => {
    await request(app).put("/settings/revenue-brackets/edit").send({});
    expect(updateRevenueBracket).toHaveBeenCalled();
  });

  it("POST /settings/revenue-brackets/delete routes to deleteRevenueBracket", async () => {
    await request(app).post("/settings/revenue-brackets/delete").send({});
    expect(deleteRevenueBracket).toHaveBeenCalled();
  });

  it("PUT /settings/payout routes to updatePayoutSettings", async () => {
    await request(app).put("/settings/payout").send({});
    expect(updatePayoutSettings).toHaveBeenCalled();
  });
});
