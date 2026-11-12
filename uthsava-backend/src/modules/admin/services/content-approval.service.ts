import { Types } from "mongoose";
import {
  Content,
  ContentStatus,
  ContentApprovalStatus,
  // ApprovalHistory,
} from "../../../models/content.model";
import { Genre } from "../../../models/genre.model";
import { Season } from "../../../models/season.model";
import { Episode } from "../../../models/episode.model";
import { logger } from "../../../core/constants/logger";
import { resolveMediaUrl } from "../../shared/helpers/url.helper";

export interface ApprovalSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number; // percentage
}

export interface ApprovalStats {
  date: string;
  approved: number;
  rejected: number;
  pending: number;
}

export class ContentApprovalService {
  /**
   * Get all pending content approvals with pagination and advanced filters
   * Only shows content created by producers (not admins)
   */
  static async getPendingApprovals(
    page: number = 1,
    limit: number = 10,
    filters: {
      search?: string;
      contentType?: string;
      status?: string;
      genre?: string;
      producerId?: string;
      cast?: string;
      tags?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ) {
    try {
      const skip = (page - 1) * limit;

      // Map sort field names to actual database fields
      let sortFieldName = filters.sortBy || "createdAt";
      if (sortFieldName === "submissionDate") {
        sortFieldName = "createdAt";
      } else if (sortFieldName === "contentType") {
        sortFieldName = "type";
      }
      // Note: producerName sorting will be handled after the lookup

      const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

      // Build aggregation pipeline for better control
      const pipeline: any[] = [];

      // Stage 1: Match basic filters
      const matchStage: any = {};

      // Status filter - normalize values to approvalStatus field
      if (filters.status && filters.status.toLowerCase() !== "all") {
        const statusLower = filters.status.toLowerCase();
        if (statusLower === "pending" || statusLower === "under_review") {
          matchStage.$or = [
            { approvalStatus: { $in: [ContentApprovalStatus.PENDING, ContentApprovalStatus.DRAFT, ContentApprovalStatus.RE_EDIT_REQUESTED] } },
            { approvalStatus: { $exists: false } },
            { approvalStatus: null },
          ];
        } else if (statusLower === "approved") {
          matchStage.approvalStatus = ContentApprovalStatus.APPROVED;
        } else if (statusLower === "rejected") {
          matchStage.$or = [
            { approvalStatus: ContentApprovalStatus.REJECTED },
            { rejectionReason: { $nin: [null, ""] } },
          ];
        }
      }

      // Search by title or producer name using $or
      if (filters.search) {
        // Search placeholder - will be applied after lookup
        matchStage.__search = filters.search;
      }

      // Search by cast name
      if (filters.cast) {
        matchStage.cast = {
          $elemMatch: {
            $regex: filters.cast,
            $options: "i",
          },
        };
      }

      // Filter by tags
      if (filters.tags) {
        const tagsArray = filters.tags.split(",").map((tag) => tag.trim());

        matchStage.tags = {
          $elemMatch: {
            $regex: `(${tagsArray.join("|")})`,
            $options: "i"
          }
        };
      }

      // Content type filter
      if (
        filters.contentType &&
        ["MOVIE", "SERIES"].includes(filters.contentType.toUpperCase())
      ) {
        matchStage.type = filters.contentType.toUpperCase();
      }

      // Producer filter
      if (filters.producerId) {
        matchStage.uploadedBy = new Types.ObjectId(filters.producerId);
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        matchStage.createdAt = {};
        if (filters.dateFrom) {
          matchStage.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          const endDate = new Date(filters.dateTo);
          endDate.setHours(23, 59, 59, 999);
          matchStage.createdAt.$lte = endDate;
        }
      }

      // Remove search placeholder before building pipeline
      const searchTerm = matchStage.__search;
      delete matchStage.__search;

      pipeline.push(
        { $match: matchStage },
        {
          $lookup: {
            from: "users",
            localField: "uploadedBy",
            foreignField: "_id",
            as: "uploaderInfo",
          },
        },
      );

      // Stage 4: Genre filter (if provided)
      if (filters.genre) {
        if (Types.ObjectId.isValid(filters.genre)) {
          pipeline.push({
            $match: {
              genres: { $in: [new Types.ObjectId(filters.genre)] },
            },
          });
        } else {
          const genreDoc = await Genre.findOne({
            name: { $regex: new RegExp(`^${filters.genre}$`, "i") },
            type: "genre",
          });
          if (genreDoc) {
            pipeline.push({
              $match: {
                genres: { $in: [genreDoc._id] },
              },
            });
          } else {
            // If genre not found, return empty results
            return {
              data: [],
              pagination: {
                total: 0,
                page,
                limit,
                pages: 0,
              },
            };
          }
        }
      }

      // Stage 5: Lookup genres
      pipeline.push({
        $lookup: {
          from: "contentcategories",
          localField: "genres",
          foreignField: "_id",
          as: "genreDetails",
        },
      });

      // Stage 6: Add search filter for title and producer name (after lookup)
      if (searchTerm?.trim()) {
        pipeline.push(
          {
            $addFields: {
              uploaderFullName: {
                $arrayElemAt: ["$uploaderInfo.fullName", 0],
              },
            },
          },
          {
            $match: {
              $or: [
                { title: { $regex: searchTerm, $options: "i" } },
                { uploaderFullName: { $regex: searchTerm, $options: "i" } },
              ],
            },
          },
          { $unset: "uploaderFullName" },
        );
      }

      // Stage 8: Count total before pagination
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Content.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Stage 9: Sort - Handle special cases
      const sortStage: any = {};
      if (filters.sortBy === "producerName") {
        // Sort by producer name from the looked-up user
        sortStage["uploaderInfo.fullName"] = sortOrder;
      } else if (filters.sortBy === "uploadedBy") {
        // Sort by producer ID
        sortStage["uploadedBy"] = sortOrder;
      } else {
        // Sort by other fields
        sortStage[sortFieldName] = sortOrder;
      }

      // Add remaining pipeline stages
      pipeline.push(
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            type: 1,
            producer: 1,
            approvalStatus: 1,
            status: 1,
            createdAt: 1,
            submittedAt: 1,
            submissionDate: 1,
            reEditRequestedReason: 1,
            approvalNotes: 1,
            lastReviewDate: 1,
            reviewCount: 1,
            posterImage: 1,
            poster: 1,
            thumbnail: 1,
            mainVideo: 1,
            teaserVideo: 1,
            description: 1,
            shortDescription: 1,
            rejectionReason: 1,
            ageCategory: 1,
            language: 1,
            languageIds: 1,
            genreIds: 1,
            duration: 1,
            releaseYear: 1,
            cast: 1,
            castCrew: 1,
            tags: 1,
            seasons: 1,
            uploadedBy: 1,
            uploaderInfo: {
              _id: 1,
              fullName: 1,
              email: 1,
              role: 1,
            },
            genreDetails: {
              _id: 1,
              name: 1,
              type: 1,
            },
          },
        },
      );

      const contents = await Content.aggregate(pipeline);

      return {
        data: contents,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get pending approvals error:", error);
      throw error;
    }
  }

