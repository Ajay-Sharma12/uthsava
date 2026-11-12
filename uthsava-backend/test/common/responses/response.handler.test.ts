/// <reference types="jest" />
import { Response } from "express";
import { ResponseHandler } from "../../../src/common/responses/response.handler";
import i18n from "../../../src/core/config/i18n";

// Mock i18n
jest.mock("../../../src/core/config/i18n", () => ({
  setLocale: jest.fn(),
  __: jest.fn().mockImplementation((key, replacements) => {
    if (replacements && typeof replacements === "object") {
      return `${key}-${JSON.stringify(replacements)}`;
    }
    return key;
  }),
}));

describe("Response Handler Unit Tests", () => {
  let res: Response;

  const mockResponse = () => {
    const response: any = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  /* =========================================================================
   * SUCCESS RESPONSE TESTS
   * ========================================================================= */
  it("[Positive] should send a success response with default parameters", () => {
    const data = { id: 123 };
    ResponseHandler.success(res, data);

    expect(i18n.setLocale).toHaveBeenCalledWith("en");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 200,
      success: true,
      message: "general.success",
      results: data,
    });
  });

  it("[Positive] should send a success response with custom parameters", () => {
    const data = { id: 456 };
    ResponseHandler.success(res, data, "custom.success", "ar", 201);

    expect(i18n.setLocale).toHaveBeenCalledWith("ar");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 201,
      success: true,
      message: "custom.success",
      results: data,
    });
  });

  /* =========================================================================
   * ERROR RESPONSE TESTS
   * ========================================================================= */
  it("[Negative] should send an error response with error object template variables", () => {
    const customError = { field: "email", reason: "duplicated" };
    ResponseHandler.error(res, "errors.conflict", "hi", 409, customError);

    expect(i18n.setLocale).toHaveBeenCalledWith("hi");
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 409,
      success: false,
      message: `errors.conflict-{"field":"email","reason":"duplicated"}`,
    });
  });

  it("[Negative] should send an error response with error stack when available", () => {
    const err = new Error("Something broke");
    ResponseHandler.error(res, "general.error", "en", 500, err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      success: false,
      message: "general.error",
      error: err,
    });
  });

  /* =========================================================================
   * HTTP WRAPPERS TESTS
   * ========================================================================= */
  it("[Positive] should return 401 for unauthorized helper", () => {
    ResponseHandler.unauthorized(res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("[Positive] should return 403 for forbidden helper", () => {
    ResponseHandler.forbidden(res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("[Positive] should return 404 for notFound helper", () => {
    ResponseHandler.notFound(res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("[Positive] should return 429 for rateLimitExceeded helper", () => {
    ResponseHandler.rateLimitExceeded(res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("[Positive] should return 409 for conflict helper", () => {
    ResponseHandler.conflict(res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("[Positive] should return 400 for badRequest helper", () => {
    ResponseHandler.badRequest(res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  /* =========================================================================
   * VALIDATION ERROR RESPONSE TESTS
   * ========================================================================= */
  it("[Validation] should send a 400 response with translated validation error message", () => {
    const errors = {
      email: "validation.invalidEmail",
      password: "Password too short",
    };

    ResponseHandler.validationError(res, errors, "validation.failed", "en");

    expect(i18n.setLocale).toHaveBeenCalledWith("en");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 400,
      success: false,
      message: "validation.invalidEmail",
    });
  });
});
