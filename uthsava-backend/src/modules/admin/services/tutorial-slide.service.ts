import { FilterQuery, Types } from "mongoose";
import {
  TutorialSlide,
  ITutorialSlide,
  SlideMediaType,
  SlideStatus,
} from "../../../models/tutorial-slide.model";
import { logger } from "../../../core/constants/logger";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import {
  PaginationHelper,
  PaginationParams,
} from "../../shared/helpers/pagination.helper";
import { config } from "../../../core/config";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Fields the admin name-search bar is matched against */
const SLIDE_SEARCH_FIELDS = ["title", "description"] as const;

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateTutorialSlideInput {
  title: string;
  description: string;
  mediaType: SlideMediaType;
  /** S3 key or full URL – required when mediaType === "image" */
  image?: string;
  /** S3 key or full URL – required when mediaType === "video" */
  video?: string;
  sequence: number;
  status?: SlideStatus;
  createdBy?: string;
}

export interface UpdateTutorialSlideInput {
  title?: string;
  description?: string;
  mediaType?: SlideMediaType;
  image?: string | null;
  video?: string | null;
  sequence?: number;
  status?: SlideStatus;
  updatedBy?: string;
}

export interface ListTutorialSlidesFilters {
  search?: string;
  mediaType?: SlideMediaType;
  status?: SlideStatus;
  fromDate?: string;
  toDate?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * TutorialSlideService
 *
 * Encapsulates all business logic for the Tutorial Screen Manager module.
 * Follows the static-class pattern used throughout this codebase
 * (CmsPageService, FaqService, AwardBadgeService, …).
 */
export class TutorialSlideService {

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolves a stored S3 key or relative path to a full CloudFront URL.
   * If the value already starts with http(s):// it is returned as-is.
   * This mirrors the transform applied in the User model's toJSON hook.
   */
  static resolveMediaUrl(key?: string | null): string {
    if (!key || key.trim() === "") return "";
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    const baseUrl = config.aws?.cloudFrontUrl || "";
    return baseUrl ? `${baseUrl}/${key.replace(/^\/+/, "")}` : key;
  }

