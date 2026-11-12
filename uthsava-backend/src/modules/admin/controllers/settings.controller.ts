import { Request, Response } from "express";
import { SettingsService } from "../services/settings.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ─── Full settings ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/settings
 * Returns the full settings document (all sections).
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const settings = await SettingsService.getSettings();
    return ResponseHandler.success(res, settings, "settings.retrieved", lang);
  } catch (error: any) {
    logger.error("Get settings error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PUT /api/v1/admin/settings
 * Update any combination of settings fields in one call.
 */
export const updateSettings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const body = { ...req.body };
    // Normalise frontend aliases → canonical field name
    if (
      body.freePreviewDuration !== undefined &&
      body.freePreviewDurationMinutes === undefined
    ) {
      body.freePreviewDurationMinutes = body.freePreviewDuration;
    }
    if (
      body.previewDuration !== undefined &&
      body.freePreviewDurationMinutes === undefined
    ) {
      body.freePreviewDurationMinutes = body.previewDuration;
    }
    delete body.freePreviewDuration;
    delete body.previewDuration;
    const settings = await SettingsService.createOrUpdateSettings(
      body,
      req.user?.sub,
    );

    AuditLogService.logAction({
      adminId: req.user?.sub,
      module: AuditModule.SETTINGS,
      action: "Update Platform Settings",
      newData: body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, settings, "settings.updated", lang);
  } catch (error: any) {
    logger.error("Update settings error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

// ─── Free Preview ─────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/admin/settings/free-preview
 * Update free preview toggle and/or duration.
 *
 * Body: { freePreviewEnabled?: boolean, freePreviewDurationMinutes?: number }
 */
export const updateFreePreview = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { freePreviewEnabled, freePreviewDurationMinutes } = req.body;
    const settings = await SettingsService.updateFreePreview(
      { freePreviewEnabled, freePreviewDurationMinutes },
      req.user?.sub,
    );
    return ResponseHandler.success(res, settings, "settings.updated", lang);
  } catch (error: any) {
    logger.error("Update free preview error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

// ─── Revenue Brackets ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/settings/revenue-brackets
 * List all revenue brackets sorted by fromViews ascending.
 */
export const getRevenueBrackets = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const brackets = await SettingsService.getRevenueBrackets();
    return ResponseHandler.success(res, { brackets }, "general.success", lang);
  } catch (error: any) {
    logger.error("Get revenue brackets error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * POST /api/v1/admin/settings/revenue-brackets
 * Add a new revenue bracket.
 *
 * Body: { fromViews: number, toViews: number, amountPerView: number }
 */
export const addRevenueBracket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const settings = await SettingsService.addRevenueBracket(
      req.body,
      req.user?.sub,
    );
    return ResponseHandler.success(
      res,
        {
    brackets: settings.revenueBrackets,
    yearlySubscriptionDiscount:
      settings.yearlySubscriptionDiscount,
    payoutFrequencyDays: settings.payoutFrequencyDays,
  },
      "settings.updated",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Add revenue bracket error:", error);
    const lang = getLanguage(req);
    if (error.message?.includes("overlaps")) {
      return ResponseHandler.validationError(
        res,
        { bracket: error.message },
        "validation.failed",
        lang,
      );
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PUT /api/v1/admin/settings/revenue-brackets/:bracketId
 * Update an existing revenue bracket.
 *
 * Body: { fromViews?: number, toViews?: number, amountPerView?: number }
 */
export const updateRevenueBracket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { oldBracket, newBracket } = req.body;
    const brackets = await SettingsService.updateRevenueBracket(
      oldBracket,
      newBracket,
      req.user?.sub,
    );
    return ResponseHandler.success(res, { brackets }, "settings.updated", lang);
  } catch (error: any) {
    logger.error("Update revenue bracket error:", error);
    const lang = getLanguage(req);
    if (error.message === "error.revenueBracketNotFound") {
      return ResponseHandler.error(
        res,
        "general.notFound",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (error.message?.includes("overlaps")) {
      return ResponseHandler.validationError(
        res,
        { bracket: error.message },
        "validation.failed",
        lang,
      );
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * DELETE /api/v1/admin/settings/revenue-brackets/:bracketId
 * Delete a revenue bracket.
 */
export const deleteRevenueBracket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const bracket = req.body;
    const brackets = await SettingsService.deleteRevenueBracket(
      bracket,
      req.user?.sub,
    );
    return ResponseHandler.success(res, { brackets }, "settings.updated", lang);
  } catch (error: any) {
    logger.error("Delete revenue bracket error:", error);
    const lang = getLanguage(req);
    if (error.message === "error.revenueBracketNotFound") {
      return ResponseHandler.error(
        res,
        "general.notFound",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

// ─── Payout Settings ──────────────────────────────────────────────────────────

/**
 * PUT /api/v1/admin/settings/payout
 * Update payout frequency.
 *
 * Body: { payoutFrequencyDays: number }
 */
export const updatePayoutSettings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { payoutFrequencyDays } = req.body;
    const settings = await SettingsService.updatePayoutSettings(
      { payoutFrequencyDays },
      req.user?.sub,
    );
    return ResponseHandler.success(res, settings, "settings.updated", lang);
  } catch (error: any) {
    logger.error("Update payout settings error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};
