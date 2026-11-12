import request from "supertest";
import express from "express";
import tutorialRoutes from "../../../src/modules/tutorial/tutorial-slide.routes";
import { getActiveTutorialSlides } from "../../../src/modules/tutorial/controllers/tutorial-slide.controller";

// Mock controller
jest.mock("../../../src/modules/tutorial/controllers/tutorial-slide.controller", () => ({
  getActiveTutorialSlides: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Public Tutorial Slide Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/tutorial-slides", tutorialRoutes);
  });

  it("[Positive] GET /api/v1/tutorial-slides routes to getActiveTutorialSlides successfully", async () => {
    (getActiveTutorialSlides as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/api/v1/tutorial-slides");
    expect(getActiveTutorialSlides).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("[Edge] GET /api/v1/tutorial-slides handles controller errors correctly", async () => {
    (getActiveTutorialSlides as jest.Mock).mockImplementation((req, res) => res.status(500).json({ success: false, error: "Internal Error" }));
    const res = await request(app).get("/api/v1/tutorial-slides");
    expect(getActiveTutorialSlides).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Internal Error" });
  });
});