  /**
   * Get single content details for approval review
   */
  static async getContentForApproval(contentId: string) {
    try {
      // Fetch content with proper field population
      // uploadedBy: User document with name, email, role fields
      // genreIds: Genre documents with name field
      // languageIds: Language documents with name field
      const content = await Content.findById(contentId)
        .populate("uploadedBy", "fullName email role")
        .populate("genreIds", "name type")
        .populate("languageIds", "name")
        .lean();

      if (!content) {
        throw new Error("error.contentNotFound");
      }

      // Update review tracking
      await Content.findByIdAndUpdate(contentId, {
        $set: { lastReviewDate: new Date() },
        $inc: { reviewCount: 1 },
      });

      // Fetch seasons and episodes for series
      if (content.type?.toUpperCase() === "SERIES") {
        const seasons = await Season.find({ contentId }).sort({ seasonNumber: 1 }).lean();
        const populatedSeasons = await Promise.all(
          seasons.map(async (season: any) => {
            const episodes = await Episode.find({ seasonId: season._id }).sort({ episodeNumber: 1 }).lean();
            const transformedEpisodes = episodes.map((ep: any) => {
              const transformedEp = { ...ep };
              const rawVideo = transformedEp.videoFile || (typeof transformedEp.video === "object" ? transformedEp.video?.url : transformedEp.video);
              transformedEp.videoUrl = resolveMediaUrl(rawVideo) || rawVideo;
              transformedEp.videoFile = resolveMediaUrl(transformedEp.videoFile) || transformedEp.videoFile;
              transformedEp.thumbnailUrl = resolveMediaUrl(transformedEp.thumbnailImage || transformedEp.thumbnail);
              transformedEp.thumbnail = resolveMediaUrl(transformedEp.thumbnailImage || transformedEp.thumbnail);
              return transformedEp;
            });
            return {
              ...season,
              episodes: transformedEpisodes,
            };
          })
        );
        (content as any).seasons = populatedSeasons;
        (content as any).seasonCount = seasons.length;
        (content as any).episodeCount = populatedSeasons.reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0);
      }

      return content;
    } catch (error) {
      logger.error("Get content for approval error:", error);
      throw error;
    }
  }

  /**
   * Approve content
   */
  static async approveContent(
    contentId: string,
    adminId: string,
    ageCategory?: string,
    notes?: string,
  ) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error("error.contentNotFound");
      }

      if (content.approvalStatus === ContentApprovalStatus.APPROVED) {
        throw new Error("error.contentIsAlreadyApproved");
      }

      // const approvalHistoryEntry: ApprovalHistory = {
      //   approvedBy: new Types.ObjectId(adminId),
      //   status: ContentStatus.APPROVED,
      //   date: new Date(),
      //   reason: notes || undefined,
      // };

      const updateData: any = {
        $set: {
          approvalStatus: ContentApprovalStatus.APPROVED,
          status: ContentStatus.ACTIVE,
          isActive: true,
          approvedBy: adminId,
          approvalDate: new Date(),
          rejectionReason: null,
          approvalNotes: notes || null,
          lastReviewDate: new Date(),
        },
        $inc: {
          reviewCount: 1,
        },
      };

      // Set age category if provided
      if (
        ageCategory &&
        ["KIDS", "ADULTS"].includes(ageCategory.toUpperCase())
      ) {
        updateData.$set.ageCategory = ageCategory.toUpperCase();
      }

      const updated = await Content.findByIdAndUpdate(contentId, updateData, {
        new: true,
      }).populate("uploadedBy", "fullName email");

      logger.info(
        `Content ${contentId} approved by admin ${adminId} with age category: ${ageCategory}`,
      );
      return updated;
    } catch (error) {
      logger.error("Approve content error:", error);
      throw error;
    }
  }

  /**
   * Reject content
   */
  static async rejectContent(
    contentId: string,
    adminId: string,
    rejectionReason: string,
  ) {
    try {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        throw new Error(
          "Rejection reason is required and must be at least 5 characters",
        );
      }

      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error("error.contentNotFound");
      }

      const updated = await Content.findByIdAndUpdate(
        contentId,
        {
          $set: {
            approvalStatus: ContentApprovalStatus.REJECTED,
            status: ContentStatus.INACTIVE,
            isActive: false,
            approvedBy: adminId,
            approvalDate: new Date(),
            rejectionReason: rejectionReason,
            lastReviewDate: new Date(),
          },
          $inc: {
            reviewCount: 1,
          },
        },
        { new: true },
      ).populate("uploadedBy", "fullName email");

      logger.info(`Content ${contentId} rejected by admin ${adminId}`);
      return updated;
    } catch (error) {
      logger.error("Reject content error:", error);
      throw error;
    }
  }

  /**
   * Submit content for review (Producer action)
   * Change status from DRAFT to PENDING
   */
  static async submitForReview(contentId: string, producerId: string) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error("error.contentNotFound");
      }

      // Only producer who created it can submit
      if (content.uploadedBy.toString() !== producerId) {
        throw new Error("error.cannotSubmitOthersContent");
      }

      // Can only submit DRAFT or REJECTED content
      if (
        content.approvalStatus !== ContentApprovalStatus.DRAFT &&
        content.approvalStatus !== ContentApprovalStatus.REJECTED
      ) {
        throw new Error("error.canOnlySubmitDraftOrRejectedContent");
      }

      const updated = await Content.findByIdAndUpdate(
        contentId,
        {
          $set: {
            approvalStatus: ContentApprovalStatus.PENDING,
            status: ContentStatus.INACTIVE,
            isActive: false,
            submittedAt: new Date(),
            submittedBy: new Types.ObjectId(producerId),
            rejectionReason: null, // Clear rejection reason on resubmit
          },
        },
        { new: true },
      );

      logger.info(`Content ${contentId} submitted for review by producer ${producerId}`);
      return updated;
    } catch (error) {
      logger.error("Submit for review error:", error);
      throw error;
    }
  }

  /**
   * Put content on 24h quality hold
   */
  static async holdContent(contentId: string, adminId: string, notes?: string) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error("error.contentNotFound");
      }

      const holdNote = notes?.trim() || "Flagged for 24-hour quality verification hold";
      const updated = await Content.findByIdAndUpdate(
        contentId,
        {
          $set: {
            approvalStatus: ContentApprovalStatus.ON_HOLD,
            status: ContentStatus.INACTIVE,
            isActive: false,
            approvalNotes: holdNote,
            lastReviewDate: new Date(),
          },
          $inc: {
            reviewCount: 1,
          },
        },
        { new: true },
      ).populate("uploadedBy", "fullName email");

      logger.info(`Content ${contentId} placed on 24h hold by admin ${adminId}`);
      return updated;
    } catch (error) {
      logger.error("Hold content error:", error);
      throw error;
    }
  }

  /**
   * Request re-edit from producer
   */
  static async requestReEditContent(
    contentId: string,
    adminId: string,
    reason: string,
  ) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error("error.contentNotFound");
      }

      const updated = await Content.findByIdAndUpdate(
        contentId,
        {
          $set: {
            approvalStatus: ContentApprovalStatus.RE_EDIT_REQUESTED,
            status: ContentStatus.INACTIVE,
            isActive: false,
            reEditRequestedReason: reason,
            approvalNotes: reason,
            lastReviewDate: new Date(),
          },
          $inc: {
            reviewCount: 1,
          },
        },
        { new: true },
      ).populate("uploadedBy", "fullName email");

      logger.info(`Re-edit requested for content ${contentId} by admin ${adminId}`);
      return updated;
    } catch (error) {
      logger.error("Request re-edit error:", error);
      throw error;
    }
  }

  /**
   * Revoke re-edit request and move content back to PENDING/UNDER_REVIEW
   */
  static async revokeReEditContent(
    contentId: string,
    adminId: string,
    notes?: string,
  ) {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error("error.contentNotFound");
      }

      const updated = await Content.findByIdAndUpdate(
        contentId,
        {
          $set: {
            approvalStatus: ContentApprovalStatus.PENDING,
            approvalNotes: notes?.trim() || "Re-edit request revoked by admin",
            lastReviewDate: new Date(),
          },
          $unset: {
            reEditRequestedReason: 1,
          },
          $inc: {
            reviewCount: 1,
          },
        },
        { new: true },
      ).populate("uploadedBy", "fullName email");

      logger.info(`Re-edit request for content ${contentId} revoked by admin ${adminId}`);
      return updated;
    } catch (error) {
      logger.error("Revoke re-edit content error:", error);
      throw error;
    }
  }

  /**
   * Get approval history for a specific content
   */
  // static async getContentApprovalHistory(
  //   contentId: string,
  //   page: number = 1,
  //   limit: number = 10,
  //   filters: { status?: string; sortOrder?: string } = {},
  // ) {
  //   try {
  //     const skip = (page - 1) * limit;
  //     const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

  //     const content = await Content.findById(contentId).select(
  //       "title approvalHistory",
  //     );

  //     if (!content) {
  //       throw new Error("error.contentNotFound");
  //     }

  //     let history = content.approvalHistory || [];

  //     // Filter by status if provided
  //     if (filters.status) {
  //       history = history.filter((h) => h.status === filters.status);
  //     }

  //     // Sort by date
  //     history = history.sort((a, b) => {
  //       const timeA = a.date.getTime();
  //       const timeB = b.date.getTime();
  //       return sortOrder === 1 ? timeA - timeB : timeB - timeA;
  //     });

  //     const total = history.length;
  //     const paginated = history.slice(skip, skip + limit);

  //     // Populate approver details
  //     const enrichedHistory = await Promise.all(
  //       paginated.map(async (entry) => ({
  //         ...entry,
  //         approver: await this.getUserInfo(entry.approvedBy),
  //       })),
  //     );

  //     return {
  //       contentTitle: content.title,
  //       data: enrichedHistory,
  //       pagination: {
  //         total,
  //         page,
  //         limit,
  //         pages: Math.ceil(total / limit),
  //       },
  //     };
  //   } catch (error) {
  //     logger.error("Get approval history error:", error);
  //     throw error;
  //   }
  // }

  /**
   * Get overall approval statistics/summary
   */
  static async getApprovalSummary(
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ApprovalSummary> {
    try {
      const query: any = {};

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = dateFrom;
        if (dateTo) query.createdAt.$lte = dateTo;
      }

      const total = await Content.countDocuments(query);
      const pending = await Content.countDocuments({
        ...query,
        $or: [
          { approvalStatus: ContentApprovalStatus.PENDING },
          { approvalStatus: ContentApprovalStatus.RE_EDIT_REQUESTED },
          { approvalStatus: ContentApprovalStatus.DRAFT },
          { approvalStatus: { $exists: false } },
          { approvalStatus: null },
        ],
      });
      const approved = await Content.countDocuments({
        ...query,
        approvalStatus: ContentApprovalStatus.APPROVED,
      });
      const rejected = await Content.countDocuments({
        ...query,
        $or: [
          { approvalStatus: ContentApprovalStatus.REJECTED },
          { rejectionReason: { $nin: [null, ""] } },
        ],
      });

      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        total,
        pending,
        approved,
        rejected,
        approvalRate,
      };
    } catch (error) {
      logger.error("Get approval summary error:", error);
      throw error;
    }
  }

  /**
   * Get approval statistics for a date range
   */
  static async getApprovalStats(
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ApprovalStats[]> {
    try {
      const query: any = {};

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = dateFrom;
        if (dateTo) query.createdAt.$lte = dateTo;
      }

      const stats = await Content.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            approved: {
              $sum: {
                $cond: [{ $eq: ["$status", ContentApprovalStatus.APPROVED] }, 1, 0],
              },
            },
            rejected: {
              $sum: {
                $cond: [{ $ne: ["$rejectionReason", null] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$status", ContentApprovalStatus.PENDING] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return stats.map((s) => ({
        date: s._id,
        approved: s.approved,
        rejected: s.rejected,
        pending: s.pending,
      }));
    } catch (error) {
      logger.error("Get approval stats error:", error);
      throw error;
    }
  }

  /**
   * Helper: Get user info by ID
   */
  private static async getUserInfo(userId: Types.ObjectId) {
    try {
      // For simplicity, return the ID and fetch separately in controller if needed
      // In production, you might cache this
      return { _id: userId };
    } catch (error) {
      return { _id: userId };
    }
  }
}
