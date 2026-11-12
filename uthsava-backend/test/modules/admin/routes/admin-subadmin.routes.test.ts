import request from "supertest";
import express from "express";
import subadminRoutes from "../../../../src/modules/admin/routes/subadmin.routes";
import { listSubAdmins, listSubAdminActivities, getSubAdminById, createSubAdmin, updateSubAdmin, updateSubAdminStatus, deleteSubAdmin } from "../../../../src/modules/admin/controllers/subadmin.controller";

jest.mock("../../../../src/modules/admin/controllers/subadmin.controller", () => ({
  listSubAdmins: jest.fn((req, res) => res.status(200).json({ success: true })),
  listSubAdminActivities: jest.fn((req, res) => res.status(200).json({ success: true })),
  getSubAdminById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createSubAdmin: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateSubAdmin: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateSubAdminStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteSubAdmin: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Subadmin Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/sub-admins", subadminRoutes);
  });

  it("GET /sub-admins routes to listSubAdmins", async () => {
    await request(app).get("/sub-admins");
    expect(listSubAdmins).toHaveBeenCalled();
  });

  it("GET /sub-admins/:subAdminId/activities routes to listSubAdminActivities", async () => {
    await request(app).get("/sub-admins/1/activities");
    expect(listSubAdminActivities).toHaveBeenCalled();
  });

  it("GET /sub-admins/:subAdminId routes to getSubAdminById", async () => {
    await request(app).get("/sub-admins/1");
    expect(getSubAdminById).toHaveBeenCalled();
  });

  it("POST /sub-admins routes to createSubAdmin", async () => {
    await request(app).post("/sub-admins").send({});
    expect(createSubAdmin).toHaveBeenCalled();
  });

  it("PUT /sub-admins/:subAdminId routes to updateSubAdmin", async () => {
    await request(app).put("/sub-admins/1").send({});
    expect(updateSubAdmin).toHaveBeenCalled();
  });

  it("PATCH /sub-admins/:subAdminId/status routes to updateSubAdminStatus", async () => {
    await request(app).patch("/sub-admins/1/status").send({});
    expect(updateSubAdminStatus).toHaveBeenCalled();
  });

  it("DELETE /sub-admins/:subAdminId routes to deleteSubAdmin", async () => {
    await request(app).delete("/sub-admins/1");
    expect(deleteSubAdmin).toHaveBeenCalled();
  });
});
