import request from "supertest";
import express from "express";
import cronRoutes from "../../../src/modules/cron/cron.routes";
import { triggerCronJob } from "../../../src/modules/cron/cron.controller";

// Mock the controller function
jest.mock("../../../src/modules/cron/cron.controller", () => ({
  triggerCronJob: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

describe("Cron Job Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/cron", cronRoutes);
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] POST /api/v1/cron/trigger should successfully route to triggerCronJob controller with valid payload", async () => {
    const res = await request(app)
      .post("/api/v1/cron/trigger")
      .send({ type: "reminder" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(triggerCronJob).toHaveBeenCalled();
  });

  /* =========================================================================
   * NEGATIVE / EDGE TEST CASES
   * ========================================================================= */
  it("[Negative/Edge] POST /api/v1/cron/trigger should handle empty body route propagation gracefully", async () => {
    // Route handler itself should still receive request and pass it to the controller
    const res = await request(app)
      .post("/api/v1/cron/trigger")
      .send({});

    expect(res.status).toBe(200);
    expect(triggerCronJob).toHaveBeenCalled();
  });
});
