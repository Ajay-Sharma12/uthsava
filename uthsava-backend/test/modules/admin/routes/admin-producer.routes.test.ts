import request from "supertest";
import express from "express";
import producerRoutes from "../../../../src/modules/admin/routes/producer.routes";
import {
  listProducers,
  getProducerById,
  createProducer,
  updateProducer,
  updateProducerStatus,
  deleteProducer,
} from "../../../../src/modules/admin/controllers/producer.controller";

jest.mock("../../../../src/modules/admin/controllers/producer.controller");
jest.mock("../../../../src/modules/auth/auth.routes", () => ({ default: jest.fn() }));
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

describe("Producer Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/producers", producerRoutes);
  });

  it("should route GET /producers to listProducers", async () => {
    (listProducers as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
    const res = await request(app).get("/producers");
    expect(res.status).toBe(200);
    expect(listProducers).toHaveBeenCalled();
  });

  it("should route POST /producers to createProducer", async () => {
    (createProducer as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(201).json({ success: true }));
    const res = await request(app).post("/producers").send({});
    expect(res.status).toBe(201);
    expect(createProducer).toHaveBeenCalled();
  });

  it("should route GET /producers/:producerId to getProducerById", async () => {
    (getProducerById as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
    const res = await request(app).get("/producers/1");
    expect(res.status).toBe(200);
    expect(getProducerById).toHaveBeenCalled();
  });

  it("should route PUT /producers/:producerId to updateProducer", async () => {
    (updateProducer as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
    const res = await request(app).put("/producers/1").send({});
    expect(res.status).toBe(200);
    expect(updateProducer).toHaveBeenCalled();
  });

  it("should route DELETE /producers/:producerId to deleteProducer", async () => {
    (deleteProducer as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
    const res = await request(app).delete("/producers/1");
    expect(res.status).toBe(200);
    expect(deleteProducer).toHaveBeenCalled();
  });

  it("should route PATCH /producers/:producerId/status to updateProducerStatus", async () => {
    (updateProducerStatus as jest.Mock).mockImplementation((req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
    const res = await request(app).patch("/producers/1/status").send({});
    expect(res.status).toBe(200);
    expect(updateProducerStatus).toHaveBeenCalled();
  });
});
