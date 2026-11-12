import {
  Content,
  IContent,
  ContentType,
  ContentStatus,
  ContentApprovalStatus,
  AgeCategory,
  UploadedByType,
} from "../../../models/content.model";
import { Season } from "../../../models/season.model";
import { Episode, EpisodeStatus } from "../../../models/episode.model";
import { Types } from "mongoose";
import { Role } from "../../../common/types/auth.types";
import { S3Service } from "../../shared";
import { sendMail } from "../../shared/services/mail.service";
import { EmailTemplate } from "../../../models/email-template.model";
import { User, UserStatus } from "../../../models/user.model";
import { logger } from "../../../core/constants/logger";
import { getFullLanguageName } from "../../shared/helpers/language-name.helper";

// Get AWS media URL from environment
const AWS_MEDIA_URL =
  process.env.AWS_MEDIA_URL || "https://d1f23llskj06r6.cloudfront.net/";

export const ERROR_MESSAGES = {
  CONTENT_NOT_FOUND: "Content not found",
  SEASON_NOT_FOUND: "Season not found",
  EPISODE_NOT_FOUND: "Episode not found",
  INVALID_CONTENT_TYPE: "Invalid content type",
  SEASON_EXISTS: "Season with this number already exists for this content",
  EPISODE_EXISTS: "Episode with this number already exists for this season",
  MAX_EPISODES_PER_SEASON: "Maximum episodes per season exceeded",
  IMAGE_ALREADY_USED:
    "Poster or thumbnail image is already used by another content item",
  ONLY_SERIES_CAN_HAVE_SEASONS: "Only series content can have seasons",
};

export class ContentService {
  /**
   * Transform S3 keys to full CloudFront URLs
   * Converts stored S3 keys to full media URLs using AWS_MEDIA_URL
   */
  private static transformMediaUrls(content: any): any {
    if (!content) return content;

    // Convert Mongoose document to plain JS object if applicable
    if (typeof content.toObject === "function") {
      content = content.toObject();
    }

    const transformed = { ...content };

    // Transform media fields from S3 keys to full URLs
    const mediaFields = [
      "posterImage", "thumbnailImage", "mainVideoFile", "teaserVideo", "censorCertificate",
      "poster", "banner", "thumbnail", "mainVideo"
    ];

    for (const field of mediaFields) {
      if (transformed[field]) {
        if (Array.isArray(transformed[field])) {
          transformed[field] = transformed[field].map((url: string) =>
            url && typeof url === "string" && !url.startsWith("http") ? `${AWS_MEDIA_URL}${url}` : url
          );
        } else if (typeof transformed[field] === "string" && !transformed[field].startsWith("http")) {
          transformed[field] = `${AWS_MEDIA_URL}${transformed[field]}`;
        }
      }
    }
    if (Array.isArray(transformed.cast)) {
      transformed.cast = transformed.cast.map((member: any) => {
        if (member.image && !member.image.startsWith("http")) {
          return { ...member, image: `${AWS_MEDIA_URL}${member.image}` };
        }
        return member;
      });
    }
    if (Array.isArray(transformed.crew)) {
      transformed.crew = transformed.crew.map((member: any) => {
        if (member.image && !member.image.startsWith("http")) {
          return { ...member, image: `${AWS_MEDIA_URL}${member.image}` };
        }
        return member;
      });
    }
    return transformed;
  }

