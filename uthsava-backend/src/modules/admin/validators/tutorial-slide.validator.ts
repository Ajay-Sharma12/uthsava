import Joi from "joi";
import { SlideMediaType, SlideStatus } from "../../../models/tutorial-slide.model";

// ─── Reusable patterns ────────────────────────────────────────────────────────

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// ─── Param schemas ────────────────────────────────────────────────────────────

/**
 * Validates the :slideId route parameter.
 */
export const tutorialSlideIdParamSchema = Joi.object({
  slideId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "validation.invalidSlideIdFormat",
    "any.required": "validation.slideIdIsRequired",
  }),
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

/**
 * Validates POST /tutorial-slides (Create).
 *
 * Business rules enforced:
 *  - title, description, mediaType, sequence are all required.
 *  - When mediaType === "image", the image field is required.
 *  - When mediaType === "video", the video field is required.
 *    An image may still be supplied as a poster/thumbnail.
 *  - sequence must be a positive integer (≥ 1).
 *  - status defaults to "active".
 */
export const createTutorialSlideSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "validation.slideTitleIsRequired",
    "string.min": "validation.slideTitleMustBeAtLeast2Characters",
    "string.max": "validation.slideTitleMustNotExceed200Characters",
    "any.required": "validation.slideTitleIsRequired",
  }),

  description: Joi.string().trim().min(2).max(2000).required().messages({
    "string.empty": "validation.slideDescriptionIsRequired",
    "string.min": "validation.slideDescriptionMustBeAtLeast2Characters",
    "string.max": "validation.slideDescriptionMustNotExceed2000Characters",
    "any.required": "validation.slideDescriptionIsRequired",
  }),

  mediaType: Joi.string()
    .valid(SlideMediaType.IMAGE, SlideMediaType.VIDEO)
    .required()
    .messages({
      "any.only": "validation.mediaTypeMustBeEitherImageOrVideo",
      "any.required": "validation.mediaTypeIsRequired",
    }),

  /**
   * S3 key or full URL for the slide image.
   * Required when mediaType === "image".
   */
  image: Joi.when("mediaType", {
    is: SlideMediaType.IMAGE,
    then: Joi.string().trim().required().messages({
      "string.empty": "validation.slideImageIsRequiredWhenMediaTypeIsImage",
      "any.required": "validation.slideImageIsRequiredWhenMediaTypeIsImage",
    }),
    otherwise: Joi.string().trim().optional().allow(null, ""),
  }),

  /**
   * S3 key or full URL for the slide video.
   * Required when mediaType === "video".
   */
  video: Joi.when("mediaType", {
    is: SlideMediaType.VIDEO,
    then: Joi.string().trim().required().messages({
      "string.empty": "validation.slideVideoIsRequiredWhenMediaTypeIsVideo",
      "any.required": "validation.slideVideoIsRequiredWhenMediaTypeIsVideo",
    }),
    otherwise: Joi.string().trim().optional().allow(null, ""),
  }),

  sequence: Joi.number().integer().min(1).required().messages({
    "number.base": "validation.sequenceMustBeANumber",
    "number.integer": "validation.sequenceMustBeAnInteger",
    "number.min": "validation.sequenceMustBeAtLeast1",
    "any.required": "validation.sequenceIsRequired",
  }),

  status: Joi.string()
    .valid(SlideStatus.ACTIVE, SlideStatus.INACTIVE)
    .optional()
    .default(SlideStatus.ACTIVE)
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
});

/**
 * Validates PUT /tutorial-slides/:slideId (Full update).
 * All fields are optional – the service applies only the provided ones.
 *
 * The same mediaType-dependent conditional validation applies:
 * once you supply a mediaType in the update body the matching media field
 * becomes required as well.
 */
export const updateTutorialSlideSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "validation.slideTitleMustBeAtLeast2Characters",
    "string.max": "validation.slideTitleMustNotExceed200Characters",
  }),

  description: Joi.string().trim().min(2).max(2000).optional().messages({
    "string.min": "validation.slideDescriptionMustBeAtLeast2Characters",
    "string.max": "validation.slideDescriptionMustNotExceed2000Characters",
  }),

  mediaType: Joi.string()
    .valid(SlideMediaType.IMAGE, SlideMediaType.VIDEO)
    .optional()
    .messages({
      "any.only": "validation.mediaTypeMustBeEitherImageOrVideo",
    }),

  image: Joi.when("mediaType", {
    is: SlideMediaType.IMAGE,
    then: Joi.string().trim().required().messages({
      "string.empty": "validation.slideImageIsRequiredWhenMediaTypeIsImage",
      "any.required": "validation.slideImageIsRequiredWhenMediaTypeIsImage",
    }),
    otherwise: Joi.string().trim().optional().allow(null, ""),
  }),

  video: Joi.when("mediaType", {
    is: SlideMediaType.VIDEO,
    then: Joi.string().trim().required().messages({
      "string.empty": "validation.slideVideoIsRequiredWhenMediaTypeIsVideo",
      "any.required": "validation.slideVideoIsRequiredWhenMediaTypeIsVideo",
    }),
    otherwise: Joi.string().trim().optional().allow(null, ""),
  }),

  sequence: Joi.number().integer().min(1).optional().messages({
    "number.base": "validation.sequenceMustBeANumber",
    "number.integer": "validation.sequenceMustBeAnInteger",
    "number.min": "validation.sequenceMustBeAtLeast1",
  }),

  status: Joi.string()
    .valid(SlideStatus.ACTIVE, SlideStatus.INACTIVE)
    .optional()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
});

/**
 * Validates PATCH /tutorial-slides/:slideId/status.
 * Only the status field is accepted – maps to the listing-table toggle.
 */
export const tutorialSlideStatusSchema = Joi.object({
  status: Joi.string()
    .valid(SlideStatus.ACTIVE, SlideStatus.INACTIVE)
    .required()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
      "any.required": "validation.statusIsRequired",
    }),
});

// ─── Query schema ─────────────────────────────────────────────────────────────

/**
 * Validates GET /tutorial-slides query parameters (Admin listing).
 *
 * Supports:
 *  - search    : partial title / description match
 *  - mediaType : filter by image | video
 *  - status    : filter by active | inactive
 *  - fromDate / toDate : creation date range
 *  - sortBy / sortOrder / page / limit : standard pagination controls
 */
export const listTutorialSlidesQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),

  mediaType: Joi.string()
    .valid(SlideMediaType.IMAGE, SlideMediaType.VIDEO, "all", "")
    .optional(),

  status: Joi.string()
    .valid(SlideStatus.ACTIVE, SlideStatus.INACTIVE, "all", "")
    .optional(),

  fromDate: Joi.date().optional().messages({
    "date.base": "validation.fromdateMustBeAValidDate",
  }),

  toDate: Joi.date().optional().messages({
    "date.base": "validation.todateMustBeAValidDate",
  }),

  sortBy: Joi.string()
    .valid("title", "sequence", "mediaType", "status", "createdAt", "updatedAt")
    .default("sequence"),

  sortOrder: Joi.string().valid("asc", "desc").default("asc"),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
