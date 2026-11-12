/// <reference types="jest" />
import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { validateBody, validateParams, validateQuery } from "../../../src/core/middleware/validate.middleware";
import { ResponseHandler } from "../../../src/common/responses/response.handler";

jest.mock("../../../src/common/responses/response.handler");
jest.mock("../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));

describe("Validation Middleware Unit Tests", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  const mockResponse = () => {
    const response: any = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response as Response;
  };

  const schema = Joi.object({
    name: Joi.string().required(),
    genres: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  /* =========================================================================
   * validateBody Middleware Tests
   * ========================================================================= */
  describe("validateBody", () => {
    it("[Positive] should successfully parse JSON strings from FormData and call next()", () => {
      req = {
        body: {
          name: "Action Movie",
          genres: '["action", "thriller"]',
          tags: '["new", "popular"]',
        },
      } as unknown as Request;

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.genres).toEqual(["action", "thriller"]);
      expect(req.body.tags).toEqual(["new", "popular"]);
    });

    it("[Positive] should sanitize request body to only include schema fields (stripUnknown) and call next()", () => {
      req = {
        body: {
          name: "Sci-Fi Movie",
          unknownField: "should be stripped",
        },
      } as unknown as Request;

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.unknownField).toBeUndefined();
      expect(req.body.name).toBe("Sci-Fi Movie");
    });

    it("[Validation] should return validationError response if body fails schema validation", () => {
      req = {
        body: {
          genres: ["action"], // missing required "name" field
        },
      } as unknown as Request;

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ name: expect.any(String) }),
        "validation.failed",
        "en"
      );
    });

    it("[Edge] should ignore malformed JSON strings in parse list, log exception, and still validate body", () => {
      req = {
        body: {
          name: "Adventure",
          genres: "malformed-json-here[",
        },
      } as unknown as Request;

      const middleware = validateBody(schema);
      middleware(req, res, next);

      // Joi will fail since genres is still a string and not an array
      expect(next).not.toHaveBeenCalled();
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * validateParams Middleware Tests
   * ========================================================================= */
  describe("validateParams", () => {
    const paramSchema = Joi.object({
      id: Joi.string().alphanum().length(24).required(),
    });

    it("[Positive] should call next if param fits schema perfectly", () => {
      req = {
        params: { id: "507f1f77bcf86cd799439011" },
      } as unknown as Request;

      const middleware = validateParams(paramSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("[Validation] should return validation error if param fails schema check", () => {
      req = {
        params: { id: "invalid-id" },
      } as unknown as Request;

      const middleware = validateParams(paramSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ id: expect.any(String) }),
        "validation.failed",
        "en"
      );
    });
  });

  /* =========================================================================
   * validateQuery Middleware Tests
   * ========================================================================= */
  describe("validateQuery", () => {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
    });

    it("[Positive] should sanitize and validate query params successfully and call next()", () => {
      req = {
        query: { page: "5" },
      } as unknown as Request;

      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(5); // converted to integer
    });

    it("[Validation] should return validation error if query fails validation rules", () => {
      req = {
        query: { page: "0" }, // less than minimum 1
      } as unknown as Request;

      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ page: expect.any(String) }),
        "validation.failed",
        "en"
      );
    });
  });
});