  /**
   * Generate slug from title
   */
  private static generateSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove invalid chars
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/-+/g, "-"); // Replace multiple - with single -
    while (slug.startsWith("-")) {
      slug = slug.slice(1);
    }
    while (slug.endsWith("-")) {
      slug = slug.slice(0, -1);
    }
    return slug;
  }

  /**
   * Ensure content slug is unique in DB
   */
  private static async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    let exists = true;

    while (exists) {
      const query: any = { slug: uniqueSlug };
      if (excludeId) {
        query._id = { $ne: new Types.ObjectId(excludeId) };
      }
      const count = await Content.countDocuments(query);
      if (count === 0) {
        exists = false;
      } else {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
    }
    return uniqueSlug;
  }

  /**
   * Extract S3 key from full URL or return as-is if already a key
   * Used when storing media in database
   */
  private static extractS3Key(urlOrKey: string): string {
    if (!urlOrKey) return urlOrKey;

    // If it's already a key (doesn't start with http), return as-is
    if (!urlOrKey.startsWith("http")) {
      return urlOrKey;
    }

    // Extract key from CloudFront URL
    // URL format: https://d1f23llskj06r6.cloudfront.net/octal/content/1779875936533-harsh.jpg
    const url = new URL(urlOrKey);
    return url.pathname.substring(1); // Remove leading slash
  }

  /**
   * Synchronize seasons and episodes in MongoDB
   */
  private static async syncSeasonsAndEpisodes(contentId: any, seasonsData: any[]): Promise<void> {
    if (!Array.isArray(seasonsData)) return;

    // Delete seasons from DB that are not in the payload
    const payloadSeasonNumbers = seasonsData.map(s => s.seasonNumber);
    const seasonsToDelete = await Season.find({ contentId, seasonNumber: { $nin: payloadSeasonNumbers } });
    for (const s of seasonsToDelete) {
      await Episode.deleteMany({ seasonId: s._id });
      await Season.findByIdAndDelete(s._id);
    }

    // Upsert payload seasons and episodes
    for (const seasonData of seasonsData) {
      let season = await Season.findOne({ contentId, seasonNumber: seasonData.seasonNumber });
      const normSeasonStatus =
        seasonData.status === "INACTIVE" || seasonData.status === "Draft" || seasonData.status === "DRAFT"
          ? "INACTIVE"
          : "ACTIVE";

      if (!season) {
        season = new Season({
          contentId,
          seasonNumber: seasonData.seasonNumber,
          title: seasonData.title,
          description: seasonData.description,
          status: normSeasonStatus,
          isActive: normSeasonStatus === "ACTIVE",
        });
      } else {
        season.title = seasonData.title;
        season.description = seasonData.description;
        if (seasonData.status) {
          season.status = normSeasonStatus;
        }
      }
      await season.save();

      // Sync episodes for this season
      const payloadEpisodeNumbers = (seasonData.episodes || []).map((e: any) => e.episodeNumber);
      await Episode.deleteMany({ seasonId: season._id, episodeNumber: { $nin: payloadEpisodeNumbers } });

      for (const episodeData of (seasonData.episodes || [])) {
        let episode = await Episode.findOne({ seasonId: season._id, episodeNumber: episodeData.episodeNumber });

        const epVideo = this.extractS3Key(episodeData.videoFile || episodeData.videoUrl);
        const epThumb = this.extractS3Key(episodeData.thumbnail || episodeData.thumbnailImage || episodeData.thumbnailUrl);

        const normEpStatus =
          episodeData.status === "INACTIVE" || episodeData.status === "Draft" || episodeData.status === "DRAFT"
            ? EpisodeStatus.INACTIVE
            : episodeData.status === "SCHEDULED" || episodeData.status === "Scheduled"
            ? "SCHEDULED"
            : EpisodeStatus.ACTIVE;

        if (!episode) {
          episode = new Episode({
            seasonId: season._id,
            contentId,
            episodeNumber: episodeData.episodeNumber,
            title: episodeData.title,
            description: episodeData.description,
            duration: episodeData.duration || 0,
            video: epVideo || undefined,
            videoHash: episodeData.videoHash || undefined,
            thumbnail: epThumb || undefined,
            status: normEpStatus,
            isActive: normEpStatus === EpisodeStatus.ACTIVE,
            releaseDate: episodeData.releaseDate ? new Date(episodeData.releaseDate) : new Date()
          });
        } else {
          episode.title = episodeData.title;
          episode.description = episodeData.description;
          episode.duration = episodeData.duration || 0;
          if (epVideo !== undefined) (episode as any).video = epVideo || undefined;
          if (epThumb !== undefined) (episode as any).thumbnail = epThumb || undefined;
          if (episodeData.status) {
            (episode as any).status = normEpStatus;
          }
        }
        await episode.save();
      }
    }

    const totalSeasonsCount = await Season.countDocuments({ contentId });
    const totalEpisodesCount = await Episode.countDocuments({ contentId });
    await Content.findByIdAndUpdate(contentId, {
      totalSeasons: totalSeasonsCount,
      totalEpisodes: totalEpisodesCount,
    });
  }
  /**
   * List all contents with pagination and filters
   */
  static async listContents(pagination: any, query: any): Promise<any> {
    const skip = (pagination.page - 1) * pagination.limit;

    // Removed the restriction that excludes content of inactive genres/categories,
    // so content remains visible in the admin list even if its genre is inactive or deleted.

    const [items, total, statsResult] = await Promise.all([
      Content.find(query)
        .populate("genreIds")
        .populate("languageIds")
        .populate({
          path: "uploadedBy",
          select: "role fullName companyName email",
        })
        .sort(
          pagination.sortBy
            ? { [pagination.sortBy]: pagination.sortOrder === "desc" ? -1 : 1 }
            : { createdAt: -1 },
        )
        .skip(skip)
        .limit(pagination.limit)
        .lean(),
      Content.countDocuments(query),
      Content.aggregate([
        {
          $group: {
            _id: null,
            totalContent: { $sum: 1 },
            activeContent: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
            inactiveContent: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
            movieCount: {
              $sum: {
                $cond: [
                  { $eq: [{ $toUpper: "$type" }, "MOVIE"] },
                  1,
                  0
                ]
              }
            },
            seriesCount: {
              $sum: {
                $cond: [
                  { $eq: [{ $toUpper: "$type" }, "SERIES"] },
                  1,
                  0
                ]
              }
            },
          }
        }
      ])
    ]);

    const itemsWithCounts = await Promise.all(
      items.map(async (item: any) => {
        if (item.type === ContentType.SERIES) {
          // Add Season Number and Total Episodes for SERIES
          const seasonCount = await Season.countDocuments({ contentId: item._id });
          item.totalSeasons = seasonCount;
          item.totalEpisodes = await Episode.countDocuments({ contentId: item._id });

          const activeSeasons = await Season.countDocuments({
            contentId: item._id,
            status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
          });
          const activeEpisodes = await Episode.countDocuments({
            contentId: item._id,
            status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
          });

          item.activeSeasons = activeSeasons;
          item.activeEpisodes = activeEpisodes;

          // If all seasons or all episodes are inactive / drafted, the series status is DRAFT!
          if (seasonCount > 0 && (activeSeasons === 0 || activeEpisodes === 0)) {
            item.status = "DRAFT";
            item.isActive = false;
          }
        }
        return item;
      })
    );

    const pages = Math.ceil(total / pagination.limit);

    const counts = statsResult.length > 0 ? statsResult[0] : {
      totalContent: 0,
      activeContent: 0,
      inactiveContent: 0,
      movieCount: 0,
      seriesCount: 0
    };
    delete counts._id;

    return {
      contents: itemsWithCounts.map((item: any) => {
        const transformedItem = this.transformMediaUrls(this.sanitizeContent(item));
        return transformedItem;
      }),
      pagination: {
        total,
        pages,
        page: pagination.page,
        limit: pagination.limit,
      },
    };
  }

  /**
   * Check if an image hash is already used (Bypassed)
   */
  static async checkImageHash(imageHash: string, excludeContentId?: string): Promise<{ exists: boolean }> {
    return { exists: false };
  }

  /**
   * Get content by ID with full details
   */
  static async getContentById(contentId: string): Promise<any> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    const content = await Content.findById(contentId)
      .populate("genreIds")
      .populate("languageIds")
      .populate({
        path: "uploadedBy",
        select: "role fullName companyName email",
      })
      .lean();

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    const sanitizedContent = this.transformMediaUrls(
      this.sanitizeContent(content),
    );

    if (content.type === ContentType.SERIES) {
      const seasons = await Season.find({ contentId }).sort({ seasonNumber: 1 }).lean();
      const populatedSeasons = await Promise.all(
        seasons.map(async (season: any) => {
          const episodes = await Episode.find({ seasonId: season._id }).sort({ episodeNumber: 1 }).lean();
          const transformedEpisodes = episodes.map((ep: any) => {
            const transformedEp = { ...ep };
            if (transformedEp.video && !transformedEp.video.startsWith("http")) {
              transformedEp.video = `${AWS_MEDIA_URL}${transformedEp.video}`;
            }
            if (transformedEp.thumbnail && !transformedEp.thumbnail.startsWith("http")) {
              transformedEp.thumbnail = `${AWS_MEDIA_URL}${transformedEp.thumbnail}`;
            }
            // Add alias fields for frontend
            transformedEp.videoUrl = transformedEp.video;
            transformedEp.videoFile = transformedEp.video;
            transformedEp.thumbnailUrl = transformedEp.thumbnail;
            return transformedEp;
          });
          return {
            ...season,
            episodes: transformedEpisodes,
          };
        })
      );

      const seasonCount = seasons.length || content.totalSeasons || 1;
      const episodeCount = populatedSeasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || (content as any).totalEpisodes || 0;
      return {
        ...sanitizedContent,
        totalSeasons: content.totalSeasons || seasonCount,
        totalEpisodes: (content as any).totalEpisodes || episodeCount,
        seasons: populatedSeasons,
        seasonCount,
        episodeCount,
      };
    }

    return sanitizedContent;
  }

  /**
   * Create new content
   */
  static async createContent(
    data: Partial<IContent>,
    uploadedById?: string,
    uploadedByRole?: string,
  ): Promise<any> {
    // Map user roles to UploadedByType database enum
    let uploadedByType = UploadedByType.ADMIN;
    if (uploadedByRole === Role.PRODUCER) {
      uploadedByType = UploadedByType.PRODUCER;
    }

    let finalUploadedById = uploadedById;
    if (!finalUploadedById) {
      const adminUser = await User.findOne({ role: Role.ADMIN });
      if (adminUser) {
        finalUploadedById = adminUser._id.toString();
      }
    }

    const contentData: any = {
      ...data,
      uploadedBy: finalUploadedById ? new Types.ObjectId(finalUploadedById) : undefined,
      uploadedByRole: uploadedByRole || Role.ADMIN,
      uploadedByType,
    };

    if (data.director !== undefined) {
      contentData.director = String(data.director).trim();
    }
    if (data.producer !== undefined) {
      contentData.producer = String(data.producer).trim();
    }
    if (data.totalSeasons !== undefined && data.totalSeasons !== null) {
      contentData.totalSeasons = Number(data.totalSeasons);
    }
    if ((data as any).totalEpisodes !== undefined && (data as any).totalEpisodes !== null) {
      contentData.totalEpisodes = Number((data as any).totalEpisodes);
    }
    if (data.duration !== undefined && data.duration !== null) {
      contentData.duration = Number(data.duration);
    }

    // Normalize tags array / string
    if (contentData.tags) {
      if (typeof contentData.tags === "string") {
        contentData.tags = contentData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      } else if (Array.isArray(contentData.tags)) {
        contentData.tags = contentData.tags
          .map((t: any) => String(t).trim())
          .filter(Boolean);
      }
    }

    // Generate and ensure unique slug from title
    if (contentData.title) {
      const baseSlug = this.generateSlug(contentData.title);
      contentData.slug = await this.ensureUniqueSlug(baseSlug);
    }

    const combinedGenreIds: string[] = [];
    const extractNameOrId = (c: any): string => {
      if (typeof c === "object" && c !== null) {
        return (c._id || c.id || c.name || c.title || String(c)).toString();
      }
      return String(c);
    };
    if (contentData.genres && Array.isArray(contentData.genres)) {
      combinedGenreIds.push(...contentData.genres.map(extractNameOrId));
    }
    if (contentData.categories && Array.isArray(contentData.categories)) {
      combinedGenreIds.push(...contentData.categories.map(extractNameOrId));
    }
    if (contentData.category) {
      const cats = Array.isArray(contentData.category) ? contentData.category : [contentData.category];
      combinedGenreIds.push(...cats.map(extractNameOrId));
    }
    if (contentData.categoryId) {
      const cats = Array.isArray(contentData.categoryId) ? contentData.categoryId : [contentData.categoryId];
      combinedGenreIds.push(...cats.map(extractNameOrId));
    }
    if (combinedGenreIds.length > 0) {
      const validGenreIds: string[] = [];
      const namesToLookup: string[] = [];

      for (const item of combinedGenreIds) {
        if (Types.ObjectId.isValid(item)) {
          validGenreIds.push(item);
        } else if (typeof item === 'string' && item.trim()) {
          namesToLookup.push(item.trim());
        }
      }

      if (namesToLookup.length > 0) {
        const { Genre } = await import("../../../models/genre.model");
        for (const name of namesToLookup) {
          let genreDoc: any = await Genre.findOne({
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          }).select('_id').lean();
          if (!genreDoc) {
            genreDoc = await Genre.create({ name });
          }
          validGenreIds.push(genreDoc._id.toString());
        }
      }

      if (validGenreIds.length > 0) {
        contentData.genreIds = Array.from(new Set(validGenreIds)) as any;
      }
    }
    delete contentData.genres;
    delete contentData.categories;
    delete contentData.category;
    delete contentData.categoryId;
    if (contentData.language) {
      const languageArray = Array.isArray(contentData.language) ? contentData.language : [contentData.language];
      const validLanguageIds: string[] = [];
      const codesOrNamesToLookup: string[] = [];

      for (const lang of languageArray) {
        if (Types.ObjectId.isValid(lang)) {
          validLanguageIds.push(lang);
        } else {
          codesOrNamesToLookup.push(lang);
        }
      }

      if (codesOrNamesToLookup.length > 0) {
        const { Language } = await import("../../../models/language.model");
        for (const code of codesOrNamesToLookup) {
          let langDoc: any = await Language.findOne({
            $or: [
              { code: code },
              { name: code },
              { code: code.toUpperCase() },
              { name: code.charAt(0).toUpperCase() + code.slice(1).toLowerCase() }
            ]
          }).select('_id').lean();
          
          if (!langDoc) {
            langDoc = await Language.create({ 
              name: code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(), 
              code: code.toUpperCase() 
            });
          }
          validLanguageIds.push(langDoc._id.toString());
        }
      }

      contentData.languageIds = validLanguageIds as any;
      delete contentData.language;
    }

    if (contentData.releaseDate) {
      contentData.releaseDate = new Date(contentData.releaseDate);
    }
    if (!contentData.releaseYear) {
      contentData.releaseYear = contentData.releaseDate
        ? contentData.releaseDate.getFullYear()
        : new Date().getFullYear();
    }

    // Normalize status and approvalStatus if client passed DRAFT or PENDING in status
    if (contentData.status === "DRAFT" || contentData.status === "PENDING") {
      if (!contentData.approvalStatus) {
        contentData.approvalStatus =
          contentData.status === "DRAFT"
            ? ContentApprovalStatus.DRAFT
            : ContentApprovalStatus.PENDING;
      }
      contentData.status =
        contentData.status === "DRAFT" ? ContentStatus.INACTIVE : ContentStatus.ACTIVE;
    }

    // Auto-set status based on provided approvalStatus or uploader role
    if (contentData.approvalStatus && Object.values(ContentApprovalStatus).includes(contentData.approvalStatus as any)) {
      // Keep explicit approval status passed by client (e.g. PENDING, APPROVED, DRAFT)
    } else if (uploadedByRole === "admin") {
      contentData.approvalStatus = ContentApprovalStatus.APPROVED;
    } else if (uploadedByRole === "producer") {
      contentData.approvalStatus = ContentApprovalStatus.PENDING;
    } else {
      contentData.approvalStatus = ContentApprovalStatus.PENDING;
    }

    // When approval is pending, rejected, re-edit, draft, or on hold, status must be INACTIVE
    if (
      contentData.approvalStatus !== ContentApprovalStatus.APPROVED &&
      contentData.approvalStatus !== "APPROVED"
    ) {
      contentData.status = ContentStatus.INACTIVE;
      contentData.isActive = false;
    } else {
      contentData.status = ContentStatus.ACTIVE;
      contentData.isActive = true;
    }


    // Map AgeCategory natively from AgeRating
    if (contentData.ageRating) {
      if (["U", "U/A", "KIDS"].includes(contentData.ageRating.toUpperCase())) {
        contentData.ageCategory = AgeCategory.KIDS;
      } else if (["A", "18+", "ADULTS"].includes(contentData.ageRating.toUpperCase())) {
        contentData.ageCategory = AgeCategory.ADULTS;
      }
    }

    // Extract S3 keys from URLs if full URLs are provided
    if (contentData.poster) {
      const posterArray = Array.isArray(contentData.poster) ? contentData.poster : [contentData.poster];
      contentData.poster = posterArray.map((poster: any) =>
        this.extractS3Key(poster),
      );
    }
    if (contentData.banner) {
      const bannerArray = Array.isArray(contentData.banner) ? contentData.banner : [contentData.banner];
      contentData.banner = bannerArray.map((banner: any) =>
        this.extractS3Key(banner),
      );
    }
    if (contentData.thumbnail) {
      contentData.thumbnail = this.extractS3Key(
        contentData.thumbnail,
      );
    }
    if (contentData.mainVideo) {
      contentData.mainVideo = this.extractS3Key(contentData.mainVideo);
    }
    if (contentData.teaserVideo) {
      const teaserArray = Array.isArray(contentData.teaserVideo) ? contentData.teaserVideo : [contentData.teaserVideo];
      contentData.teaserVideo = teaserArray.map((video: any) =>
        this.extractS3Key(video),
      );
    }
    if (contentData.censorCertificate) {
      contentData.censorCertificate = this.extractS3Key(contentData.censorCertificate);
    }
    if (contentData.imdb && (typeof contentData.imdb === "number" || typeof contentData.imdb === "string")) {
      contentData.imdb = { rating: Number(contentData.imdb) };
    }
    const parseMembers = (raw: any, defaultRole: string, type: "CAST" | "CREW") => {
      if (!raw) return [];
      if (typeof raw === "string") {
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({
            name,
            role: defaultRole,
            type,
            image: null,
          }));
      }
      if (Array.isArray(raw)) {
        return raw
          .map((c: any) => {
            if (typeof c === "string") {
              const name = c.trim();
              return name ? { name, role: defaultRole, type, image: null } : null;
            }
            if (typeof c === "object" && c !== null) {
              const name = c.name || c.title || String(c);
              return name
                ? {
                    name: String(name).trim(),
                    role: c.role ? String(c.role).trim() : defaultRole,
                    type,
                    image: c.image ? this.extractS3Key(c.image) : null,
                  }
                : null;
            }
            return null;
          })
          .filter(Boolean);
      }
      return [];
    };

    const castCrew: any[] = [
      ...parseMembers((contentData as any).cast, "Cast", "CAST"),
      ...parseMembers((contentData as any).crew, "Director", "CREW"),
    ];

    if ((contentData as any).director && typeof (contentData as any).director === "string") {
      const dirName = (contentData as any).director.trim();
      if (dirName && !castCrew.some((m) => m.name === dirName && m.role === "Director")) {
        castCrew.push({
          name: dirName,
          role: "Director",
          type: "CREW",
          image: null,
        });
      }
    }

    delete (contentData as any).cast;
    delete (contentData as any).crew;

    if (castCrew.length > 0) {
      contentData.castCrew = castCrew;
    }



    const seasonsData = (contentData as any).seasons;
    delete (contentData as any).seasons;

    const content = new Content(contentData);
    await content.save();

    try {
      if (content.type === ContentType.SERIES && seasonsData) {
        await this.syncSeasonsAndEpisodes(content._id, seasonsData);
      }
    } catch (error) {
      // Clean up the orphaned content if episode syncing fails
      await Content.findByIdAndDelete(content._id);
      throw error;
    }

    const populated = await content.populate([
      "genreIds",
      "languageIds",
      { path: "uploadedBy", select: "role fullName companyName email" },
    ]);
    
    // Send email notification to admins asynchronously in background so publish/create returns instantly
    const isPendingApproval =
      (content.approvalStatus as any) === ContentApprovalStatus.PENDING ||
      (content.approvalStatus as any) === "PENDING" ||
      contentData.approvalStatus === ContentApprovalStatus.PENDING ||
      contentData.approvalStatus === "PENDING";
    const isNonAdminUploader =
      !uploadedByRole ||
      uploadedByRole.toLowerCase() !== "admin" ||
      (uploadedByType as any) !== UploadedByType.ADMIN;

    if (isPendingApproval || isNonAdminUploader) {
      // Fire-and-forget background execution
      (async () => {
        try {
          const emailTemplate = await EmailTemplate.findOne({
            keyword: "NEW_CONTENT_SUBMISSION_ADMIN",
          });

          // Find all active admins across role variations
          let admins = await User.find(
            {
              $or: [
                { role: { $in: ["admin", "ADMIN", Role.ADMIN] } },
                { adminRole: { $ne: null } },
              ],
              status: { $in: ["active", "ACTIVE", UserStatus.ACTIVE] },
            },
            { email: 1, fullName: 1, firstName: 1 }
          );

          if (!admins || admins.length === 0) {
            admins = await User.find(
              {
                $or: [
                  { role: { $regex: /admin/i } },
                  { email: { $regex: /admin/i } },
                ],
              },
              { email: 1, fullName: 1, firstName: 1 }
            );
          }

          const uploaderName =
            (populated.uploadedBy as any)?.fullName ||
            (populated.uploadedBy as any)?.firstName ||
            (populated.uploadedBy as any)?.companyName ||
            (populated.uploadedBy as any)?.email ||
            "A User";
          const contentTitle = content.title || "Untitled Content";
          const contentType = content.type || "MOVIE";
          const submittedDate = new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          const defaultSubject = `New Content Submission: ${contentTitle} (${contentType})`;
          const defaultBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <h2 style="color: #e50914;">New Content Submitted for Review</h2>
              <p>Hello Admin,</p>
              <p>A new content request has been submitted by <strong>${uploaderName}</strong> and is currently pending your approval.</p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #e50914; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Content Title:</strong> ${contentTitle}</p>
                <p style="margin: 0 0 8px 0;"><strong>Content Type:</strong> ${contentType}</p>
                <p style="margin: 0 0 8px 0;"><strong>Submitted By:</strong> ${uploaderName}</p>
                <p style="margin: 0;"><strong>Submission Date:</strong> ${submittedDate}</p>
              </div>
              <p>Please log in to the Uthsava Admin Panel to review, approve, or reject this submission.</p>
            </div>
          `;

          for (const admin of admins) {
            if (!admin.email) continue;

            let emailSubject = emailTemplate?.subject || defaultSubject;
            let emailBody = emailTemplate?.description || defaultBody;

            emailSubject = emailSubject
              .replaceAll("{{Platform Name}}", "Uthsava")
              .replaceAll("{{Content Title}}", contentTitle)
              .replaceAll("{{Content Type}}", contentType)
              .replaceAll("{{Producer Name}}", uploaderName)
              .replaceAll("{{Uploader Name}}", uploaderName)
              .replaceAll("{{Submitted By}}", uploaderName);

            emailBody = emailBody
              .replaceAll("{{Platform Name}}", "Uthsava")
              .replaceAll("{{Admin Name}}", admin.fullName || admin.firstName || "Admin")
              .replaceAll("{{Content Title}}", contentTitle)
              .replaceAll("{{Content Type}}", contentType)
              .replaceAll("{{Producer Name}}", uploaderName)
              .replaceAll("{{Uploader Name}}", uploaderName)
              .replaceAll("{{Submitted By}}", uploaderName)
              .replaceAll("{{Submitted Date}}", submittedDate);

            await sendMail(admin.email, emailSubject, emailBody).catch((emailError: any) => {
              logger.error(`Failed to send content submission email to ${admin.email}:`, emailError);
            });
          }
        } catch (emailError: any) {
          logger.error("Error sending content submission notification in background:", emailError);
        }
      })();
    }

    return this.transformMediaUrls(populated);
  }

  /**
   * Update content
   */
  static async updateContent(
    contentId: string,
    updateData: Partial<IContent>,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    // Don't allow changing type after creation
    delete updateData.type;

    // Normalize tags array / string
    if (updateData.tags) {
      if (typeof updateData.tags === "string") {
        (updateData as any).tags = (updateData.tags as string)
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      } else if (Array.isArray(updateData.tags)) {
        (updateData as any).tags = updateData.tags
          .map((t: any) => String(t).trim())
          .filter(Boolean);
      }
    }

    const combinedUpdateGenreIds: string[] = [];
    if ((updateData as any).genres && Array.isArray((updateData as any).genres)) {
      combinedUpdateGenreIds.push(...(updateData as any).genres.map((g: any) => g.toString()));
    }
    const extractNameOrIdUpdate = (c: any): string => {
      if (typeof c === "object" && c !== null) {
        return (c._id || c.id || c.name || c.title || String(c)).toString();
      }
      return String(c);
    };
    if ((updateData as any).genres && Array.isArray((updateData as any).genres)) {
      combinedUpdateGenreIds.push(...(updateData as any).genres.map(extractNameOrIdUpdate));
    }
    if ((updateData as any).categories && Array.isArray((updateData as any).categories)) {
      combinedUpdateGenreIds.push(...(updateData as any).categories.map(extractNameOrIdUpdate));
    }
    if ((updateData as any).category) {
      const cats = Array.isArray((updateData as any).category) ? (updateData as any).category : [(updateData as any).category];
      combinedUpdateGenreIds.push(...cats.map(extractNameOrIdUpdate));
    }
    if ((updateData as any).categoryId) {
      const cats = Array.isArray((updateData as any).categoryId) ? (updateData as any).categoryId : [(updateData as any).categoryId];
      combinedUpdateGenreIds.push(...cats.map(extractNameOrIdUpdate));
    }
    if (combinedUpdateGenreIds.length > 0) {
      const validGenreIds: string[] = [];
      const namesToLookup: string[] = [];

      for (const item of combinedUpdateGenreIds) {
        if (Types.ObjectId.isValid(item)) {
          validGenreIds.push(item);
        } else if (typeof item === 'string' && item.trim()) {
          namesToLookup.push(item.trim());
        }
      }

      if (namesToLookup.length > 0) {
        const { Genre } = await import("../../../models/genre.model");
        for (const name of namesToLookup) {
          let genreDoc: any = await Genre.findOne({
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          }).select('_id').lean();
          if (!genreDoc) {
            genreDoc = await Genre.create({ name });
          }
          validGenreIds.push(genreDoc._id.toString());
        }
      }

      if (validGenreIds.length > 0) {
        updateData.genreIds = Array.from(new Set(validGenreIds)) as any;
      }
    }
    delete (updateData as any).genres;
    delete (updateData as any).categories;
    delete (updateData as any).category;
    delete (updateData as any).categoryId;
    if ((updateData as any).language) {
      const languageArray = Array.isArray((updateData as any).language) ? (updateData as any).language : [(updateData as any).language];
      const validLanguageIds: string[] = [];
      const codesOrNamesToLookup: string[] = [];

      for (const lang of languageArray) {
        if (Types.ObjectId.isValid(lang)) {
          validLanguageIds.push(lang);
        } else {
          codesOrNamesToLookup.push(lang);
        }
      }

      if (codesOrNamesToLookup.length > 0) {
        const { Language } = await import("../../../models/language.model");
        for (const code of codesOrNamesToLookup) {
          let langDoc: any = await Language.findOne({
            $or: [
              { code: code },
              { name: code },
              { code: code.toUpperCase() },
              { name: code.charAt(0).toUpperCase() + code.slice(1).toLowerCase() }
            ]
          }).select('_id').lean();
          
          if (!langDoc) {
            langDoc = await Language.create({ 
              name: code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(), 
              code: code.toUpperCase() 
            });
          }
          validLanguageIds.push(langDoc._id.toString());
        }
      }

      updateData.languageIds = validLanguageIds as any;
      delete (updateData as any).language;
    }

    // Extract S3 keys from URLs if full URLs are provided
    if (updateData.poster) {
      const posterArray = Array.isArray(updateData.poster) ? updateData.poster : [updateData.poster];
      updateData.poster = posterArray.map((poster: any) =>
        this.extractS3Key(poster),
      );
    }
    if (updateData.banner) {
      const bannerArray = Array.isArray(updateData.banner) ? updateData.banner : [updateData.banner];
      updateData.banner = bannerArray.map((banner: any) =>
        this.extractS3Key(banner),
      );
    }
    if (updateData.thumbnail) {
      updateData.thumbnail = this.extractS3Key(updateData.thumbnail);
    }
    if (updateData.mainVideo) {
      updateData.mainVideo = this.extractS3Key(updateData.mainVideo);
    }
    if (updateData.teaserVideo) {
      const teaserArray = Array.isArray(updateData.teaserVideo) ? updateData.teaserVideo : [updateData.teaserVideo];
      updateData.teaserVideo = teaserArray.map((video: any) =>
        this.extractS3Key(video),
      );
    }
    if ((updateData as any).director !== undefined) {
      updateData.director = String((updateData as any).director).trim();
    }
    if ((updateData as any).producer !== undefined) {
      updateData.producer = String((updateData as any).producer).trim();
    }
    if ((updateData as any).totalSeasons !== undefined && (updateData as any).totalSeasons !== null) {
      updateData.totalSeasons = Number((updateData as any).totalSeasons);
    }
    if ((updateData as any).totalEpisodes !== undefined && (updateData as any).totalEpisodes !== null) {
      updateData.totalEpisodes = Number((updateData as any).totalEpisodes);
    }
    if ((updateData as any).duration !== undefined && (updateData as any).duration !== null) {
      updateData.duration = Number((updateData as any).duration);
    }

    if (updateData.censorCertificate) {
      updateData.censorCertificate = this.extractS3Key(updateData.censorCertificate);
    }
    if (updateData.imdb && (typeof updateData.imdb === "number" || typeof updateData.imdb === "string")) {
      updateData.imdb = { rating: Number(updateData.imdb) };
    }
    const parseMembers = (raw: any, defaultRole: string, type: "CAST" | "CREW") => {
      if (!raw) return [];
      if (typeof raw === "string") {
        return raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({
            name,
            role: defaultRole,
            type,
            image: null,
          }));
      }
      if (Array.isArray(raw)) {
        return raw
          .map((c: any) => {
            if (typeof c === "string") {
              const name = c.trim();
              return name ? { name, role: defaultRole, type, image: null } : null;
            }
            if (typeof c === "object" && c !== null) {
              const name = c.name || c.title || String(c);
              return name
                ? {
                    name: String(name).trim(),
                    role: c.role ? String(c.role).trim() : defaultRole,
                    type,
                    image: c.image ? this.extractS3Key(c.image) : null,
                  }
                : null;
            }
            return null;
          })
          .filter(Boolean);
      }
      return [];
    };

    const castCrew: any[] = [
      ...parseMembers((updateData as any).cast, "Cast", "CAST"),
      ...parseMembers((updateData as any).crew, "Director", "CREW"),
    ];

    if ((updateData as any).director && typeof (updateData as any).director === "string") {
      const dirName = (updateData as any).director.trim();
      if (dirName && !castCrew.some((m) => m.name === dirName && m.role === "Director")) {
        castCrew.push({
          name: dirName,
          role: "Director",
          type: "CREW",
          image: null,
        });
      }
    }

    delete (updateData as any).cast;
    delete (updateData as any).crew;

    if (castCrew.length > 0) {
      updateData.castCrew = castCrew;
    }


    const existingContent = await Content.findById(contentId);
    if (!existingContent) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    // Regenerate slug if title changes or if the existing document doesn't have a slug
    if (updateData.title && updateData.title !== existingContent.title) {
      const baseSlug = this.generateSlug(updateData.title);
      updateData.slug = await this.ensureUniqueSlug(baseSlug, contentId);
    } else if (!existingContent.slug) {
      const baseSlug = this.generateSlug(existingContent.title);
      updateData.slug = await this.ensureUniqueSlug(baseSlug, contentId);
    }

    const seasonsData = (updateData as any).seasons;
    delete (updateData as any).seasons;

    if (existingContent.type === ContentType.SERIES && seasonsData) {
      await this.syncSeasonsAndEpisodes(contentId, seasonsData);
    }

    const content = await Content.findByIdAndUpdate(contentId, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      "genreIds",
      "languageIds",
      { path: "uploadedBy", select: "role fullName companyName email" },
    ]);

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    return this.transformMediaUrls(content);
  }

  /**
   * Delete content
   */
  static async deleteContent(contentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    const content = await Content.findById(contentId);

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    // Delete content media files from S3
    const filesToDelete = [
      ...(content.poster || []),
      ...(content.banner || []),
      content.thumbnail,
      content.mainVideo,
      content.censorCertificate,
      ...(content.teaserVideo || []),
      ...(content.castCrew || []).map((c: any) => c.image),
    ].filter(Boolean) as string[];

    for (const file of filesToDelete) {
      if (!file.startsWith("http")) {
        await S3Service.deleteFile(file);
      }
    }

    // Delete all related seasons and episodes if it's a series
    if (content.type === ContentType.SERIES) {
      const episodes = await Episode.find({ contentId });
      for (const ep of episodes) {
        const video = (ep as any).video;
        if (video && typeof video === 'string' && !video.startsWith("http")) await S3Service.deleteFile(video);
        if (ep.thumbnail && !ep.thumbnail.startsWith("http")) await S3Service.deleteFile(ep.thumbnail);
      }
      await Season.deleteMany({ contentId });
      await Episode.deleteMany({ contentId });
    }

    await Content.findByIdAndDelete(contentId);
  }

  /**
   * Update content status (active/inactive/draft)
   */
  static async updateContentStatus(
    contentId: string,
    isActive: boolean,
    status?: string,
    approvalStatus?: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    const updateFields: any = { isActive };
    if (status) {
      updateFields.status = status.toUpperCase();
      if (updateFields.status === "DRAFT") {
        updateFields.isActive = false;
      }
    }
    if (approvalStatus) {
      updateFields.approvalStatus = approvalStatus;
    }

    const content = await Content.findByIdAndUpdate(
      contentId,
      updateFields,
      { new: true },
    ).populate([
      "genreIds",
      "languageIds",
      { path: "uploadedBy", select: "role fullName companyName email" },
    ]);

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    // If it's a series, cascade status down to all seasons and episodes
    if (content.type === ContentType.SERIES) {
      const isDraftOrInactive = !isActive || updateFields.status === "DRAFT" || updateFields.status === "INACTIVE";
      const seasonStatus = isDraftOrInactive ? "INACTIVE" : "ACTIVE";
      const episodeStatus = isDraftOrInactive ? EpisodeStatus.INACTIVE : EpisodeStatus.ACTIVE;
      await Season.updateMany({ contentId }, { status: seasonStatus });
      await Episode.updateMany({ contentId }, { status: episodeStatus });
    }

    return this.transformMediaUrls(content);
  }

  /**
   * Create season (for series content)
   */
  static async createSeason(contentId: string, seasonData: any): Promise<any> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    const content = await Content.findById(contentId);

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    if (content.type !== ContentType.SERIES) {
      throw new Error(ERROR_MESSAGES.ONLY_SERIES_CAN_HAVE_SEASONS);
    }

    // Check if season already exists
    const existingSeason = await Season.findOne({
      contentId,
      seasonNumber: seasonData.seasonNumber,
    });

    if (existingSeason) {
      throw new Error(ERROR_MESSAGES.SEASON_EXISTS);
    }

    const sanitizedSeasonData = { ...seasonData };
    if (sanitizedSeasonData.posterImage && !sanitizedSeasonData.poster) {
      sanitizedSeasonData.poster = [sanitizedSeasonData.posterImage];
    }
    if (sanitizedSeasonData.poster && typeof sanitizedSeasonData.poster === "string") {
      sanitizedSeasonData.poster = [sanitizedSeasonData.poster];
    }
    if (!sanitizedSeasonData.thumbnail) {
      if (sanitizedSeasonData.posterImage) {
        sanitizedSeasonData.thumbnail = sanitizedSeasonData.posterImage;
      } else if (Array.isArray(sanitizedSeasonData.poster) && sanitizedSeasonData.poster.length > 0) {
        sanitizedSeasonData.thumbnail = sanitizedSeasonData.poster[0];
      }
    }

    const season = new Season({
      contentId,
      ...sanitizedSeasonData,
    });

    await season.save();
    return season;
  }

  /**
   * Update season
   */
  static async updateSeason(
    contentId: string,
    seasonId: string,
    updateData: any,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new Error("error.invalidSeasonIdFormat");
    }

    const season = await Season.findOne({
      _id: seasonId,
      contentId,
    });

    if (!season) {
      throw new Error(ERROR_MESSAGES.SEASON_NOT_FOUND);
    }

    // Check for duplicate season number if it's being changed
    if (
      updateData.seasonNumber &&
      updateData.seasonNumber !== season.seasonNumber
    ) {
      const existingSeason = await Season.findOne({
        contentId,
        seasonNumber: updateData.seasonNumber,
      });

      if (existingSeason) {
        throw new Error(ERROR_MESSAGES.SEASON_EXISTS);
      }
    }

    const sanitizedUpdateData = { ...updateData };
    if (sanitizedUpdateData.posterImage && !sanitizedUpdateData.poster) {
      sanitizedUpdateData.poster = [sanitizedUpdateData.posterImage];
    }
    if (sanitizedUpdateData.poster && typeof sanitizedUpdateData.poster === "string") {
      sanitizedUpdateData.poster = [sanitizedUpdateData.poster];
    }
    if (!sanitizedUpdateData.thumbnail) {
      if (sanitizedUpdateData.posterImage) {
        sanitizedUpdateData.thumbnail = sanitizedUpdateData.posterImage;
      } else if (Array.isArray(sanitizedUpdateData.poster) && sanitizedUpdateData.poster.length > 0) {
        sanitizedUpdateData.thumbnail = sanitizedUpdateData.poster[0];
      }
    }

    let statusWasUpdated = false;
    let isSeasonActive = true;
    if (sanitizedUpdateData.status !== undefined && sanitizedUpdateData.status !== null) {
      statusWasUpdated = true;
      const normStatus = String(sanitizedUpdateData.status).toUpperCase();
      if (normStatus === "INACTIVE" || normStatus === "DRAFT") {
        sanitizedUpdateData.status = "INACTIVE";
        isSeasonActive = false;
      } else {
        sanitizedUpdateData.status = "ACTIVE";
        isSeasonActive = true;
      }
    }

    Object.assign(season, sanitizedUpdateData);
    await season.save();

    // When season status is updated, cascade to all episodes of this season
    if (statusWasUpdated) {
      if (!isSeasonActive) {
        // Season drafted/inactivated -> all its episodes become INACTIVE / Draft
        await Episode.updateMany(
          { seasonId: season._id },
          { status: EpisodeStatus.INACTIVE }
        );
      } else {
        // Season published/activated -> all its episodes become ACTIVE / Published
        await Episode.updateMany(
          { seasonId: season._id },
          { status: EpisodeStatus.ACTIVE }
        );
      }

      // Check if series has any remaining active seasons or episodes
      const activeSeasonsCount = await Season.countDocuments({
        contentId,
        status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
      });
      const activeEpisodesCount = await Episode.countDocuments({
        contentId,
        status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
      });

      if (activeSeasonsCount === 0 || activeEpisodesCount === 0) {
        await Content.findByIdAndUpdate(contentId, {
          status: "DRAFT",
          isActive: false,
        });
      } else {
        await Content.findByIdAndUpdate(contentId, {
          status: "ACTIVE",
          isActive: true,
        });
      }
    }

    return season;
  }

  /**
   * Delete season and its episodes
   */
  static async deleteSeason(
    contentId: string,
    seasonId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new Error("error.invalidSeasonIdFormat");
    }

    const season = await Season.findOne({
      _id: seasonId,
      contentId,
    });

    if (!season) {
      throw new Error(ERROR_MESSAGES.SEASON_NOT_FOUND);
    }

    // Delete all episodes in this season
    await Episode.deleteMany({ seasonId });

    // Delete the season
    await Season.findByIdAndDelete(seasonId);
  }

  /**
   * List seasons for a content
   */
  static async listSeasons(contentId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(contentId)) {
      throw new Error("error.invalidContentIdFormat");
    }

    const content = await Content.findById(contentId);

    if (!content) {
      throw new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    }

    if (content.type !== ContentType.SERIES) {
      throw new Error(ERROR_MESSAGES.ONLY_SERIES_CAN_HAVE_SEASONS);
    }

    return await Season.find({ contentId }).sort({ seasonNumber: 1 }).lean();
  }

  /**
   * Get season by ID
   */
  static async getSeasonById(
    contentId: string,
    seasonId: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new Error("error.invalidSeasonIdFormat");
    }

    const season = await Season.findOne({
      _id: seasonId,
      contentId,
    }).lean();

    if (!season) {
      throw new Error(ERROR_MESSAGES.SEASON_NOT_FOUND);
    }

    return season;
  }

  /**
   * Create episode
   */
  static async createEpisode(
    contentId: string,
    seasonId: string,
    episodeData: any,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new Error("error.invalidSeasonIdFormat");
    }

    const season = await Season.findOne({
      _id: seasonId,
      contentId,
    });

    if (!season) {
      throw new Error(ERROR_MESSAGES.SEASON_NOT_FOUND);
    }

    const episodeCount = await Episode.countDocuments({ seasonId });
    if (episodeCount >= 100) {
      throw new Error(ERROR_MESSAGES.MAX_EPISODES_PER_SEASON);
    }

    // Check if episode already exists
    const existingEpisode = await Episode.findOne({
      seasonId,
      episodeNumber: episodeData.episodeNumber,
    });

    if (existingEpisode) {
      throw new Error(ERROR_MESSAGES.EPISODE_EXISTS);
    }

    if (episodeData.videoFile) {
      episodeData.video = this.extractS3Key(episodeData.videoFile);
      delete episodeData.videoFile;
    }
    if (episodeData.thumbnailImage) {
      episodeData.thumbnail = this.extractS3Key(episodeData.thumbnailImage);
      delete episodeData.thumbnailImage;
    }

    const episode = new Episode({
      seasonId,
      contentId,
      releaseDate: episodeData.releaseDate ? new Date(episodeData.releaseDate) : new Date(),
      ...episodeData,
    });

    await episode.save();
    return episode;
  }

  /**
   * Update episode
   */
  static async updateEpisode(
    contentId: string,
    seasonId: string,
    episodeId: string,
    updateData: any,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(episodeId)) {
      throw new Error("error.invalidEpisodeIdFormat");
    }

    const episode = await Episode.findOne({
      _id: episodeId,
      seasonId,
      contentId,
    });

    if (!episode) {
      throw new Error(ERROR_MESSAGES.EPISODE_NOT_FOUND);
    }

    // Check for duplicate episode number if it's being changed
    if (
      updateData.episodeNumber &&
      updateData.episodeNumber !== episode.episodeNumber
    ) {
      const existingEpisode = await Episode.findOne({
        seasonId,
        episodeNumber: updateData.episodeNumber,
      });

      if (existingEpisode) {
        throw new Error(ERROR_MESSAGES.EPISODE_EXISTS);
      }
    }

    if (updateData.videoFile) {
      updateData.video = this.extractS3Key(updateData.videoFile);
      delete updateData.videoFile;
    }
    if (updateData.thumbnailImage) {
      updateData.thumbnail = this.extractS3Key(updateData.thumbnailImage);
      delete updateData.thumbnailImage;
    }

    let statusWasUpdated = false;
    let isEpActive = true;
    if (updateData.status !== undefined && updateData.status !== null) {
      statusWasUpdated = true;
      const normStatus = String(updateData.status).toUpperCase();
      if (normStatus === "INACTIVE" || normStatus === "DRAFT") {
        updateData.status = EpisodeStatus.INACTIVE;
        isEpActive = false;
      } else if (normStatus === "SCHEDULED") {
        updateData.status = "SCHEDULED";
        isEpActive = false;
      } else {
        updateData.status = EpisodeStatus.ACTIVE;
        isEpActive = true;
      }
    }

    Object.assign(episode, updateData);
    await episode.save();

    if (statusWasUpdated) {
      if (isEpActive) {
        // Episode published -> Parent season must also be active, and series must be active
        await Season.findByIdAndUpdate(seasonId, { status: "ACTIVE" });
        await Content.findByIdAndUpdate(contentId, {
          status: "ACTIVE",
          isActive: true,
        });
      } else {
        // Episode drafted -> Check if any active episodes remain in season
        const activeEpisodesInSeason = await Episode.countDocuments({
          seasonId,
          status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
        });
        if (activeEpisodesInSeason === 0) {
          await Season.findByIdAndUpdate(seasonId, { status: "INACTIVE" });
        }

        // Check if any active episodes remain across the entire series
        const activeEpisodesInContent = await Episode.countDocuments({
          contentId,
          status: { $in: ["ACTIVE", "PUBLISHED", "Active", "Published"] },
        });
        if (activeEpisodesInContent === 0) {
          await Content.findByIdAndUpdate(contentId, {
            status: "DRAFT",
            isActive: false,
          });
        }
      }
    }

    return episode;
  }

  /**
   * Delete episode
   */
  static async deleteEpisode(
    contentId: string,
    seasonId: string,
    episodeId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(episodeId)) {
      throw new Error("error.invalidEpisodeIdFormat");
    }

    const episode = await Episode.findOne({
      _id: episodeId,
      seasonId,
      contentId,
    });

    if (!episode) {
      throw new Error(ERROR_MESSAGES.EPISODE_NOT_FOUND);
    }

    await Episode.findByIdAndDelete(episodeId);
  }

  /**
   * List episodes for a season
   */
  static async listEpisodes(
    contentId: string,
    seasonId: string,
  ): Promise<any[]> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new Error("error.invalidSeasonIdFormat");
    }

    const season = await Season.findOne({
      _id: seasonId,
      contentId,
    });

    if (!season) {
      throw new Error(ERROR_MESSAGES.SEASON_NOT_FOUND);
    }

    const episodes = await Episode.find({ seasonId }).sort({ episodeNumber: 1 }).lean();
    return episodes.map((ep: any) => {
      const transformedEp: any = { ...ep };
      if (typeof transformedEp.video === 'string' && !transformedEp.video.startsWith("http")) {
        transformedEp.video = `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL || ""}/${transformedEp.video}`;
      }
      if (transformedEp.thumbnail && !transformedEp.thumbnail.startsWith("http")) {
        transformedEp.thumbnail = `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL || ""}/${transformedEp.thumbnail}`;
      }
      transformedEp.videoUrl = transformedEp.video;
      transformedEp.videoFile = transformedEp.video;
      transformedEp.thumbnailUrl = transformedEp.thumbnail;
      return transformedEp;
    });
  }

  /**
   * Get episode by ID
   */
  static async getEpisodeById(
    contentId: string,
    seasonId: string,
    episodeId: string,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(episodeId)) {
      throw new Error("error.invalidEpisodeIdFormat");
    }

    const episode = await Episode.findOne({
      _id: episodeId,
      seasonId,
      contentId,
    }).lean();

    if (!episode) {
      throw new Error(ERROR_MESSAGES.EPISODE_NOT_FOUND);
    }

    const transformedEp: any = { ...episode };
    if (typeof transformedEp.video === 'string' && !transformedEp.video.startsWith("http")) {
      transformedEp.video = `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL || ""}/${transformedEp.video}`;
    }
    if (transformedEp.thumbnail && !transformedEp.thumbnail.startsWith("http")) {
      transformedEp.thumbnail = `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL || ""}/${transformedEp.thumbnail}`;
    }
    transformedEp.videoUrl = transformedEp.video;
    transformedEp.videoFile = transformedEp.video;
    transformedEp.thumbnailUrl = transformedEp.thumbnail;

    return transformedEp;
  }


  /**
   * Sanitize content for response (remove sensitive fields if needed)
   */
  static sanitizeContent(content: any): any {
    if (!content) {
      return content;
    }

    // Convert Mongoose document to plain JS object if applicable
    if (typeof content.toObject === "function") {
      content = content.toObject();
    }

    const sanitized = { ...content };

    if (content.uploadedBy) {
      const uploader = content.uploadedBy;
      if (uploader.role === Role.ADMIN || uploader.role === "admin" || String(uploader.role).toLowerCase() === "admin") {
        sanitized.uploadedBy = {
          id: uploader._id || uploader.id,
          role: "Admin",
          name: "Admin",
          source: "Admin",
        };
      } else {
        const name =
          uploader.companyName ||
          uploader.fullName ||
          uploader.email ||
          "Unknown";
        sanitized.uploadedBy = {
          id: uploader._id || uploader.id,
          role: uploader.role || "Producer",
          name,
          source: uploader.role === Role.PRODUCER ? "Producer" : "Producer",
        };
      }
    }

    if (content.censorCertificate) {
      sanitized.censorCertificateUrl = content.censorCertificate;
    }

    // Add contentType field for clarity in exports
    if (content.type) {
      sanitized.contentType = content.type;
    }

    // Map internal fields to frontend-expected fields
    if ('genreIds' in sanitized) {
      if (Array.isArray(sanitized.genreIds)) {
        const pureGenres: string[] = [];
        const pureCategories: string[] = [];

        sanitized.genreIds.forEach((g: any) => {
          if (typeof g === 'object' && g.name) {
            if (g.type === 'category') {
              pureCategories.push(g.name);
            } else {
              pureGenres.push(g.name);
            }
          } else if (typeof g === 'string') {
            pureGenres.push(g);
          }
        });

        sanitized.genres = pureGenres;
        sanitized.categories = pureCategories;
        sanitized.category = pureCategories;
      } else {
        sanitized.genres = sanitized.genreIds;
      }
      delete sanitized.genreIds;
    }

    if (sanitized.releaseDate) {
      sanitized.contentReleaseDate = sanitized.releaseDate;
    }
    if ('languageIds' in sanitized) {
      // Extract full language names, fallback to codes
      sanitized.language = Array.isArray(sanitized.languageIds)
        ? sanitized.languageIds.map((l: any) => {
            if (typeof l === 'object') {
              return getFullLanguageName(l.name, l.code);
            }
            return String(l);
          })
        : sanitized.languageIds;
      delete sanitized.languageIds;
    }
    if ('castCrew' in sanitized) {
      if (Array.isArray(sanitized.castCrew)) {
        sanitized.cast = sanitized.castCrew
          .filter((c: any) => String(c.type).toUpperCase() === "CAST" || c.type === "Cast" || c.role === "Cast" || (!c.type && c.role !== "Crew"))
          .map((c: any) => ({
            name: c.name,
            role: c.role || "Cast",
            type: "CAST",
            image: c.image ? (c.image.startsWith("http") ? c.image : `${AWS_MEDIA_URL}${c.image}`) : null
          }));
        sanitized.crew = sanitized.castCrew
          .filter((c: any) => String(c.type).toUpperCase() === "CREW" || c.type === "Crew" || c.role === "Crew" || (!c.type && c.role === "Crew"))
          .map((c: any) => ({
            name: c.name,
            role: c.role || "Crew",
            type: "CREW",
            image: c.image ? (c.image.startsWith("http") ? c.image : `${AWS_MEDIA_URL}${c.image}`) : null
          }));
        const directorObj = sanitized.castCrew.find(
          (c: any) => String(c.role).toLowerCase() === "director" || String(c.type).toUpperCase() === "CREW"
        );
        if (directorObj) {
          sanitized.director = directorObj.name;
        }
      }
      delete sanitized.castCrew;
    }
    if ('tag' in sanitized) {
      if (sanitized.tag && !sanitized.tags) {
        sanitized.tags = [sanitized.tag];
      }
      delete sanitized.tag;
    }

    if (content.producer) {
      sanitized.producer = content.producer;
    } else if (content.uploadedBy && (content.uploadedBy as any).role !== Role.ADMIN && (content.uploadedBy as any).role !== "admin") {
      sanitized.producer = (content.uploadedBy as any).companyName || (content.uploadedBy as any).fullName || "Uthsava Studios";
    }

    if (content.director) {
      sanitized.director = content.director;
    }

    if (content.totalSeasons !== undefined && content.totalSeasons !== null) {
      sanitized.totalSeasons = content.totalSeasons;
    }

    if ((content as any).totalEpisodes !== undefined && (content as any).totalEpisodes !== null) {
      sanitized.totalEpisodes = (content as any).totalEpisodes;
    }

    if (content.duration !== undefined && content.duration !== null) {
      sanitized.duration = content.duration;
    }

    // For SERIES: Remove fields that should only be for MOVIE and add season/episode info
    if (content.type === ContentType.SERIES) {
      sanitized.mainVideo = undefined;
      sanitized.mainVideoUrl = undefined;
    }

    return sanitized;
  }
}
