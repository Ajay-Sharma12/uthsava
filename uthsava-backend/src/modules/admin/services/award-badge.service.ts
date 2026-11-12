import { FilterQuery, Types } from "mongoose";
import { Content } from "../../../models";
import { AwardBadge, AwardBadgeStatus, AwardBadgeType, IAwardBadge } from "../../../models/award-badge.model";
import { logger } from "../../../core/constants/logger";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import {
  PaginationHelper,
  PaginationParams,
} from "../../shared/helpers/pagination.helper";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fields that can be searched by the admin name-search bar */
const AWARD_BADGE_SEARCH_FIELDS = ["name"] as const;

/** Fields exposed on every row of the admin listing table */
const AWARD_BADGE_SORT_FIELDS = [
  "name",
  "type",
  "status",
  "createdAt",
  "updatedAt",
] as const;

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateAwardBadgeInput {
  type: AwardBadgeType;
  name: string;
  /** MongoDB ObjectId strings for movies / series to assign on creation */
  contentIds?: string[];
  status?: AwardBadgeStatus;
  createdBy?: string;
}

export interface UpdateAwardBadgeInput {
  type?: AwardBadgeType;
  name?: string;
  /** Full replacement of the contentIds array */
  contentIds?: string[];
  status?: AwardBadgeStatus;
  updatedBy?: string;
}

export interface ListAwardBadgesFilters {
  search?: string;
  type?: AwardBadgeType;
  status?: AwardBadgeStatus;
  fromDate?: string;
  toDate?: string;
  assignedTo?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * AwardBadgeService
 *
 * Encapsulates all business logic for the Awards & Badges manager.
 * Follows the same static-class pattern used by CouponService / FaqService.
 */
export class AwardBadgeService {
  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Returns a paginated list of awards/badges with optional search,
   * type/status filters and creation-date range.
   *
   * The listing table requires:
   *   type | name | date | assignedTo (content titles) | status
   */
  static async listAwardBadges(
    pagination: Required<PaginationParams>,
    filters: ListAwardBadgesFilters,
  ) {
    // Build MongoDB filter query
    const query: FilterQuery<IAwardBadge> = {};

    // Search by award/badge name (case-insensitive partial match)
    if (filters.search) {
      Object.assign(
        query,
        QueryBuilder.buildSearchQuery(filters.search, AWARD_BADGE_SEARCH_FIELDS),
      );
    }

    // Filter by type (award | badge)
    if (filters.type) {
      query.type = filters.type;
    }

    // Filter by activation status
    if (filters.status) {
      query.status = filters.status;
    }

    // Filter by creation date range
    if (filters.fromDate || filters.toDate) {
      Object.assign(
        query,
        QueryBuilder.buildDateRangeFilter(filters.fromDate, filters.toDate, "createdAt"),
      );
    }

    // Filter by assigned content ID
    if (filters.assignedTo) {
      query.contentIds = new Types.ObjectId(filters.assignedTo);
    }

    // Execute paginated query and populate content titles for the "Assigned to" column
    return PaginationHelper.paginate(
      AwardBadge,
      query,
      pagination,
      undefined,
      [{ path: "contentIds", select: "title type" }],
    );
  }

  /**
   * Returns a single award/badge record with fully-populated content details.
   * Returns null if the record does not exist.
   */
  static async getAwardBadgeById(id: string) {
    return AwardBadge.findById(id)
      .populate("contentIds", "title type posterImage")
      .lean();
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new award or badge.
   *
   * Business rules applied:
   *  - contentIds are validated to ensure they exist in the Content collection
   *    before being stored (prevents orphaned references).
   *  - An award/badge can be assigned to multiple movies/series in a single call.
   */
  static async createAwardBadge(input: CreateAwardBadgeInput): Promise<IAwardBadge> {
    const contentObjectIds = await AwardBadgeService._resolveContentIds(
      input.contentIds,
    );

    const awardBadge = new AwardBadge({
      type: input.type,
      name: input.name.trim(),
      contentIds: contentObjectIds,
      status: input.status ?? AwardBadgeStatus.ACTIVE,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
      updatedBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
    });

    await awardBadge.save();
    logger.info(`[AwardBadge] Created: id=${awardBadge._id} type=${awardBadge.type} name="${awardBadge.name}"`);

    return awardBadge;
  }

  /**
   * Fully updates an existing award/badge.
   * Only the fields present in the input object are modified.
   *
   * contentIds replacement behaviour:
   *  - If contentIds is provided → the stored array is replaced wholesale
   *    (send [] to remove all assignments).
   *  - If contentIds is omitted  → existing assignments are preserved.
   */
  static async updateAwardBadge(
    id: string,
    input: UpdateAwardBadgeInput,
  ): Promise<IAwardBadge | null> {
    const awardBadge = await AwardBadge.findById(id);
    if (!awardBadge) {
      return null;
    }

    // Apply scalar field updates
    if (input.type !== undefined) awardBadge.type = input.type;
    if (input.name !== undefined) awardBadge.name = input.name.trim();
    if (input.status !== undefined) awardBadge.status = input.status;

    // Replace contentIds only when explicitly provided
    if (input.contentIds !== undefined) {
      awardBadge.contentIds = await AwardBadgeService._resolveContentIds(
        input.contentIds,
      );
    }

    // Stamp the updater
    if (input.updatedBy) {
      awardBadge.updatedBy = new Types.ObjectId(input.updatedBy);
    }

    await awardBadge.save();
    logger.info(`[AwardBadge] Updated: id=${awardBadge._id}`);

    return awardBadge;
  }

  /**
   * Toggles the active/inactive status of an award or badge.
   * Used by the status toggle column in the admin listing table.
   */
  static async updateAwardBadgeStatus(
    id: string,
    status: AwardBadgeStatus,
    updatedBy?: string,
  ): Promise<IAwardBadge | null> {
    const awardBadge = await AwardBadge.findById(id);
    if (!awardBadge) {
      return null;
    }

    awardBadge.status = status;
    if (updatedBy) {
      awardBadge.updatedBy = new Types.ObjectId(updatedBy);
    }

    await awardBadge.save();
    logger.info(
      `[AwardBadge] Status toggled: id=${awardBadge._id} → ${status}`,
    );

    return awardBadge;
  }

  // ─── Query helpers ─────────────────────────────────────────────────────────

  /**
   * Builds the search portion of a listing query.
   * Exposed so the controller can compose it with additional filters.
   */
  static buildSearchQuery(search?: string) {
    if (!search) return {};
    return QueryBuilder.buildSearchQuery(search, AWARD_BADGE_SEARCH_FIELDS);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Converts an array of content ID strings to validated ObjectId instances.
   *
   * Throws if any ID does not correspond to an existing Content document,
   * ensuring referential integrity between awards/badges and content.
   *
   * @param ids - Raw string IDs from the request body (may be undefined / empty)
   * @returns Typed ObjectId array (empty if no IDs provided)
   */
  private static async _resolveContentIds(
    ids?: string[],
  ): Promise<Types.ObjectId[]> {
    if (!ids || ids.length === 0) return [];

    const objectIds = ids.map((id) => new Types.ObjectId(id));

    // Verify every supplied ID exists in the Content collection
    const existingCount = await Content.countDocuments({ _id: { $in: objectIds } });
    if (existingCount !== objectIds.length) {
      throw new Error("award_badge.invalid_content_ids");
    }

    return objectIds;
  }
}
