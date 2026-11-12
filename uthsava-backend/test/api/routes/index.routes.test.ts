/// <reference types="jest" />
import express from "express";
import request from "supertest";
import { setupRoutes } from "../../../src/api/routes/index";

jest.mock("../../../src/config/swagger", () => ({
  setupSwagger: jest.fn(),
}));

describe("API Global Routes Setup Unit & Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    setupRoutes(app as any);
  });

  it("[Positive] GET /health should return 200 OK status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
  });
});
