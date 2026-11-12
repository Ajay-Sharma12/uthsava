import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { TutorialSlideService } from "../../admin/services/tutorial-slide.service";

// ─── Mobile / TV Tutorial Slide Controller ───────────────────────────────────
//
// This controller powers the onboarding / tutorial carousel shown to users on
// the mobile app and TV app BEFORE they authenticate.
//
// Features:
//  - No authentication required (public endpoint)
//  - Returns ALL active slides in a single response (no pagination)
//  - Sorted by sequence ascending

/**
 * GET /api/v1/tutorial-slides
 *
 * Returns every ACTIVE tutorial slide sorted by sequence ascending.
 * Used by:
 *   - Mobile app  – onboarding flow before login
 *   - TV app      – pre-login tutorial carousel
 *
 * No token or pagination required.
 */
export const getActiveTutorialSlides = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const lang = getLanguage(req);

    const slides = await TutorialSlideService.getActiveSlides();
    const data = slides.map((slide: any) =>
      TutorialSlideService.formatListItem(slide),
    );

    return ResponseHandler.success(res, data, "general.success", lang);
  } catch (error) {
    logger.error("[Tutorial] Get active slides error:", error);
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
