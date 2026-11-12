import { Router } from "express";
import { Request, Response } from "express";
import { CmsPageService } from "../admin/services/cms-page.service";
import { ResponseHandler } from "../../common/responses/response.handler";
import { getLanguage } from "../shared/helpers/language.helper";
import { HTTP_STATUS } from "../../core/constants/app.constants";
import { logger } from "../../core/constants/logger";

const router = Router();

/**
 * Reusable handler: fetch a CMS page by its fixed slug
 */
const serveStaticPage =
  (slug: string) => async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    try {
      const page = await CmsPageService.getPageBySlug(slug);
      return ResponseHandler.success(res, page, "general.success", lang);
    } catch (error: any) {
      logger.error(`Static page error [${slug}]:`, error);
      if (error.message === "Page not found") {
        return ResponseHandler.error(
          res,
          "cms.pageNotFound",
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

/**
 * Public Static Page Routes
 * Base path: /api/v1/static
 *
 * GET /api/v1/static/about-us
 * GET /api/v1/static/privacy-policy
 * GET /api/v1/static/terms-and-conditions
 *
 * These are read-only public endpoints — no auth required.
 * Content is managed via the admin CMS module.
 */
router.get("/about-us", serveStaticPage("about-us"));
router.get("/privacy-policy", serveStaticPage("privacy-policy"));
router.get("/terms-and-conditions", serveStaticPage("terms-and-conditions"));

export default router;
