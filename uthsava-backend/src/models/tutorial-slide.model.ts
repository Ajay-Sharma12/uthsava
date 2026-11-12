import { Schema, model, Document, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * SlideMediaType – the kind of visual asset attached to a tutorial slide.
 * The admin can choose between a static image or a walkthrough video.
 */
export enum SlideMediaType {
  IMAGE = "image",
  VIDEO = "video",
}

/**
 * SlideStatus – controls whether the slide is shown to app users during
 * the onboarding flow.  Only ACTIVE slides are returned to the mobile/web app.
 */
export enum SlideStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// ─── Document interface ───────────────────────────────────────────────────────

export interface ITutorialSlide extends Document {
  /** Heading displayed at the top of the onboarding screen */
  title: string;

  /** Explanatory text / instructions shown below the title */
  description: string;

  /** Determines which media field is used: image or video */
  mediaType: SlideMediaType;

  /**
   * S3/CloudFront key (or full URL) of the slide image.
   * Required when mediaType === "image"; may also be used as a
   * thumbnail/poster when mediaType === "video".
   */
  image?: string;

  /**
   * S3/CloudFront key (or full URL) of the slide video.
   * Required when mediaType === "video".
   */
  video?: string;

  /**
   * Zero-based or 1-based display order used to sort slides on the app side.
   * Admin can rearrange slides by updating this field.
   * Unique constraint prevents two slides from occupying the same position.
   */
  sequence: number;

  /** Toggle managed by the admin – inactive slides are hidden from app users */
  status: SlideStatus;

  /** Admin user who created this slide */
  createdBy?: Types.ObjectId;

  /** Admin user who last modified this slide */
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;

}

// ─── Schema ───────────────────────────────────────────────────────────────────

const tutorialSlideSchema = new Schema<ITutorialSlide>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    mediaType: {
      type: String,
      enum: Object.values(SlideMediaType),
      required: true,
      index: true,
    },

    /**
     * Stores either an S3 key or a full CloudFront URL.
     * The frontend resolves a preview by prefixing the CloudFront base URL
     * when only a key is stored.
     */
    image: {
      type: String,
      default: null,
    },

    video: {
      type: String,
      default: null,
    },

    /**
     * Unique per-slide ordering position.
     * The service shifts conflicting sequences automatically when a new slide
     * is inserted or an existing one is repositioned (same pattern as Faq.order).
     */
    sequence: {
      type: Number,
      required: true,
      min: 0, // 0 = unpositioned (used when a slide is set to inactive)
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SlideStatus),
      default: SlideStatus.ACTIVE,
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

/** The app always fetches active slides in sequence order */
tutorialSlideSchema.index({ status: 1, sequence: 1 });

/** Admin listing is sorted by createdAt by default */
tutorialSlideSchema.index({ createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

import { config } from "../core/config";

const resolveUrl = (key?: string | null) => {
  if (!key || key.trim() === "") return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const baseUrl = config.aws?.cloudFrontUrl || "";
  return baseUrl ? `${baseUrl}/${key.replace(/^\/+/, "")}` : key;
};

tutorialSlideSchema.set("toObject", {
  transform: (_doc, ret: Record<string, any>) => {
    if (ret.image) ret.image = resolveUrl(ret.image);
    if (ret.video) ret.video = resolveUrl(ret.video);
    return ret;
  },
});

tutorialSlideSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, any>) => {
    if (ret.image) ret.image = resolveUrl(ret.image);
    if (ret.video) ret.video = resolveUrl(ret.video);
    return ret;
  },
});

export const TutorialSlide = model<ITutorialSlide>(
  "TutorialSlide",
  tutorialSlideSchema,
);
