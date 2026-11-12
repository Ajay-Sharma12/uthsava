import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ResponseHandler } from "../../common/responses/response.handler";
import { getLanguage } from "../../modules/shared/helpers/language.helper";
export const validateBody =
  (schema: Joi.Schema) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        /* =========================================
           PARSE JSON STRINGS FROM FORMDATA
        ========================================= */

        const fieldsToParse = [
          "genre",
          "genres",
          "cast",
          "castAndCrew",
          "crew",
          "tags",
        ];

        fieldsToParse.forEach((field) => {
          if (req.body[field] && typeof req.body[field] === "string") {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch (err) {
              console.error(`Failed to parse ${field}`, err);
            }
          }
        });

        /* =========================================
           JOI VALIDATION
        ========================================= */

        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const lang = getLanguage(req);

          const errors: Record<string, string> = {};

          error.details.forEach((detail) => {
            const field = detail.path.join(".");
            errors[field] = detail.message;
          });

          return ResponseHandler.validationError(
            res,
            errors,
            "validation.failed",
            lang,
          );
        }

        req.body = value;

        next();
      } catch (err) {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Validation middleware error",
        });
      }
    };

export const validateParams =
  (schema: Joi.ObjectSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.params, { abortEarly: false });

      if (error) {
        const lang = getLanguage(req);

        // Format validation errors with field names as keys
        const errors: Record<string, string> = {};
        error.details.forEach((detail) => {
          const field = detail.path.join(".");
          errors[field] = detail.message;
        });

        return ResponseHandler.validationError(
          res,
          errors,
          "validation.failed",
          lang,
        );
      }

      // Replace req.params with validated and sanitized value
      req.params = value;
      next();
    };

export const validateQuery =
  (schema: Joi.ObjectSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.query, { abortEarly: false });

      if (error) {
        const lang = getLanguage(req);

        // Format validation errors with field names as keys
        const errors: Record<string, string> = {};
        error.details.forEach((detail) => {
          const field = detail.path.join(".");
          errors[field] = detail.message;
        });

        return ResponseHandler.validationError(
          res,
          errors,
          "validation.failed",
          lang,
        );
      }

      // Replace req.query with validated and sanitized value
      req.query = value;
      next();
    };
