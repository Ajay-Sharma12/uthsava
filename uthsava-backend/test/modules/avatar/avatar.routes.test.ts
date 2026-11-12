/// <reference types="jest" />
import express from "express";
import request from "supertest";
import avatarRoutes from "../../../src/modules/avatar/avatar.routes";
import {
  getActiveAvatars,
  createAvatar,
  listAvatarCategories,
} from "../../../src/modules/avatar/controllers/avatar.controller";

jest.mock("../../../src/modules/avatar/controllers/avatar.controller", () => ({
  getActiveAvatars: jest.fn((req, res) => res.status(200).json({ success: true, message: "getActiveAvatars" })),
  createAvatar: jest.fn((req, res) => res.status(201).json({ success: true, message: "createAvatar" })),
  listAvatarCategories: jest.fn((req, res) => res.status(200).json({ success: true, message: "listAvatarCategories" })),
  getActiveAvatarCategoriesMobile: jest.fn((req, res) => res.status(200).json({ success: true, message: "getActiveAvatarCategoriesMobile" })),
}));

describe("Avatar Routes Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/avatars", avatarRoutes);
  });

  it("[Positive] GET /api/v1/avatars/categories should route to listAvatarCategories", async () => {
    const res = await request(app).get("/api/v1/avatars/categories");
    expect(res.status).toBe(200);
    expect(listAvatarCategories).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/avatars should route to getActiveAvatars", async () => {
    const res = await request(app).get("/api/v1/avatars");
    expect(res.status).toBe(200);
    expect(getActiveAvatars).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/avatars should validate body and route to createAvatar", async () => {
    const res = await request(app)
      .post("/api/v1/avatars")
      .send({ category: "Cartoons", images: ["http://example.com/pic.png"] });

    expect(res.status).toBe(201);
    expect(createAvatar).toHaveBeenCalled();
  });
});
