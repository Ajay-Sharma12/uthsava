/// <reference types="jest" />
import express from "express";
import request from "supertest";
import adminAvatarRoutes from "../../../../src/modules/admin/routes/avatar.routes";
import {
  listAdminAvatars,
  getAvatarById,
  createAdminAvatar,
  updateAdminAvatar,
  updateAdminAvatarStatus,
  deleteAdminAvatar,
  listAvatarCategories,
  createAvatarCategory,
} from "../../../../src/modules/avatar/controllers/avatar.controller";

jest.mock("../../../../src/modules/avatar/controllers/avatar.controller", () => ({
  listAdminAvatars: jest.fn((req, res) => res.status(200).json({ success: true, message: "listAdminAvatars" })),
  getAvatarById: jest.fn((req, res) => res.status(200).json({ success: true, message: "getAvatarById" })),
  createAdminAvatar: jest.fn((req, res) => res.status(201).json({ success: true, message: "createAdminAvatar" })),
  updateAdminAvatar: jest.fn((req, res) => res.status(200).json({ success: true, message: "updateAdminAvatar" })),
  updateAdminAvatarStatus: jest.fn((req, res) => res.status(200).json({ success: true, message: "updateAdminAvatarStatus" })),
  deleteAdminAvatar: jest.fn((req, res) => res.status(200).json({ success: true, message: "deleteAdminAvatar" })),
  listAvatarCategories: jest.fn((req, res) => res.status(200).json({ success: true, message: "listAvatarCategories" })),
  createAvatarCategory: jest.fn((req, res) => res.status(201).json({ success: true, message: "createAvatarCategory" })),
}));

describe("Admin Avatar Routes Integration Tests", () => {
  let app: express.Application;
  const validHexId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/admin/avatars", adminAvatarRoutes);
  });

  it("[Positive] GET /api/v1/admin/avatars/categories should route to listAvatarCategories", async () => {
    const res = await request(app).get("/api/v1/admin/avatars/categories");
    expect(res.status).toBe(200);
    expect(listAvatarCategories).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/admin/avatars/categories should route to createAvatarCategory", async () => {
    const res = await request(app)
      .post("/api/v1/admin/avatars/categories")
      .send({ category: "Superheroes" });

    expect(res.status).toBe(201);
    expect(createAvatarCategory).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/admin/avatars should route to listAdminAvatars", async () => {
    const res = await request(app).get("/api/v1/admin/avatars");
    expect(res.status).toBe(200);
    expect(listAdminAvatars).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/admin/avatars/:avatarId should route to getAvatarById", async () => {
    const res = await request(app).get(`/api/v1/admin/avatars/${validHexId}`);
    expect(res.status).toBe(200);
    expect(getAvatarById).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/admin/avatars should route to createAdminAvatar", async () => {
    const res = await request(app)
      .post("/api/v1/admin/avatars")
      .send({ category: "Anime", images: ["http://example.com/pic.png"] });

    expect(res.status).toBe(201);
    expect(createAdminAvatar).toHaveBeenCalled();
  });

  it("[Positive] PUT /api/v1/admin/avatars/:avatarId should route to updateAdminAvatar", async () => {
    const res = await request(app)
      .put(`/api/v1/admin/avatars/${validHexId}`)
      .send({ category: "Anime Updated" });

    expect(res.status).toBe(200);
    expect(updateAdminAvatar).toHaveBeenCalled();
  });

  it("[Positive] PATCH /api/v1/admin/avatars/:avatarId/status should route to updateAdminAvatarStatus", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/avatars/${validHexId}/status`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(updateAdminAvatarStatus).toHaveBeenCalled();
  });

  it("[Positive] DELETE /api/v1/admin/avatars/:avatarId should route to deleteAdminAvatar", async () => {
    const res = await request(app).delete(`/api/v1/admin/avatars/${validHexId}`);
    expect(res.status).toBe(200);
    expect(deleteAdminAvatar).toHaveBeenCalled();
  });
});
