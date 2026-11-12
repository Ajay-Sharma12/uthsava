import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { homeService } from '../services/home.service';
import { ResponseHandler } from '../../../common/responses/response.handler';
import { getLanguage } from '../../shared/helpers/language.helper';
import { extractProfileId } from '../../shared/helpers/profile.helper';

/**
 * Controller handling Home Screen HTTP requests for Master Data & Filtered Content Data.
 * Extracts profile ID from header (`id: <profileId>`).
 */
export class HomeController {
  /**
   * Get Master Data for Home Screen.
   * GET /api/v1/home/master-data
   * Header: `id: <Account_Profile_ID>`
   * Query params:
   *  - categoryId / category: Optional category filter for banner items ('ALL', 'MOVIE', 'SERIES', or Category ID)
   */
  async getMetaData(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const categoryId = (req.query.category) as string | undefined;

      const data = await homeService.getMetaData(userId, profileId, categoryId);

      return ResponseHandler.success(res, data, 'home.dataRetrievedSuccess', lang);
    } catch (error: any) {
      if (error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'home.profileIdRequired', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'home.profileNotFound', lang);
      }
      return ResponseHandler.error(res, 'home.loadError', lang, 500, error);
    }
  }

  /**
   * Get Filtered Content Data for Home Screen rails.
   * GET /api/v1/home/content-data
   * Header: `id: <Account_Profile_ID>`
   * Query params:
   *  - genreId / genre: Dynamic Genre ID or slug (e.g. Horror)
   *  - categoryId / category: Dynamic Category ID or type (e.g. MOVIE, SERIES)
   *  - type: Section type filter ("recommended for you", "upcoming release", "top rated", "your next watch")
   *  - page, limit
   */
  async getSections(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const { genreId: rawGenreId, category: rawCategory, page, limit, type, excludeId } = req.query as {
        genreId?: string;
        category?: string;
        page?: string;
        limit?: string;
        type?: string;
        excludeId?: string;
      };
      const category = rawCategory === 'movie' || rawCategory === 'series' ? rawCategory : 'all';

      const data = await homeService.getSections(userId, profileId, {
        genreId: rawGenreId,
        categoryId: category,
        type,
        excludeId,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      });

      return ResponseHandler.success(res, data, 'home.dataRetrievedSuccess', lang);
    } catch (error: any) {
      if (error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'home.profileIdRequired', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'home.profileNotFound', lang);
      }
      return ResponseHandler.error(res, 'home.loadError', lang, 500, error);
    }
  }

  /**
   * Get full details for a Movie or Series content item.
   * GET /api/v1/home/content/:id
   * Header: `id: <Account_Profile_ID>`
   * Path Param: `id` (Content ID)
   */
  async getContentDetail(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const contentId = req.params.id;

      if (!contentId || !Types.ObjectId.isValid(contentId)) {
        return ResponseHandler.badRequest(res, 'content.invalidId', lang);
      }

      const data = await homeService.getContentDetail(userId, profileId, contentId);

      return ResponseHandler.success(res, data, 'content.detailsRetrievedSuccess', lang);
    } catch (error: any) {
      if (error.message === 'CONTENT_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'content.notFound', lang);
      }
      if (error.message === 'CONTENT_RESTRICTED') {
        return ResponseHandler.forbidden(res, 'content.restrictedForProfile', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'home.profileNotFound', lang);
      }
      return ResponseHandler.error(res, 'content.loadError', lang, 500, error);
    }
  }
}

export const homeController = new HomeController();
