import request from "supertest";
import express from "express";
import profileRoutes from "../../../src/modules/profile/profile.routes";
import {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  updateNotificationSettings,
  createSubProfile,
  getSubProfiles,
} from "../../../src/modules/profile/controllers/profile.controller";

// Mock controllers
jest.mock("../../../src/modules/profile/controllers/profile.controller", () => ({
  getProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateProfileImage: jest.fn((req, res) => res.status(200).json({ success: true })),
  changePassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateNotificationSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
  createSubProfile: jest.fn((req, res) => res.status(201).json({ success: true })),
  getSubProfiles: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

// Mock middlewares
jest.mock("../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { sub: "user123" };
    next();
  }),
}));

jest.mock("../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Profile Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/profile", profileRoutes);
  });

  it("GET /api/v1/profile routes to getProfile", async () => {
    await request(app).get("/api/v1/profile");
    expect(getProfile).toHaveBeenCalled();
  });

  it("PUT /api/v1/profile routes to updateProfile", async () => {
    await request(app).put("/api/v1/profile").send({ firstName: "Jane" });
    expect(updateProfile).toHaveBeenCalled();
  });

  it("PUT /api/v1/profile/image routes to updateProfileImage", async () => {
    await request(app).put("/api/v1/profile/image").send({ profileImage: "image.jpg" });
    expect(updateProfileImage).toHaveBeenCalled();
  });

  it("PUT /api/v1/profile/change-password routes to changePassword", async () => {
    await request(app).put("/api/v1/profile/change-password").send({ currentPassword: "Old1", newPassword: "New1" });
    expect(changePassword).toHaveBeenCalled();
  });

  it("PUT /api/v1/profile/notification-settings routes to updateNotificationSettings", async () => {
    await request(app).put("/api/v1/profile/notification-settings").send({ notificationEnabled: true });
    expect(updateNotificationSettings).toHaveBeenCalled();
  });

  it("POST /api/v1/profile/sub-profiles routes to createSubProfile", async () => {
    await request(app).post("/api/v1/profile/sub-profiles").send({ name: "Kids" });
    expect(createSubProfile).toHaveBeenCalled();
  });

  it("GET /api/v1/profile/sub-profiles routes to getSubProfiles", async () => {
    await request(app).get("/api/v1/profile/sub-profiles");
    expect(getSubProfiles).toHaveBeenCalled();
  });
});
