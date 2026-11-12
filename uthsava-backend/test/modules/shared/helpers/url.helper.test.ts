/// <reference types="jest" />
import { Request } from "express";
import { getAdminBaseUrl } from "../../../../src/modules/shared/helpers/url.helper";
import { config } from "../../../../src/core/config";

// Mock config
jest.mock("../../../../src/core/config", () => ({
  config: {
    adminUrl: "https://config-admin.example.com",
  },
}));

describe("URL Helper - getAdminBaseUrl Unit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("[Positive] should return adminUrl from request body if present and trim trailing slashes", () => {
    const req = {
      body: { adminUrl: "https://body-admin.example.com///" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://body-admin.example.com");
  });

  it("[Positive] should return origin from request body if present and trim trailing slashes", () => {
    const req = {
      body: { origin: "https://body-origin.example.com/" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://body-origin.example.com");
  });

  it("[Positive] should return clientUrl from request body if present and trim trailing slashes", () => {
    const req = {
      body: { clientUrl: "https://body-client.example.com//" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://body-client.example.com");
  });

  it("[Positive] should return origin header if present", () => {
    const req = {
      headers: { origin: "https://header-origin.example.com" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://header-origin.example.com");
  });

  it("[Positive] should parse and return base origin from referer header successfully", () => {
    const req = {
      headers: { referer: "https://header-referer.example.com/path/to/page?query=1" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://header-referer.example.com");
  });

  it("[Edge] should ignore invalid referer headers and fallback to config", () => {
    const req = {
      headers: { referer: "not-a-valid-url" },
    } as unknown as Request;

    const result = getAdminBaseUrl(req);
    expect(result).toBe("https://config-admin.example.com");
  });

  it("[Positive] should use process.env.ADMIN_PANEL_URL fallback if req is undefined", () => {
    process.env.ADMIN_PANEL_URL = "https://env-admin.example.com/";

    const result = getAdminBaseUrl();
    expect(result).toBe("https://env-admin.example.com");
  });

  it("[Positive] should use process.env.FRONTEND_URL fallback if ADMIN_PANEL_URL is missing", () => {
    delete process.env.ADMIN_PANEL_URL;
    process.env.FRONTEND_URL = "https://env-frontend.example.com";

    const result = getAdminBaseUrl();
    expect(result).toBe("https://env-frontend.example.com");
  });

  it("[Edge] should fallback to default staging domain if everything else is missing", () => {
    delete process.env.ADMIN_PANEL_URL;
    delete process.env.FRONTEND_URL;
    config.adminUrl = "";

    const result = getAdminBaseUrl();
    expect(result).toBe("https://uthsava-admin-staging.vercel.app");
  });
});
