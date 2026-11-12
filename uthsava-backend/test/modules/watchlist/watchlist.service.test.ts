/// <reference types="jest" />
import { watchlistService } from '../../../src/modules/watchlist/services/watchlist.service';
import { Watchlist, Content, UserProfile, ProfileType } from '../../../src/models';
import mongoose, { Types } from 'mongoose';

jest.mock('../../../src/models', () => {
  const original = jest.requireActual('../../../src/models');
  return {
    ...original,
    Watchlist: {
      findOne: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    },
    Content: {
      findById: jest.fn(),
      findOne: jest.fn(),
    },
    UserProfile: {
      findOne: jest.fn(),
    },
  };
});

describe('WatchlistService Extensive Unit Tests', () => {
  const mockUserId = new Types.ObjectId().toString();
  const mockProfileId = new Types.ObjectId().toString();
  const mockContentId = new Types.ObjectId().toString();

  const createProfileMock = (res: any) => ({
    sort: jest.fn().mockResolvedValue(res),
    then: (resolve: any, reject: any) => Promise.resolve(res).then(resolve, reject),
  });

  const mockQueryHelper = (result: any = []) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockProfile = { _id: new Types.ObjectId(mockProfileId), profileType: ProfileType.STANDARD };
    (UserProfile.findOne as jest.Mock).mockReturnValue(createProfileMock(mockProfile));
    // Default: content exists and is active
    (Content.findOne as jest.Mock).mockResolvedValue({ _id: mockContentId, title: 'Movie' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  /* =========================================================================
   * addToWatchlist — returns res.entry (the created/existing document or undefined when already present)
   * ========================================================================= */
  describe('addToWatchlist', () => {
    it('[POS] should create a watchlist entry and return it when not already present', async () => {
      const createdEntry = { _id: new Types.ObjectId(), contentId: mockContentId };
      (Watchlist.findOne as jest.Mock).mockResolvedValue(null); // not in watchlist yet
      (Watchlist.create as jest.Mock).mockResolvedValue(createdEntry);

      const res = await watchlistService.addToWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(Watchlist.create).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    it('[EDGE] should return existing entry without creating duplicate when already in watchlist', async () => {
      const existingEntry = { _id: new Types.ObjectId(), contentId: mockContentId };
      (Watchlist.findOne as jest.Mock).mockResolvedValue(existingEntry); // already in watchlist

      const res = await watchlistService.addToWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(Watchlist.create).not.toHaveBeenCalled();
      expect(res).toEqual(existingEntry); // returns existing entry
    });

    it('[NEG] should throw CONTENT_NOT_FOUND when contentId does not exist in DB', async () => {
      (Content.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        watchlistService.addToWatchlist(mockUserId, mockProfileId, mockContentId)
      ).rejects.toThrow('CONTENT_NOT_FOUND');
    });

    it('[NEG] should throw INVALID_CONTENT_ID when contentId format is invalid', async () => {
      await expect(
        watchlistService.addToWatchlist(mockUserId, mockProfileId, 'not_valid_objectid')
      ).rejects.toThrow('INVALID_CONTENT_ID');
    });
  });

  /* =========================================================================
   * removeFromWatchlist — returns { removed: boolean }
   * ========================================================================= */
  describe('removeFromWatchlist', () => {
    it('[POS] should delete item from watchlist and return removed = true when present', async () => {
      const existingEntry = { _id: new Types.ObjectId() };
      (Watchlist.findOne as jest.Mock).mockResolvedValue(existingEntry);
      (Watchlist.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const res = await watchlistService.removeFromWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(Watchlist.deleteOne).toHaveBeenCalledWith({ _id: existingEntry._id });
      expect(res.removed).toBe(true);
    });

    it('[EDGE] should return removed = true even when item was not in watchlist (remove is idempotent)', async () => {
      (Watchlist.findOne as jest.Mock).mockResolvedValue(null); // not in watchlist

      const res = await watchlistService.removeFromWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(Watchlist.deleteOne).not.toHaveBeenCalled();
      expect(res.removed).toBe(true); // action is still 'removed'
    });

    it('[NEG] should throw CONTENT_NOT_FOUND when contentId is not an active content', async () => {
      (Content.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        watchlistService.removeFromWatchlist(mockUserId, mockProfileId, mockContentId)
      ).rejects.toThrow('CONTENT_NOT_FOUND');
    });
  });

  /* =========================================================================
   * toggleWatchlist — returns { isInWatchlist: boolean, action: string }
   * ========================================================================= */
  describe('toggleWatchlist', () => {
    it('[POS] should add to watchlist and return isInWatchlist = true when not currently in list', async () => {
      (Watchlist.findOne as jest.Mock).mockResolvedValue(null); // not in watchlist
      (Watchlist.create as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

      const res = await watchlistService.toggleWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(res.isInWatchlist).toBe(true);
      expect(res.action).toBe('added');
    });

    it('[POS] should remove from watchlist and return isInWatchlist = false when currently in list', async () => {
      const existingEntry = { _id: new Types.ObjectId() };
      (Watchlist.findOne as jest.Mock).mockResolvedValue(existingEntry); // already in watchlist
      (Watchlist.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const res = await watchlistService.toggleWatchlist(mockUserId, mockProfileId, mockContentId);
      expect(res.isInWatchlist).toBe(false);
      expect(res.action).toBe('removed');
    });

    it('[NEG] should throw CONTENT_NOT_FOUND when content is inactive', async () => {
      (Content.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        watchlistService.toggleWatchlist(mockUserId, mockProfileId, mockContentId)
      ).rejects.toThrow('CONTENT_NOT_FOUND');
    });
  });

  /* =========================================================================
   * getWatchlist — returns paginated watchlist items
   * ========================================================================= */
  describe('getWatchlist', () => {
    it('[POS] should return paginated watchlist with populated content for profile', async () => {
      const mockWatchItem = {
        _id: new Types.ObjectId(),
        addedAt: new Date(),
        contentId: { _id: new Types.ObjectId(), title: 'Watchlist Movie', type: 'MOVIE', ageRating: 'U' },
      };
      (Watchlist.find as jest.Mock).mockImplementation(() => mockQueryHelper([mockWatchItem]));
      (Watchlist.countDocuments as jest.Mock).mockResolvedValue(1);

      const res = await watchlistService.getWatchlist(mockUserId, mockProfileId, 1, 10);
      expect(res.items.length).toBe(1);
      expect(res.pagination.total).toBe(1);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.totalPages).toBe(1);
    });

    it('[EDGE] should return empty items array when watchlist has no entries', async () => {
      (Watchlist.find as jest.Mock).mockImplementation(() => mockQueryHelper([]));
      (Watchlist.countDocuments as jest.Mock).mockResolvedValue(0);

      const res = await watchlistService.getWatchlist(mockUserId, mockProfileId, 1, 10);
      expect(res.items.length).toBe(0);
      expect(res.pagination.total).toBe(0);
    });

    it('[EDGE] should filter out null content (removed/inactive) from watchlist items', async () => {
      const mockNullItem = { _id: new Types.ObjectId(), addedAt: new Date(), contentId: null };
      (Watchlist.find as jest.Mock).mockImplementation(() => mockQueryHelper([mockNullItem]));
      (Watchlist.countDocuments as jest.Mock).mockResolvedValue(1);

      const res = await watchlistService.getWatchlist(mockUserId, mockProfileId, 1, 10);
      expect(res.items.length).toBe(0);
    });

    it('[VAL] should return correct pagination metadata for page 2 with limit 5', async () => {
      (Watchlist.find as jest.Mock).mockImplementation(() => mockQueryHelper([]));
      (Watchlist.countDocuments as jest.Mock).mockResolvedValue(12);

      const res = await watchlistService.getWatchlist(mockUserId, mockProfileId, 2, 5);
      expect(res.pagination.page).toBe(2);
      expect(res.pagination.limit).toBe(5);
      expect(res.pagination.totalPages).toBe(3);
      expect(res.pagination.total).toBe(12);
    });
  });
});
