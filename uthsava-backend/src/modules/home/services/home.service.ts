import { Types } from 'mongoose';
import { User, UserProfile, ProfileType, AgeCategory, AgeRating, Genre, GenreStatus, Content, ContentType, ContentStatus, ContentApprovalStatus, Banner, BannerStatus, Admin, Season, Episode, Watchlist, WatchProgress, EpisodeStatus } from '../../../models';
import { getRecommendedSection, getUpcomingReleasesSection, getTopRatedSection, getSingleGenreSection, formatContentCards } from '../../shared/helpers/home-sections.helper';
import { PaginationHelper } from '../../shared/helpers/pagination.helper';
import { resolveMediaUrl } from '../../shared/helpers/url.helper';
import { getFullLanguageName, get2LetterLanguageCode } from '../../shared/helpers/language-name.helper';

/**
 * Filter options interface for Content Sections API
 */
export interface ContentDataFilters {
  genreId?: string;
  categoryId?: string;
  type?: string;
  page?: number;
  limit?: number;
  excludeId?: string;
}

/**
 * Home Service handling Home Screen HTTP business logic:
 * - Master Metadata Aggregation (Categories, User-Selected Genres, Hero Banners)
 * - Section Feeds (Recommended, Upcoming, Top Rated, Next Watch, Dynamic Genre Rails)
 */
export class HomeService {
  /**
   * Resolves the active user profile based on optional profileId header.
   * Falls back to default user profile or creates a default profile if none exists.
   */
  async getUserProfile(userId: string, profileId?: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('INVALID_USER_ID');
    }

    if (!profileId || !Types.ObjectId.isValid(profileId)) {
      throw new Error('PROFILE_ID_REQUIRED');
    }

