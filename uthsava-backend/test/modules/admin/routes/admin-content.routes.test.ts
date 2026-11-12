import request from "supertest";
import express from "express";
import contentRoutes from "../../../../src/modules/admin/routes/content.routes";
import {
  listContents,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  updateContentStatus,
  listSeasons,
  createSeason,
  getSeason,
  updateSeason,
  deleteSeason,
  listEpisodes,
  createEpisode,
  getEpisode,
  updateEpisode,
  deleteEpisode,
} from "../../../../src/modules/admin/controllers/content.controller";

jest.mock("../../../../src/modules/admin/controllers/content.controller");
jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authorize: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));
jest.mock("../../../../src/core/middleware/subadmin-permission.middleware", () => ({
  requireSubAdminPermission: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));
jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  validateParams: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  validateQuery: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));

describe("Content Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/contents", contentRoutes);
  });

  it("should route GET /contents to listContents", async () => {
    (listContents as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents");
    expect(res.status).toBe(200);
    expect(listContents).toHaveBeenCalled();
  });

  it("should route POST /contents to createContent", async () => {
    (createContent as jest.Mock).mockImplementation((req, res) => res.status(201).json({ success: true }));
    const res = await request(app).post("/contents").send({});
    expect(res.status).toBe(201);
    expect(createContent).toHaveBeenCalled();
  });



  it("should route GET /contents/:contentId to getContentById", async () => {
    (getContentById as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents/1");
    expect(res.status).toBe(200);
    expect(getContentById).toHaveBeenCalled();
  });

  it("should route PUT /contents/:contentId to updateContent", async () => {
    (updateContent as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).put("/contents/1").send({});
    expect(res.status).toBe(200);
    expect(updateContent).toHaveBeenCalled();
  });

  it("should route DELETE /contents/:contentId to deleteContent", async () => {
    (deleteContent as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).delete("/contents/1");
    expect(res.status).toBe(200);
    expect(deleteContent).toHaveBeenCalled();
  });

  it("should route PATCH /contents/:contentId/status to updateContentStatus", async () => {
    (updateContentStatus as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/contents/1/status").send({});
    expect(res.status).toBe(200);
    expect(updateContentStatus).toHaveBeenCalled();
  });

  it("should route GET /contents/:contentId/seasons to listSeasons", async () => {
    (listSeasons as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents/1/seasons");
    expect(res.status).toBe(200);
    expect(listSeasons).toHaveBeenCalled();
  });

  it("should route POST /contents/:contentId/seasons to createSeason", async () => {
    (createSeason as jest.Mock).mockImplementation((req, res) => res.status(201).json({ success: true }));
    const res = await request(app).post("/contents/1/seasons").send({});
    expect(res.status).toBe(201);
    expect(createSeason).toHaveBeenCalled();
  });

  it("should route GET /contents/:contentId/seasons/:seasonId to getSeason", async () => {
    (getSeason as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents/1/seasons/1");
    expect(res.status).toBe(200);
    expect(getSeason).toHaveBeenCalled();
  });

  it("should route PUT /contents/:contentId/seasons/:seasonId to updateSeason", async () => {
    (updateSeason as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).put("/contents/1/seasons/1").send({});
    expect(res.status).toBe(200);
    expect(updateSeason).toHaveBeenCalled();
  });

  it("should route DELETE /contents/:contentId/seasons/:seasonId to deleteSeason", async () => {
    (deleteSeason as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).delete("/contents/1/seasons/1");
    expect(res.status).toBe(200);
    expect(deleteSeason).toHaveBeenCalled();
  });

  it("should route GET /contents/:contentId/seasons/:seasonId/episodes to listEpisodes", async () => {
    (listEpisodes as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents/1/seasons/1/episodes");
    expect(res.status).toBe(200);
    expect(listEpisodes).toHaveBeenCalled();
  });

  it("should route POST /contents/:contentId/seasons/:seasonId/episodes to createEpisode", async () => {
    (createEpisode as jest.Mock).mockImplementation((req, res) => res.status(201).json({ success: true }));
    const res = await request(app).post("/contents/1/seasons/1/episodes").send({});
    expect(res.status).toBe(201);
    expect(createEpisode).toHaveBeenCalled();
  });

  it("should route GET /contents/:contentId/seasons/:seasonId/episodes/:episodeId to getEpisode", async () => {
    (getEpisode as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/contents/1/seasons/1/episodes/1");
    expect(res.status).toBe(200);
    expect(getEpisode).toHaveBeenCalled();
  });

  it("should route PUT /contents/:contentId/seasons/:seasonId/episodes/:episodeId to updateEpisode", async () => {
    (updateEpisode as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).put("/contents/1/seasons/1/episodes/1").send({});
    expect(res.status).toBe(200);
    expect(updateEpisode).toHaveBeenCalled();
  });

  it("should route DELETE /contents/:contentId/seasons/:seasonId/episodes/:episodeId to deleteEpisode", async () => {
    (deleteEpisode as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).delete("/contents/1/seasons/1/episodes/1");
    expect(res.status).toBe(200);
    expect(deleteEpisode).toHaveBeenCalled();
  });
});