  /**
   * Formats a single document for the admin listing table.
   * Exposes only the columns required by the spec:
   *   title | description | mediaType | preview URLs | sequence | status
   */
  static formatListItem(slide: ITutorialSlide) {
    const rawImage = slide.image || null;
    const rawVideo = slide.video || null;
    const resolvedImage = rawImage ? TutorialSlideService.resolveMediaUrl(rawImage) : null;
    const resolvedVideo = rawVideo ? TutorialSlideService.resolveMediaUrl(rawVideo) : null;

    return {
      _id: slide._id,
      title: slide.title,
      description: slide.description,
      mediaType: slide.mediaType,
      image: resolvedImage,
      video: resolvedVideo,
      rawImageKey: rawImage,
      rawVideoKey: rawVideo,
      sequence: slide.sequence,
      status: slide.status,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Returns a paginated admin listing of tutorial slides.
   *
   * Default sort is by sequence ascending so the admin sees slides in the
   * same order users will see them.
   */
  static async listSlides(
    pagination: Required<PaginationParams>,
    filters: ListTutorialSlidesFilters,
  ) {
    const query: FilterQuery<ITutorialSlide> = {};

    // Partial title / description search
    if (filters.search) {
      Object.assign(
        query,
        QueryBuilder.buildSearchQuery(filters.search, SLIDE_SEARCH_FIELDS),
      );
    }

    // Filter by media type (image | video)
    if (filters.mediaType) {
      query.mediaType = filters.mediaType;
    }

    // Filter by activation status
    if (filters.status) {
      query.status = filters.status;
    }

    // Creation date range filter
    if (filters.fromDate || filters.toDate) {
      Object.assign(
        query,
        QueryBuilder.buildDateRangeFilter(
          filters.fromDate,
          filters.toDate,
          "createdAt",
        ),
      );
    }

    return PaginationHelper.paginate(TutorialSlide, query, pagination);
  }

  /**
   * Returns a single slide document by its MongoDB _id.
   * Returns null when not found.
   */
  static async getSlideById(id: string): Promise<ITutorialSlide | null> {
    return TutorialSlide.findById(id);
  }

  /**
   * Returns all ACTIVE slides sorted by sequence for consumption by the app.
   * This is the endpoint the mobile / web app calls during onboarding.
   * Inactive slides are excluded automatically – no app update required.
   */
  static async getActiveSlides(): Promise<ITutorialSlide[]> {
    return TutorialSlide.find({ status: SlideStatus.ACTIVE })
      .sort({ sequence: 1 });
  }

  /**
   * Returns ACTIVE slides sorted by sequence with pagination support.
   */
  static async getActiveSlidesPaginated(page: number = 1, limit: number = 10) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const skip = (p - 1) * l;

    const [slides, totalCount] = await Promise.all([
      TutorialSlide.find({ status: SlideStatus.ACTIVE })
        .sort({ sequence: 1 })
        .skip(skip)
        .limit(l),
      TutorialSlide.countDocuments({ status: SlideStatus.ACTIVE }),
    ]);

    const formattedSlides = slides.map((slide) =>
      TutorialSlideService.formatListItem(slide as any)
    );

    const totalPages = Math.ceil(totalCount / l) || 1;

    return {
      totalSlides: totalCount,
      totalCount,
      slides: formattedSlides,
      data: formattedSlides,
      pagination: {
        page: p,
        limit: l,
        totalCount,
        totalPages,
        hasNextPage: p < totalPages,
        hasPrevPage: p > 1,
      },
    };
  }

  /**
   * Compacts all active-slide sequences into a clean, gap-free 1, 2, 3 … series.
   *
   * Run this once to repair any pre-existing gaps left by earlier (buggy)
   * reorder / status-toggle operations.  Safe to run multiple times (idempotent).
   *
   * Algorithm:
   *   1. Load every ACTIVE slide sorted by current sequence (ascending).
   *   2. Re-assign positions 1, 2, 3 … in that same order.
   *   3. Persist only the slides whose sequence actually changed.
   *
   * Returns the number of slides that were updated.
   */
  static async normalizeActiveSequences(): Promise<number> {
    const activeSlides = await TutorialSlide.find({ status: SlideStatus.ACTIVE })
      .sort({ sequence: 1 });

    let updatedCount = 0;

    for (let i = 0; i < activeSlides.length; i++) {
      const correctSeq = i + 1; // 1-based
      const slide = activeSlides[i];

      if (slide.sequence !== correctSeq) {
        await TutorialSlide.updateOne(
          { _id: slide._id },
          { $set: { sequence: correctSeq } },
        );
        updatedCount++;
        logger.info(
          `[TutorialSlide] Normalize: slide ${slide._id} ${slide.sequence} → ${correctSeq}`,
        );
      }
    }

    logger.info(
      `[TutorialSlide] Normalize complete: ${updatedCount} slide(s) re-sequenced out of ${activeSlides.length} active`,
    );

    return updatedCount;
  }



  /**
   * Creates a new tutorial slide.
   *
   * Sequence-collision handling (same as FaqService.createFaq):
   * If the requested sequence position is already occupied, all slides at or
   * above that position are shifted up by one before the new slide is saved.
   * This lets the admin freely insert slides between existing ones without
   * manually renumbering the rest.
   */
  static async createSlide(
    input: CreateTutorialSlideInput,
  ): Promise<ITutorialSlide> {
    const targetSequence = input.sequence;

    // Shift existing slides if the target position is already taken
    const conflict = await TutorialSlide.findOne({ sequence: targetSequence });
    if (conflict) {
      await TutorialSlide.updateMany(
        { sequence: { $gte: targetSequence } },
        { $inc: { sequence: 1 } },
      );
      logger.info(
        `[TutorialSlide] Shifted slides at sequence >= ${targetSequence} up by 1`,
      );
    }

    const slide = new TutorialSlide({
      title: input.title.trim(),
      description: input.description.trim(),
      mediaType: input.mediaType,
      image: input.image ?? undefined,
      video: input.video ?? undefined,
      sequence: targetSequence,
      status: input.status ?? SlideStatus.ACTIVE,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
      updatedBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
    });

    await slide.save();
    logger.info(
      `[TutorialSlide] Created: id=${slide._id} seq=${slide.sequence} type=${slide.mediaType}`,
    );

    return slide;
  }

  /**
   * Updates an existing tutorial slide.
   *
   * Sequence change handling (bidirectional):
   *
   * Moving UP (newSeq < oldSeq):
   *   Slides occupying [newSeq … oldSeq-1] are shifted DOWN by 1 to make room.
   *   Example: A(1) B(2) C(3) D(4), move B→1  ⟹  A(2) B(1) C(3) D(4)
   *
   * Moving DOWN (newSeq > oldSeq):
   *   Slides occupying [oldSeq+1 … newSeq] are shifted UP by -1 to close the gap.
   *   Example: A(1) B(2) C(3) D(4), move B→4  ⟹  A(1) C(2) D(3) B(4)
   *
   * This always keeps active sequences contiguous with no gaps.
   */
  static async updateSlide(
    id: string,
    input: UpdateTutorialSlideInput,
  ): Promise<ITutorialSlide | null> {
    const slide = await TutorialSlide.findById(id);
    if (!slide) return null;

    // Apply scalar updates
    if (input.title !== undefined) slide.title = input.title.trim();
    if (input.description !== undefined) slide.description = input.description.trim();
    if (input.mediaType !== undefined) slide.mediaType = input.mediaType;
    if (input.status !== undefined) slide.status = input.status;

    // Update image / video – null explicitly clears the stored value
    if (input.image !== undefined) slide.image = input.image ?? undefined;
    if (input.video !== undefined) slide.video = input.video ?? undefined;

    // Handle sequence reposition
    if (input.sequence !== undefined && input.sequence !== slide.sequence) {
      const oldSeq = slide.sequence;

      // ── Clamp to valid range ─────────────────────────────────────────────
      // Count how many ACTIVE slides exist (this slide is currently active, so
      // it is included in the count).  The valid range is [1, activeCount].
      //
      // Why this matters: if there are 2 active slides and the admin types "5",
      // setting seq=5 would push the other slide to seq=1 and leave gaps 2,3,4.
      // Clamping to activeCount (2) means the slide goes to the last position
      // without creating any gaps.
      const activeCount = await TutorialSlide.countDocuments({
        status: SlideStatus.ACTIVE,
      });
      const newSeq = Math.min(Math.max(1, input.sequence), activeCount);

      if (newSeq !== oldSeq) {
        if (newSeq < oldSeq) {
          // Moving UP: slides in [newSeq, oldSeq-1] shift down by +1 to make room
          await TutorialSlide.updateMany(
            {
              sequence: { $gte: newSeq, $lt: oldSeq },
              _id: { $ne: id },
              status: SlideStatus.ACTIVE,
            },
            { $inc: { sequence: 1 } },
          );
          logger.info(
            `[TutorialSlide] Moved slide ${id} UP: ${oldSeq}→${newSeq}; shifted slides in [${newSeq},${oldSeq - 1}] up by 1`,
          );
        } else {
          // Moving DOWN: slides in [oldSeq+1, newSeq] shift up by -1 to close the gap
          await TutorialSlide.updateMany(
            {
              sequence: { $gt: oldSeq, $lte: newSeq },
              _id: { $ne: id },
              status: SlideStatus.ACTIVE,
            },
            { $inc: { sequence: -1 } },
          );
          logger.info(
            `[TutorialSlide] Moved slide ${id} DOWN: ${oldSeq}→${newSeq}; shifted slides in [${oldSeq + 1},${newSeq}] down by 1`,
          );
        }

        slide.sequence = newSeq;
      }
    }

    // Stamp the updater
    if (input.updatedBy) {
      slide.updatedBy = new Types.ObjectId(input.updatedBy);
    }

    await slide.save();
    logger.info(`[TutorialSlide] Updated: id=${slide._id}`);

    return slide;
  }

  /**
   * Toggles the active/inactive status of a tutorial slide and re-sequences
   * the remaining active slides to keep their positions contiguous.
   *
   * Going INACTIVE:
   *   The slide's sequence slot is freed. Every active slide whose sequence
   *   is greater than the freed slot shifts down by 1.
   *   The inactivated slide itself is set to sequence 0 (unpositioned).
   *   Example: A(1) B(2) C(3) D(4), inactivate C  ⟹  A(1) B(2) D(3) C(inactive,0)
   *
   * Going ACTIVE:
   *   The slide is appended to the end of the active sequence list.
   *   Example: C re-activated  ⟹  A(1) B(2) D(3) C(4)
   */
  static async updateSlideStatus(
    id: string,
    status: SlideStatus,
    adminId?: string,
  ): Promise<ITutorialSlide | null> {
    const slide = await TutorialSlide.findById(id);
    if (!slide) return null;

    // No-op if status is unchanged
    if (slide.status === status) return slide;

    if (status === SlideStatus.INACTIVE) {
      // ── Deactivate ────────────────────────────────────────────────────────
      const oldSeq = slide.sequence;

      slide.status = SlideStatus.INACTIVE;
      slide.sequence = 0; // Unpositioned – excluded from active ordering
      if (adminId) slide.updatedBy = new Types.ObjectId(adminId);
      await slide.save();

      // Compact: shift all slides after the freed slot down by 1
      await TutorialSlide.updateMany(
        { sequence: { $gt: oldSeq } },
        { $inc: { sequence: -1 } },
      );
      logger.info(
        `[TutorialSlide] Slide ${id} set INACTIVE (was seq ${oldSeq}); slides after seq ${oldSeq} shifted down by 1`,
      );
    } else {
      // ── Re-activate ───────────────────────────────────────────────────────
      // Find the current highest active sequence and place this slide at the end
      const lastActive = await TutorialSlide.findOne({ status: SlideStatus.ACTIVE })
        .sort({ sequence: -1 })
        .select("sequence");

      const newSeq = (lastActive?.sequence ?? 0) + 1;

      slide.status = SlideStatus.ACTIVE;
      slide.sequence = newSeq;
      if (adminId) slide.updatedBy = new Types.ObjectId(adminId);
      await slide.save();

      logger.info(
        `[TutorialSlide] Slide ${id} set ACTIVE at sequence ${newSeq}`,
      );
    }

    return slide;
  }

  /**
   * Deletes a tutorial slide by ID.
   */
  static async deleteSlide(id: string): Promise<void> {
    const slide = await TutorialSlide.findById(id);
    if (!slide) return;

    const sequenceToDelete = slide.sequence;
    await slide.deleteOne();
    logger.info(`[TutorialSlide] Deleted: id=${slide._id}`);

    // Re-sequence: shift all subsequent slides down by 1
    await TutorialSlide.updateMany(
      { sequence: { $gt: sequenceToDelete } },
      { $inc: { sequence: -1 } }
    );
    logger.info(`[TutorialSlide] Shifted slides at sequence > ${sequenceToDelete} down by 1`);
  }
}