    const profile = await UserProfile.findOne({
      _id: profileId,
      userId,
    }).lean();

    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    return profile;
  }

  /**
   * Helper: Resolves User Profile & Base Query with Age Rating Constraints
   */
  private async getProfileQueryContext(userId: string, profileId?: string) {
    const profile = await this.getUserProfile(userId, profileId);
    const isKids = profile.profileType === ProfileType.KIDS;

    const contentQuery: any = {
      status: ContentStatus.ACTIVE,
      approvalStatus: ContentApprovalStatus.APPROVED,
      releaseDate: { $lte: new Date() },
    };

    if (isKids) {
      contentQuery.$or = [
        { ageCategory: AgeCategory.KIDS },
        { ageRating: AgeRating.U },
      ];
    } else {
      contentQuery.$nor = [
        { ageCategory: AgeCategory.KIDS },
        { ageRating: AgeRating.U },
      ];
    }

    const user = await User.findById(userId).select('genres').lean();
    const rawGenreIds = [
      ...(user?.genres || []),
      ...(profile?.favoriteGenreIds || []),
    ].filter((id) => Types.ObjectId.isValid(id));

    if (rawGenreIds.length > 0) {
      const objectIdGenres = rawGenreIds.map((id) => new Types.ObjectId(id));
      contentQuery.genreIds = {
        $in: [...objectIdGenres, ...rawGenreIds],
      };
    }

    return { profile, isKids, contentQuery };
  }

  /**
   * Helper: Applies static Category Filter — only accepts 'all', 'movie', or 'series'.
   * Dynamic admin categories are intentionally NOT supported here.
   */
  private applyCategoryFilter(query: any, category?: string) {
    if (!category) return;
    if (category === 'movie') {
      query.type = ContentType.MOVIE;
    } else if (category === 'series') {
      query.type = ContentType.SERIES;
    }
    // 'all' or anything else — no filter applied
  }

  /**
   * Helper: Applies Genre Filter if specified.
   */
  private applyGenreFilter(query: any, genreId?: string) {
    if (!genreId) return;
    if (Types.ObjectId.isValid(genreId)) {
      query.genreIds = {
        $in: [new Types.ObjectId(genreId), genreId],
      };
    }
  }

  /**
   * Helper: Applies Exclude Content ID Filter if specified (useful for More Like This recommendations).
   */
  private applyExcludeFilter(query: any, excludeId?: string) {
    if (!excludeId || !Types.ObjectId.isValid(excludeId)) return;
    query._id = { $ne: new Types.ObjectId(excludeId) };
  }

  /**
   * Helper: Fetches and formats hero banner items for home screen metadata.
   * Connects Content and Series selected by Admin in Banner Manager.
   * Priority: Active Banner Manager items -> Fallback: Random Sampled Active Content.
   * Formats contentId -> content with selected lean fields, populated genreIds (_id, name), and resolved teaserVideo full URLs.
   */
  private async fetchHeroBanners(category?: string, profileId?: Types.ObjectId) {
    const banners = await Banner.find({
      status: BannerStatus.ACTIVE,
    })
      .populate({
        path: 'contentId',
        model: Content,
        select: '_id title shortDescription type genreIds releaseYear teaserVideo',
        populate: {
          path: 'genreIds',
          model: Genre,
          select: '_id name',
        },
      })
      .populate({
        path: 'createdBy',
        model: User,
        select: '_id firstName lastName fullName email',
      })
      .populate({
        path: 'updatedBy',
        model: User,
        select: '_id firstName lastName fullName email',
      })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    let watchlistSet = new Set<string>();
    if (profileId) {
      const contentIds = banners
        .map((b: any) => b.contentId?._id)
        .filter((id: any) => id && Types.ObjectId.isValid(id));

      if (contentIds.length > 0) {
        const watchlistDocs = await Watchlist.find({
          profileId,
          contentId: { $in: contentIds },
        }).select('contentId').lean();
        watchlistSet = new Set(watchlistDocs.map((w: any) => w.contentId.toString()));
      }
    }

    const formatUser = (user: any) => {
      if (!user) return null;
      if (typeof user === 'object' && (user._id || user.id)) {
        const name =
          user.fullName ||
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email ||
          'Admin';
        return {
          _id: user._id ? user._id.toString() : user.id,
          name,
        };
      }
      return null;
    };

    const formattedBanners = banners.map((bannerItem: any) => {
      const { contentId, customTitle, customBannerImage, createdBy, updatedBy, startDate, endDate, __v, ...rest } = bannerItem;

      let formattedContent: any = null;
      let isInWatchlist = false;
      if (contentId) {
        const rawTeaser = contentId.teaserVideo;
        let teaserVideo: string | null = null;

        if (Array.isArray(rawTeaser) && rawTeaser.length > 0) {
          teaserVideo = resolveMediaUrl(rawTeaser[0]);
        } else if (typeof rawTeaser === 'string' && rawTeaser.trim() !== '') {
          teaserVideo = resolveMediaUrl(rawTeaser);
        }

        const genreIds = (contentId.genreIds || []).map((genre: any) => {
          if (genre && typeof genre === 'object') {
            return {
              _id: genre._id ? genre._id.toString() : genre.id,
              name: genre.name || '',
            };
          }
          return genre;
        });

        isInWatchlist = watchlistSet.has(contentId._id.toString());

        formattedContent = {
          ...contentId,
          type: contentId.type ? String(contentId.type).toLowerCase() : contentId.type,
          genreIds,
          teaserVideo,
          isInWatchlist,
        };
      }

      return {
        _id: rest._id,
        content: formattedContent,
        title: customTitle ?? null,
        bannerImage: customBannerImage ? resolveMediaUrl(customBannerImage) : null,
        isInWatchlist,
        ...rest,
        createdBy: formatUser(createdBy),
        updatedBy: formatUser(updatedBy),
      };
    });

    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase();
      return formattedBanners.filter((b: any) => {
        if (!b.content || !b.content.type) return false;
        return String(b.content.type).toLowerCase() === catLower;
      });
    }

    return formattedBanners;
  }

  /**
   * API 1: Master Metadata Aggregator
   * Returns categories, user-selected genres, and hero banner carousels.
   */
  async getMetaData(userId: string, profileId?: string, category?: string) {
    const profile = await this.getUserProfile(userId, profileId);

    const user = await User.findById(userId)
      .select('genres')
      .lean();

    const genreIds = [
      ...(user?.genres || []),
      ...(profile?.favoriteGenreIds || []),
    ].filter((id) => Types.ObjectId.isValid(id));

    const genreQuery = genreIds.length
      ? { _id: { $in: genreIds }, status: GenreStatus.ACTIVE }
      : { status: GenreStatus.ACTIVE };

    const [genres, banner] = await Promise.all([
      Genre.find(genreQuery)
        .sort({ displayOrder: 1, name: 1 })
        .lean(),

      this.fetchHeroBanners(category, profile._id),
    ]);

    return {
      categories: [
        { id: 'all', name: 'All', slug: 'all' },
        { id: 'movie', name: 'Movie', slug: 'movie' },
        { id: 'series', name: 'Series', slug: 'series' },
      ],
      genres,
      banner,
    };
  }

  /**
   * API 2: Content Data Filter & Sections Aggregator
   * Returns home screen sections: Recommended, Upcoming, Top Rated, Next Watch, and Genre Rails.
   */
  async getSections(userId: string, profileId?: string, filters: ContentDataFilters = {}) {
    const { profile, contentQuery } = await this.getProfileQueryContext(userId, profileId);
    this.applyCategoryFilter(contentQuery, filters.categoryId);
    this.applyGenreFilter(contentQuery, filters.genreId);
    this.applyExcludeFilter(contentQuery, filters.excludeId);

    const { type, page = 1, limit = 10, genreId } = filters;

    if (type === 'upcomingrelease' || type === 'upcomingreleases') {
      return getUpcomingReleasesSection(contentQuery, profile, page, limit);
    }
    if (type === 'toprated') {
      return getTopRatedSection(profile, contentQuery, page, limit);
    }
    if (type === 'recommendedforyou' || type === 'yournextwatch') {
      return getRecommendedSection(profile, contentQuery, page, limit);
    }

    if (type === 'morelikethis') {
      if (genreId) {
        return getSingleGenreSection(genreId, contentQuery, profile._id, page, limit);
      }
      return getRecommendedSection(profile, contentQuery, page, limit);
    }

    if (genreId) {
      return getSingleGenreSection(genreId, contentQuery, profile._id, page, limit);
    }

    // Default when no section type or genreId is specified: combine all sections into a single deduplicated paginated response
    const [recommended, upcoming, topRated] = await Promise.all([
      getRecommendedSection(profile, contentQuery, 1, 1000),
      getUpcomingReleasesSection(contentQuery, profile, 1, 1000),
      getTopRatedSection(profile, contentQuery, 1, 1000),
    ]);

    const seenIds = new Set<string>();
    const allCombinedDocs: any[] = [];

    for (const item of [...recommended.docs, ...upcoming.docs, ...topRated.docs]) {
      const idStr = item._id.toString();
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        allCombinedDocs.push(item);
      }
    }

    const total = allCombinedDocs.length;
    const skip = (page - 1) * limit;
    const paginatedDocs = allCombinedDocs.slice(skip, skip + limit);

    return {
      ...PaginationHelper.buildPaginationMeta(total, page, limit),
      docs: paginatedDocs,
    };
  }

  /**
   * API 3: Get Content Details (Movie / Series with Seasons & Episodes)
   * Fetches detailed information for a single Movie or Series content item.
   * Checks CMS active/approval status, profile age restrictions, watchlist status,
   * playback progress, and returns all seasons/episodes for Series.
   *
   * @param userId Authenticated user ID (from JWT)
   * @param profileId Optional active profile ID (from header `id`)
   * @param contentId Content ID requested
   */
  private formatProgress(progress: any, defaultDuration = 0) {
    if (!progress) return {};

    return {
      watchedDuration: progress.watchedDuration || 0,
      totalDuration: progress.totalDuration || defaultDuration,
      isCompleted: progress.isCompleted || false,
    };
  }

  private formatSubtitles(subtitles: any[] = []) {
    return subtitles.map((subtitle) => ({ languageId: subtitle.languageId, fileUrl: resolveMediaUrl(subtitle.fileUrl) }));
  }

  private formatContentSubtitles(subtitles: any[] = []) {
    return subtitles.map((subtitle) => {
      const language = subtitle.languageId;
      const name = getFullLanguageName(language?.name, language?.code);
      const code = get2LetterLanguageCode(language?.code, language?.name);
      return {
        language: name,
        languageCode: code,
        fileUrl: resolveMediaUrl(subtitle.fileUrl),
      };
    });
  }

  private formatCastCrew(castCrew: any[] = []) {
    return castCrew.map((person) => {
      const isCrew = person.role?.toUpperCase() === 'CREW';
      return { name: person.name, role: person.role || (isCrew ? 'Crew' : 'Cast'), type: person.type || (isCrew ? 'CREW' : 'CAST'), image: resolveMediaUrl(person.image), };
    });
  }

  private formatEpisode(episode: any, progress?: any) {
    return {
      _id: episode._id,
      episodeNumber: episode.episodeNumber,
      seasonId: episode.seasonId,
      title: episode.title,
      description: episode.description || '',
      duration: episode.duration,
      thumbnail: resolveMediaUrl(episode.thumbnail),
      videoUrl: resolveMediaUrl(typeof episode.video === 'string' ? episode.video : episode.video?.url),
      subtitles: this.formatSubtitles(episode.subtitles),
      watchProgress: this.formatProgress(progress, episode.duration),
    };
  }

  async getContentDetail(userId: string, profileId: string | undefined, contentId: string) {
    const profile = await this.getUserProfile(userId, profileId);
    const content: any = await Content.findOne({ _id: contentId, status: ContentStatus.ACTIVE, approvalStatus: ContentApprovalStatus.APPROVED, isActive: true, })
      .populate('genreIds', '_id name')
      .populate('languageIds', '_id name code')
      .populate('subtitles.languageId', '_id name code')
      .lean();

    if (!content) {
      throw new Error('CONTENT_NOT_FOUND');
    }

    // Prevent Kids profiles from accessing adult content
    const isRestricted = content.ageCategory === AgeCategory.ADULTS || [AgeRating.A].includes(content.ageRating);

    if (profile.profileType === ProfileType.KIDS && isRestricted) {
      throw new Error('CONTENT_RESTRICTED');
    }

    const [card] = await formatContentCards([content], profile._id);
    const { genreIds, banner, ...cleanCard } = card;
    const baseContent = {
      ...cleanCard,
      duration: content.duration,
      ageCategory: content.ageCategory,
      shortDescription: content.shortDescription || '',
      description: content.description || '',
      teaserVideo: resolveMediaUrl(content.teaserVideo?.[0]) || null,
      genres: content.genreIds || [],
      languages: (content.languageIds || []).map((lang: any) => ({
        _id: lang._id || lang,
        name: getFullLanguageName(lang.name, lang.code),
        code: get2LetterLanguageCode(lang.code, lang.name),
      })),
      subtitles: this.formatContentSubtitles(content.subtitles),
      castCrew: this.formatCastCrew(content.castCrew),
    };

    // Movie
    if (content.type === ContentType.MOVIE) {
      const progress = await WatchProgress.findOne({ userId, profileId: profile._id, contentId }).lean();
      return { ...baseContent, mainVideo: resolveMediaUrl(content.mainVideo), watchProgress: this.formatProgress(progress, content.duration), seasons: null, };
    }

    // Series
    const [seasonDocs, episodeDocs, progressDocs] = await Promise.all([
      Season.find({ contentId }).sort({ seasonNumber: 1 }).lean(),
      Episode.find({ contentId, status: EpisodeStatus.ACTIVE, }).sort({ seasonId: 1, episodeNumber: 1 }).lean(),
      WatchProgress.find({ userId, profileId: profile._id, contentId, }).lean(),
    ]);

    // Format seasons and their episodes
    const seasons = seasonDocs.map((season) => {
      const seasonIdStr = season._id.toString();

      const episodes = episodeDocs
        .filter((episode) => episode.seasonId.toString() === seasonIdStr)
        .map((episode) => {
          const progress = progressDocs.find(
            (p) => p.episodeId?.toString() === episode._id.toString()
          );
          return this.formatEpisode(episode, progress);
        });

      return {
        _id: season._id,
        seasonNumber: season.seasonNumber,
        title: season.title || `Season ${season.seasonNumber}`,
        description: season.description || '',
        totalEpisodes: season.totalEpisodes || episodes.length,
        episodes,
      };
    });

    return { ...baseContent, totalSeasons: content.totalSeasons || seasons.length, seasons };
  }
}

export const homeService = new HomeService();
