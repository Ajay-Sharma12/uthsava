import { Types } from 'mongoose';
import { Content, WatchProgress, Watchlist, Genre, AgeCategory, AgeRating } from '../../../models';
import { resolveMediaUrl } from './url.helper';
import { PaginationHelper } from './pagination.helper';

/**
 * Helper: Formats standard content cards and attaches watchlist status.
 */
export const formatContentCards = async (items: any[], profileId: Types.ObjectId) => {
  if (items.length === 0) return [];

  const contentIds = items.map((i) => i._id);
  const watchlistDocs = await Watchlist.find({
    profileId,
    contentId: { $in: contentIds },
  }).select('contentId');

  const watchlistIds = watchlistDocs.map((w) => w.contentId.toString());

  return items.map((item) => ({
    _id: item._id,
    title: item.title,
    type: item.type,
    poster: resolveMediaUrl((item.poster && item.poster[0]) || item.thumbnail),
    banner: resolveMediaUrl((item.banner && item.banner[0]) || item.thumbnail),
    thumbnail: resolveMediaUrl(item.thumbnail || (item.poster && item.poster[0])),
    releaseYear: item.releaseYear || (item.releaseDate ? new Date(item.releaseDate).getFullYear() : null),
    releaseDate: item.releaseDate ? new Date(item.releaseDate).toISOString() : null,
    rating: item.rating || item.imdb?.rating || null,
    ageRating: item.ageRating || (item.ageCategory === AgeCategory.KIDS ? AgeRating.U : null),
    isInWatchlist: watchlistIds.includes(item._id.toString()),
    genreIds: (item.genreIds || []).map((g: any) => (g?._id ? g._id.toString() : g?.toString())),
  }));
};

/**
 * Section Helper: Recommended For You
 * Returns max 10 content items combining user-selected genres & watch history with randomness.
 */
export const getRecommendedSection = async (profile: any, baseQuery: any, page = 1, limit = 10, userGenres: string[] = []) => {
  const watchedGenreSet = new Set<string>([
    ...userGenres,
    ...(profile.favoriteGenreIds || []).map(String),
  ]);
  const watchedContentIds = new Set<string>();

  const [recentProgress, watchlist] = await Promise.all([
    WatchProgress.find({ profileId: profile._id }).sort({ lastWatchedAt: -1 }).limit(15).populate({ path: 'contentId', select: 'genreIds' }).lean(),
    Watchlist.find({ profileId: profile._id }).limit(20).populate({ path: 'contentId', select: 'genreIds' }).lean(),
  ]);

  recentProgress.forEach((item: any) => {
    if (!item.contentId) return;
    watchedContentIds.add(item.contentId._id.toString());
    item.contentId.genreIds?.forEach((genre: any) =>
      watchedGenreSet.add((genre._id || genre).toString())
    );
  });

  watchlist.forEach((item: any) => {
    if (!item.contentId) return;
    item.contentId.genreIds?.forEach((genre: any) =>
      watchedGenreSet.add((genre._id || genre).toString())
    );
  });

  if (watchedContentIds.size && !baseQuery._id) {
    baseQuery._id = {
      $nin: [...watchedContentIds].map((id: string) => new Types.ObjectId(id)),
    };
  }

  if (watchedGenreSet.size && !baseQuery.genreIds) {
    baseQuery.genreIds = {
      $in: [...watchedGenreSet].map((id: string) => new Types.ObjectId(id)),
    };
  }

  const skip = (page - 1) * limit;

  const [result] = await Content.aggregate([
    { $match: baseQuery },

    {
      $facet: {
        items: [
          { $sort: { viewsCount: -1, likesCount: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const items = result.items;
  const total = result.total[0]?.count || 0;

  return {
    ...PaginationHelper.buildPaginationMeta(total, page, limit),
    docs: await formatContentCards(items, profile._id),
  };
};


/**
 * Section Helper: Upcoming Releases
 * Returns ONLY unreleased content (releaseDate > now). Returns [] if no upcoming content exists.
 */
export const getUpcomingReleasesSection = async (baseQuery: any, profile: any, page = 1, limit = 10) => {
  const now = new Date();

  const query: any = {
    ...baseQuery,
    releaseDate: { $gt: now },
  };

  const skip = (page - 1) * limit;

  const [result] = await Content.aggregate([
    { $match: query },

    {
      $facet: {
        items: [
          { $sort: { releaseDate: 1 } },
          { $skip: skip },
          { $limit: limit },
        ],

        total: [
          { $count: 'count' },
        ],
      },
    },
  ]);

  const items = result.items;
  const total = result.total[0]?.count || 0;


  return {
    ...PaginationHelper.buildPaginationMeta(total, page, limit),
    docs: await formatContentCards(items, profile._id),
  };
};

/**
 * Section Helper: Top Rated
 * Returns highest rated content sorted by rating, likes, views.
 */
export const getTopRatedSection = async (profile: any, baseQuery: any, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [result] = await Content.aggregate([
    { $match: baseQuery },

    {
      $facet: {
        items: [
          {
            $sort: {
              rating: -1,
              'imdb.rating': -1,
              likesCount: -1,
              viewsCount: -1,
              createdAt: -1,
            },
          },
          { $skip: skip },
          { $limit: limit },
        ],

        total: [
          { $count: 'count' },
        ],
      },
    },
  ]);

  const items = result.items;
  const total = result.total[0]?.count || 0;
  return {
    ...PaginationHelper.buildPaginationMeta(total, page, limit),
    docs: await formatContentCards(items, profile._id),
  };
};

/**
 * Section Helper: Single Genre Rail
 * Returns content matching the requested genreId.
 */
export const getSingleGenreSection = async (genreId: string, baseQuery: any, profileId: Types.ObjectId, page = 1, limit = 10) => {
  const emptyResponse = {
    ...PaginationHelper.buildPaginationMeta(0, page, limit),
    docs: [],
  };

  if (!genreId || !Types.ObjectId.isValid(genreId)) {
    return emptyResponse;
  }

  const genre = await Genre.findById(genreId)
    .select('name')
    .lean();
  if (!genre) {
    return emptyResponse;
  }

  const query = { ...baseQuery, genreIds: new Types.ObjectId(genreId), };
  const skip = (page - 1) * limit;

  const [result] = await Content.aggregate([
    { $match: query },

    {
      $facet: {
        items: [
          {
            $sort: {
              viewsCount: -1,
              likesCount: -1,
              createdAt: -1,
            },
          },
          { $skip: skip },
          { $limit: limit },
        ],

        total: [
          { $count: 'count' },
        ],
      },
    },
  ]);

  const items = result.items;
  const total = result.total[0]?.count || 0;

  return {
    ...PaginationHelper.buildPaginationMeta(total, page, limit),
    docs: await formatContentCards(items, profileId),
  };
};

