import request from "supertest";
import express from "express";
import tutorialSlideRoutes from "../../../../src/modules/admin/routes/tutorial-slide.routes";
import { listTutorialSlides, createTutorialSlide, getTutorialSlideById, updateTutorialSlide, updateTutorialSlideStatus, deleteTutorialSlide, normalizeTutorialSlideSequences } from "../../../../src/modules/admin/controllers/tutorial-slide.controller";

jest.mock("../../../../src/modules/admin/controllers/tutorial-slide.controller", () => ({
  listTutorialSlides: jest.fn((req, res) => res.status(200).json({ success: true })),
  createTutorialSlide: jest.fn((req, res) => res.status(201).json({ success: true })),
  getTutorialSlideById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateTutorialSlide: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateTutorialSlideStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteTutorialSlide: jest.fn((req, res) => res.status(200).json({ success: true })),
  normalizeTutorialSlideSequences: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

const app = express();
app.use(express.json());
app.use("/api/v1/admin/tutorial-slides", tutorialSlideRoutes);

describe("Admin TutorialSlide Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/admin/tutorial-slides should route to listTutorialSlides", async () => {
    const res = await request(app).get("/api/v1/admin/tutorial-slides");
    expect(res.status).toBe(200);
    expect(listTutorialSlides).toHaveBeenCalled();
  });

  it("POST /api/v1/admin/tutorial-slides should route to createTutorialSlide", async () => {
    const res = await request(app).post("/api/v1/admin/tutorial-slides").send({});
    expect(res.status).toBe(201);
    expect(createTutorialSlide).toHaveBeenCalled();
  });

  it("GET /api/v1/admin/tutorial-slides/:slideId should route to getTutorialSlideById", async () => {
    const res = await request(app).get("/api/v1/admin/tutorial-slides/123");
    expect(res.status).toBe(200);
    expect(getTutorialSlideById).toHaveBeenCalled();
  });

  it("PUT /api/v1/admin/tutorial-slides/:slideId should route to updateTutorialSlide", async () => {
    const res = await request(app).put("/api/v1/admin/tutorial-slides/123").send({});
    expect(res.status).toBe(200);
    expect(updateTutorialSlide).toHaveBeenCalled();
  });

  it("PATCH /api/v1/admin/tutorial-slides/:slideId/status should route to updateTutorialSlideStatus", async () => {
    const res = await request(app).patch("/api/v1/admin/tutorial-slides/123/status").send({});
    expect(res.status).toBe(200);
    expect(updateTutorialSlideStatus).toHaveBeenCalled();
  });

  it("DELETE /api/v1/admin/tutorial-slides/:slideId should route to deleteTutorialSlide", async () => {
    const res = await request(app).delete("/api/v1/admin/tutorial-slides/123");
    expect(res.status).toBe(200);
    expect(deleteTutorialSlide).toHaveBeenCalled();
  });

  it("POST /api/v1/admin/tutorial-slides/normalize-sequences should route to normalizeTutorialSlideSequences", async () => {
    const res = await request(app).post("/api/v1/admin/tutorial-slides/normalize-sequences");
    expect(res.status).toBe(200);
    expect(normalizeTutorialSlideSequences).toHaveBeenCalled();
  });
});
