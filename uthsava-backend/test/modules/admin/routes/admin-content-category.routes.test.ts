import request from "supertest";
import express from "express";
import contentCategoryRoutes from "../../../../src/modules/admin/routes/content-category.routes";
import {
  listContentCategories,
  getContentCategoryById,
  createContentCategory,
  updateContentCategory,
  deleteContentCategory,
  updateContentCategoryStatus,
  updateContentCategoryDisplayOrder,
} from "../../../../src/modules/admin/controllers/content-category.controller";

jest.mock("../../../../src/modules/admin/controllers/content-category.controller");
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

describe("Content Category Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/categories", contentCategoryRoutes);
  });

  it("should route GET /categories to listContentCategories", async () => {
    (listContentCategories as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/categories");
    expect(res.status).toBe(200);
    expect(listContentCategories).toHaveBeenCalled();
  });

  it("should route POST /categories to createContentCategory", async () => {
    (createContentCategory as jest.Mock).mockImplementation((req, res) => res.status(201).json({ success: true }));
    const res = await request(app).post("/categories").send({});
    expect(res.status).toBe(201);
    expect(createContentCategory).toHaveBeenCalled();
  });

  it("should route GET /categories/:categoryId to getContentCategoryById", async () => {
    (getContentCategoryById as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).get("/categories/1");
    expect(res.status).toBe(200);
    expect(getContentCategoryById).toHaveBeenCalled();
  });

  it("should route PUT /categories/:categoryId to updateContentCategory", async () => {
    (updateContentCategory as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).put("/categories/1").send({});
    expect(res.status).toBe(200);
    expect(updateContentCategory).toHaveBeenCalled();
  });

  it("should route DELETE /categories/:categoryId to deleteContentCategory", async () => {
    (deleteContentCategory as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).delete("/categories/1");
    expect(res.status).toBe(200);
    expect(deleteContentCategory).toHaveBeenCalled();
  });

  it("should route PATCH /categories/:categoryId/status to updateContentCategoryStatus", async () => {
    (updateContentCategoryStatus as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/categories/1/status").send({});
    expect(res.status).toBe(200);
    expect(updateContentCategoryStatus).toHaveBeenCalled();
  });

  it("should route PATCH /categories/:categoryId/display-order to updateContentCategoryDisplayOrder", async () => {
    (updateContentCategoryDisplayOrder as jest.Mock).mockImplementation((req, res) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/categories/1/display-order").send({});
    expect(res.status).toBe(200);
    expect(updateContentCategoryDisplayOrder).toHaveBeenCalled();
  });
});
