import request from "supertest";
import express from "express";
import { roleRoutes } from "../../../../src/modules/admin/routes/role.routes";
import { createRole, listRoles, getRoleById, updateRole, deleteRole } from "../../../../src/modules/admin/controllers/role.controller";

jest.mock("../../../../src/modules/admin/controllers/role.controller", () => ({
  createRole: jest.fn((req, res) => res.status(201).json({ success: true })),
  listRoles: jest.fn((req, res) => res.status(200).json({ success: true })),
  getRoleById: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateRole: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteRole: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPermissionModules: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Role Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/roles", roleRoutes);
  });

  it("POST /roles routes to createRole", async () => {
    await request(app).post("/roles").send({});
    expect(createRole).toHaveBeenCalled();
  });

  it("GET /roles routes to listRoles", async () => {
    await request(app).get("/roles");
    expect(listRoles).toHaveBeenCalled();
  });

  it("GET /roles/:roleId routes to getRoleById", async () => {
    await request(app).get("/roles/1");
    expect(getRoleById).toHaveBeenCalled();
  });

  it("PUT /roles/:roleId routes to updateRole", async () => {
    await request(app).put("/roles/1").send({});
    expect(updateRole).toHaveBeenCalled();
  });

  it("DELETE /roles/:roleId routes to deleteRole", async () => {
    await request(app).delete("/roles/1");
    expect(deleteRole).toHaveBeenCalled();
  });
});
