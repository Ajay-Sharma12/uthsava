import { Types } from 'mongoose';
import { Watchlist, Content, ContentStatus, ContentApprovalStatus } from '../../../models';
import { homeService } from '../../home/services/home.service';
import { PaginationHelper } from '../../shared/helpers/pagination.helper';

/**
 * Safely converts an ID string into a Mongoose Types.ObjectId.
 * Returns null if the provided string is invalid.
 *
 * @param id Raw ID value (string, ObjectId, undefined, or null)
 * @returns Mongoose ObjectId or null if invalid
 */
export const toValidObjectId = (id?: string | Types.ObjectId | null): Types.ObjectId | null => {
  if (!id) return null;
  if (id instanceof Types.ObjectId) return id;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
};

/**
 * Result structure returned by manageWatchlist method.
 */
export interface ManageWatchlistResult {
  isInWatchlist: boolean;
  action: 'added' | 'removed';
  entry?: typeof Watchlist.prototype;
}

/**
 * Service handling Watchlist operations for user profiles.
 * Encapsulates unified watchlist management (Add/Remove in 1 API), listing, and pagination.
 */
export class WatchlistService {
  /**
   *
   * @param userId Authenticated Parent User ID (from Bearer token)
   * @param profileId Optional Sub-Profile ID (defaults to user's primary profile)
   * @param contentId Target Content ID
   * @param action Optional explicit action ('add', 'remove', or 'toggle'). Defaults to 'toggle'
   * @returns Object containing isInWatchlist status, action executed ('added' | 'removed'), and entry data
   */
  async manageWatchlist(userId: string, profileId: string | undefined, contentId: string): Promise<ManageWatchlistResult> {
    const contentObjectId = toValidObjectId(contentId);
    if (!contentObjectId) {
      throw new Error('INVALID_CONTENT_ID');
    }
    const profile = await homeService.getUserProfile(userId, profileId);

    const contentExists = await Content.exists({ _id: contentObjectId, status: ContentStatus.ACTIVE, approvalStatus: ContentApprovalStatus.APPROVED });
    if (!contentExists) {
      throw new Error("CONTENT_NOT_FOUND");
    }

    const existingWatchlist = await Watchlist.findOne({ userId: new Types.ObjectId(userId), profileId: profile._id, contentId: contentObjectId });
    if (existingWatchlist) {
      await Watchlist.deleteOne({ _id: existingWatchlist._id });
      return { isInWatchlist: false, action: 'removed' };
    }
    await Watchlist.create({ userId: new Types.ObjectId(userId), profileId: profile._id, contentId: contentObjectId, addedAt: new Date() });
    return { isInWatchlist: true, action: 'added' };
  }

  /**
   * List all watchlist content items for a user profile with pagination.
   *
   * @param userId Authenticated User ID
   * @param profileId Optional Sub-Profile ID
   * @param page Page number (default 1)
   * @param limit Items per page (default 20)
   */
  async getWatchlist(userId: string, profileId?: string, page = 1, limit = 20) {
    const profile = await homeService.getUserProfile(userId, profileId);
    const skip = (page - 1) * limit;

    const [watchlistItems, total] = await Promise.all([
      Watchlist.find({ profileId: profile._id })
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'contentId',
          match: { status: ContentStatus.ACTIVE, approvalStatus: ContentApprovalStatus.APPROVED },
          populate: { path: 'genreIds', select: 'name code' },
        })
        .lean(),
      Watchlist.countDocuments({ profileId: profile._id }),
    ]);

    // Filter out null content references (deleted or inactive content)
    const watchlistContents = watchlistItems
      .filter((watchlist) => watchlist.contentId !== null)
      .map((watchlist) => ({ watchlistId: watchlist._id, addedAt: watchlist.addedAt, content: watchlist.contentId }));

    return { contents: watchlistContents, ...PaginationHelper.buildPaginationMeta(total, page, limit) }
  }
}

export const watchlistService = new WatchlistService();
