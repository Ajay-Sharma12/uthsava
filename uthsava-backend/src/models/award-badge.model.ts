import { Schema, model, Document, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * AwardBadgeType – distinguishes between a ceremonial award and a gamification badge.
 */
export enum AwardBadgeType {
  AWARD = "award",
  BADGE = "badge",
}

/**
 * AwardBadgeStatus – controls visibility in the public-facing app.
 */
export enum AwardBadgeStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// ─── Document interface ───────────────────────────────────────────────────────

export interface IAwardBadge extends Document {
  /** Discriminates between an award and a badge */
  type: AwardBadgeType;

  /** Display name shown in the admin listing and on the frontend */
  name: string;

  /**
   * Content IDs (movies / series) this award or badge is assigned to.
   * A single award/badge can be assigned to multiple pieces of content,
   * and a single piece of content can hold multiple awards/badges.
   */
  contentIds: Types.ObjectId[];

  /** Activation toggle managed by the admin */
  status: AwardBadgeStatus;

  /** Admin user who created this record */
  createdBy?: Types.ObjectId;

  /** Admin user who last modified this record */
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const awardBadgeSchema = new Schema<IAwardBadge>(
  {
    type: {
      type: String,
      enum: Object.values(AwardBadgeType),
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },

    /**
     * Array of Content document references.
     * Empty array means the award/badge is not yet assigned to any content.
     */
    contentIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Content" }],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(AwardBadgeStatus),
      default: AwardBadgeStatus.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/** Speed up listing queries filtered by type + status */
awardBadgeSchema.index({ type: 1, status: 1 });

/** Speed up date-range filters used in the admin listing */
awardBadgeSchema.index({ createdAt: -1 });

/** Speed up reverse-lookup: "which awards/badges does content X have?" */
awardBadgeSchema.index({ contentIds: 1 });

// ─── Model export ─────────────────────────────────────────────────────────────

export const AwardBadge = model<IAwardBadge>("AwardBadge", awardBadgeSchema);
