import request from "supertest";
import express from "express";
import userRoutes from "../../../../src/modules/admin/routes/user.routes";
import { listUsers, listUserLookup, getUserById, updateUserStatus } from "../../../../src/modules/admin/controllers/user.controller";

jest.mock("../../../../src/modules/admin/controllers/user.controller", () => ({
  listUsers: jest.fn((req, res) => res.status(200).json({ success: true })),
  listUserLookup: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUserById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateUserStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("User Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/users", userRoutes);
  });

  it("GET /users routes to listUsers", async () => {
    await request(app).get("/users");
    expect(listUsers).toHaveBeenCalled();
  });

  it("GET /users/lookup routes to listUserLookup", async () => {
    await request(app).get("/users/lookup");
    expect(listUserLookup).toHaveBeenCalled();
  });

  it("GET /users/:userId routes to getUserById", async () => {
    await request(app).get("/users/0123456789abcdef01234567");
    expect(getUserById).toHaveBeenCalled();
  });

  it("PATCH /users/:userId/status routes to updateUserStatus", async () => {
    await request(app).patch("/users/0123456789abcdef01234567/status").send({});
    expect(updateUserStatus).toHaveBeenCalled();
  });
});
