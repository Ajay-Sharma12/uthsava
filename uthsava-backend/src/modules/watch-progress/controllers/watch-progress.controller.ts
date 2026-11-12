import { Request, Response } from 'express';
import { watchProgressService } from '../services/watch-progress.service';
import { extractProfileId } from '../../shared/helpers/profile.helper';
import { ResponseHandler } from '../../../common/responses/response.handler';
import { getLanguage } from '../../shared/helpers/language.helper';
import { HTTP_STATUS } from '../../../core/constants/app.constants';

/**
 * Controller handling playback watch progress and Continue Watching section endpoints.
 * Resolves target account ID from request header `id` (`req.headers.id`).
 */
export class WatchProgressController {
  /**
   * Save or update watch progress position.
   * POST /api/v1/watch-progress
   * Header: `id: <Account_Profile_ID>`
   */
  async updateProgress(req: Request, res: Response) {
    const lang = getLanguage(req);

    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const { contentId, seasonId, episodeId } = req.body;
      const watchedDuration = Number(req.body.watchedDuration);

      if (!contentId || isNaN(watchedDuration)) {
        return ResponseHandler.badRequest(res, 'general.requiredField', lang);
      }

      const progress = await watchProgressService.updateProgress(userId, profileId, {
        contentId, seasonId, episodeId, watchedDuration,
      });

      return ResponseHandler.success(res, progress, 'general.success', lang);
    } catch (error: any) {
      if (error.message === 'WATCHED_DURATION_EXCEEDS_TOTAL') {
        return ResponseHandler.badRequest(res, 'watchProgress.watchedDurationExceedsTotal', lang);
      }
      if (error.message === 'INVALID_WATCHED_DURATION' || error.message === 'INVALID_CONTENT_ID' || error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'general.requiredField', lang);
      }
      if (error.message === 'CONTENT_NOT_FOUND' || error.message === 'EPISODE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'watchlist.contentNotFound', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'home.profileNotFound', lang);
      }
      return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
  }

  /**
   * Remove item from Continue Watching.
   * DELETE /api/v1/watch-progress/:id
   * Header: `id: <Account_Profile_ID>`
   */
  async removeFromContinueWatching(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const id = req.params.id;
      const profileId = extractProfileId(req);

      if (!id) {
        return ResponseHandler.badRequest(res, 'general.requiredField', lang);
      }

      const result = await watchProgressService.removeFromContinueWatching(userId, profileId, id);
      return ResponseHandler.success(res, result, 'general.success', lang);
    } catch (error: any) {
      if (error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'general.requiredField', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'watchlist.contentNotFound', lang);
      }
      return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
  }

  /**
   * Get Continue Watching listing for profile.
   * GET /api/v1/watch-progress
   * Header: `id: <Account_Profile_ID>`
   */
  async getContinueWatchingList(req: Request, res: Response) {
    const lang = getLanguage(req);
    try {
      const userId = req.user?._id as string;
      const profileId = extractProfileId(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await watchProgressService.getContinueWatchingList(userId, profileId, page, limit);
      return ResponseHandler.success(res, result, 'general.success', lang);
    } catch (error: any) {
      if (error.message === 'PROFILE_ID_REQUIRED' || error.message === 'INVALID_USER_ID') {
        return ResponseHandler.badRequest(res, 'general.requiredField', lang);
      }
      if (error.message === 'PROFILE_NOT_FOUND') {
        return ResponseHandler.notFound(res, 'watchlist.contentNotFound', lang);
      }
      return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
  }
}

export const watchProgressController = new WatchProgressController();
