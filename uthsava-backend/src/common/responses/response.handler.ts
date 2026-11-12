import { Response } from "express";
import i18n from "../../core/config/i18n";

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  results?: T;
  error?: any;
  errors?: Record<string, string>;
}

export class ResponseHandler {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data?: T,
    messageKey: string = "general.success",
    lang: "en" | "ar" | "hi" = "en",
    statusCode: number = 200,
  ): Response {
    i18n.setLocale(lang);

    // If data payload contains a inner message key string, translate it
    if (data && typeof data === "object" && (data as any).message && typeof (data as any).message === "string") {
      const innerMsg = (data as any).message;
      if (innerMsg.includes(".")) {
        (data as any).message = i18n.__(innerMsg);
      }
    }

    const response: ApiResponse<T> = {
      status: statusCode,
      success: true,
      message: i18n.__(messageKey),
      results: data,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    messageKey: string = "general.error",
    lang: "en" | "ar" | "hi" = "en",
    statusCode: number = 500,
    error?: any,
  ): Response {
    i18n.setLocale(lang);

    // If error is an object with template variables, use them
    let message: string;
    if (messageKey && typeof messageKey === "string" && messageKey.includes(":")) {
      const [key, ...params] = messageKey.split(":");
      message = i18n.__(key, ...params);
    } else if (error && typeof error === "object" && !error?.stack) {
      message = i18n.__(messageKey, error);
    } else {
      message = i18n.__(messageKey);
    }

    const response: ApiResponse = {
      status: statusCode,
      success: false,
      message: message,
      error: error?.stack ? error : undefined,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    messageKey: string = "auth.unauthorized",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 401);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    messageKey: string = "auth.forbidden",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 403);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    messageKey: string = "general.notFound",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 404);
  }

  /**
   * Send validation error response (400)
   */
  static validationError(
    res: Response,
    errors: Record<string, string>,
    messageKey: string = "validation.failed",
    lang: "en" | "ar" | "hi" = "en",
    statusCode: number = 400,
  ): Response {
    i18n.setLocale(lang);

    // Extract and translate the first validation error message
    let firstErrorMessage = "";
    Object.entries(errors).forEach(([_, messageKeyOrText]) => {
      let translatedText: string;
      if (typeof messageKeyOrText === "string") {
        translatedText = i18n.__(messageKeyOrText);
      } else {
        translatedText = String(messageKeyOrText);
      }
      if (!firstErrorMessage) {
        firstErrorMessage = translatedText;
      }
    });

    const response: ApiResponse = {
      status: statusCode,
      success: false,
      message: firstErrorMessage || i18n.__(messageKey),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send rate limit exceeded response (429)
   */
  static rateLimitExceeded(
    res: Response,
    messageKey: string = "general.rateLimitExceeded",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 429);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    messageKey: string = "general.conflict",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 409);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    messageKey: string = "general.badRequest",
    lang: "en" | "ar" | "hi" = "en",
  ): Response {
    return this.error(res, messageKey, lang, 400);
  }
}
