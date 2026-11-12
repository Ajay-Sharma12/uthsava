import { Types } from 'mongoose';
import { WatchProgress, Content, Episode, ContentStatus, ContentApprovalStatus } from '../../../models';
import { homeService } from '../../home/services/home.service';

/**
 * Service for managing user playback progress and Continue Watching section.
 */
export class WatchProgressService {
  /**
   * Save or update playback progress for Movies or Series Episodes.
   *
   * @param userId Authenticated user ID
   * @param profileId Optional User profile ID
   * @param data Watch progress payload (contentId, seasonId, episodeId, watchedDuration)
   */
  async updateProgress(
    userId: string,
    profileId: string | undefined,
    data: {
      contentId: string;
      seasonId?: string;
      episodeId?: string;
      watchedDuration: number;
    }
  ) {
    const profile = await homeService.getUserProfile(userId, profileId);
    const { contentId, seasonId, episodeId, watchedDuration } = data;

    if (!contentId || !Types.ObjectId.isValid(contentId)) {
      throw new Error('INVALID_CONTENT_ID');
    }

    if (watchedDuration < 0) {
      throw new Error('INVALID_WATCHED_DURATION');
    }

    let totalDuration = 0;

    if (episodeId && Types.ObjectId.isValid(episodeId)) {
      const episode = await Episode.findOne({
        _id: new Types.ObjectId(episodeId),
        contentId: new Types.ObjectId(contentId),
      })
        .select('duration video')
        .lean();

      if (!episode) {
        throw new Error('EPISODE_NOT_FOUND');
      }

      totalDuration = episode.duration || (typeof episode.video === 'object' ? episode.video.duration || 0 : 0) || 0;
    } else {
      const content = await Content.findById(contentId).select('duration').lean();
      if (!content) {
        throw new Error('CONTENT_NOT_FOUND');
      }
      totalDuration = content.duration || 0;
    }

    if (totalDuration > 0 && watchedDuration > totalDuration) {
      throw new Error('WATCHED_DURATION_EXCEEDS_TOTAL');
    }

    const isCompleted = totalDuration > 0 && watchedDuration / totalDuration >= 0.95;

    const progressFilter: any = {
      userId: new Types.ObjectId(userId),
      profileId: profile._id,
      contentId: new Types.ObjectId(contentId),
    };

    if (seasonId && Types.ObjectId.isValid(seasonId)) {
      progressFilter.seasonId = new Types.ObjectId(seasonId);
    }

    if (episodeId && Types.ObjectId.isValid(episodeId)) {
      progressFilter.episodeId = new Types.ObjectId(episodeId);
    }

    const progressData = {
      watchedDuration,
      totalDuration,
      isCompleted,
      lastWatchedAt: new Date(),
      ...(isCompleted && { completedAt: new Date() }),
    };

    return WatchProgress.findOneAndUpdate(progressFilter, progressData, { upsert: true, new: true });
  }

  /**
   * Remove content from Continue Watching rail for a profile.
   *
   * @param userId Authenticated user ID
   * @param profileId Optional User profile ID
   * @param id ID of the progress record or contentId
   */
  async removeFromContinueWatching(
    userId: string,
    profileId: string | undefined,
    id: string
  ) {
    const profile = await homeService.getUserProfile(userId, profileId);

    if (!Types.ObjectId.isValid(id)) {
      return { removed: false };
    }

    const progress = await WatchProgress.findOneAndDelete({
      profileId: profile._id,
      $or: [
        { _id: new Types.ObjectId(id) },
        { contentId: new Types.ObjectId(id) },
      ],
    });
    return { removed: !!progress };
  }

  /**
   * Fetch active Continue Watching list for a user profile.
   * Filters out completed playback items (`isCompleted = false`).
   *
   * @param userId Authenticated user ID
   * @param profileId Optional User profile ID
   * @param page Page number
   * @param limit Items limit
   */
  async getContinueWatchingList(userId: string, profileId?: string, page = 1, limit = 20) {
    const profile = await homeService.getUserProfile(userId, profileId);
    const resolvedProfileId = profile._id;

    const skip = (page - 1) * limit;

    const query = { profileId: resolvedProfileId, isCompleted: false };

    const [watchProgress, total] = await Promise.all([
      WatchProgress.find(query)
        .sort({ lastWatchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'contentId',
          match: {
            status: ContentStatus.ACTIVE,
            approvalStatus: ContentApprovalStatus.APPROVED,
          },
          populate: {
            path: 'genreIds',
            select: 'name code',
          },
        })
        .populate('seasonId')
        .populate('episodeId')
        .lean(),

      WatchProgress.countDocuments(query),
    ]);

    // Format response payload for frontend rail cards
    const formattedItems = watchProgress
      .filter((item) => item.contentId !== null)
      .map((item: any) => {
        const watchedSec = item.watchedDuration || 0;
        const totalSec = item.totalDuration || 1;
        const progressPercentage = Math.min(100, Math.round((watchedSec / totalSec) * 100));
        return {
          progressId: item._id,
          content: item.contentId,
          episode: item.episodeId || null,
          season: item.seasonId || null,
          watchedDuration: item.watchedDuration,
          totalDuration: item.totalDuration,
          progressPercentage,
          lastWatchedAt: item.lastWatchedAt,
        };
      });

    return {
      items: formattedItems,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const watchProgressService = new WatchProgressService();
