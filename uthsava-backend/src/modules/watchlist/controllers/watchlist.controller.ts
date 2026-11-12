import { Request, Response } from 'express';
import { watchlistService } from '../services/watchlist.service';
import { ResponseHandler } from '../../../common/responses/response.handler';
import { getLanguage } from '../../shared/helpers/language.helper';
import { HTTP_STATUS } from '../../../core/constants/app.constants';
import { extractProfileId } from '../../shared/helpers/profile.helper';

/**
 * Controller handling HTTP requests for Watchlist operations.
 * Two clean endpoints: listing and unified add/remove/toggle.
 */
export class WatchlistController {
  /**
   * GET /api/v1/watchlist
   * Retrieve the authenticated user's profile watchlist with pagination.
   *
   * Query Params:
   *   - page (number, optional, default 1)
   *   - limit (number, optional, default 20)
   *
   * Header: id: <Profile_ID>  (optional — resolves default profile if omitted)
   */
  async getWatchlist(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await watchlistService.getWatchlist(userId, profileId, page, limit);
      return ResponseHandler.success(res, result, 'watchlist.retrieved', lang);
    } catch (error: any) {
      if (error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'home.profileIdRequired', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'home.profileNotFound', lang);
      }
      return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
  }

  /**
   * POST /api/v1/watchlist
   * Unified endpoint to Add, Remove, or Toggle a content item in the watchlist.
   *
   * Request Body:
   *   - contentId (string, required): ID of the target content
   *   - action ("add" | "remove" | "toggle", optional): defaults to "toggle"
   *
   * Header: id: <Profile_ID>  (optional — resolves default profile if omitted)
   */
  async manageWatchlist(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const { contentId } = req.body;

      if (!contentId) {
        return ResponseHandler.badRequest(res, 'watchlist.contentIdRequired', lang);
      }

      const result = await watchlistService.manageWatchlist(userId, profileId, contentId);
      const message = result.action === 'added' ? 'watchlist.added' : 'watchlist.removed';
      return ResponseHandler.success(res, result, message, lang);
    } catch (error: any) {
      if (error.message === 'INVALID_CONTENT_ID' || error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'watchlist.invalidContentId', lang);
      }
      if (error.message === 'CONTENT_NOT_FOUND' || error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'watchlist.contentNotFound', lang);
      }
      return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
  }
}

export const watchlistController = new WatchlistController();
