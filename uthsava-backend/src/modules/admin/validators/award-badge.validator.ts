import Joi from "joi";
import { AwardBadgeStatus, AwardBadgeType } from "../../../models/award-badge.model";

// Reusable MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// ─── Param schemas ────────────────────────────────────────────────────────────

/**
 * Validates the :awardBadgeId route parameter.
 */
export const awardBadgeIdParamSchema = Joi.object({
  awardBadgeId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "validation.invalidAwardbadgeIdFormat",
    "any.required": "validation.awardbadgeIdIsRequired",
  }),
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

/**
 * Validates the POST /award-badges body.
 *
 * Business rules enforced here:
 *  - type is mandatory (award | badge)
 *  - name is mandatory, 2-200 chars
 *  - contentIds is optional; each entry must be a valid ObjectId
 *    (one award/badge can be assigned to multiple movies/series)
 *  - status defaults to "active" if omitted
 */
export const createAwardBadgeSchema = Joi.object({
  type: Joi.string()
    .valid(AwardBadgeType.AWARD, AwardBadgeType.BADGE)
    .required()
    .messages({
      "any.only": "validation.typeMustBeEitherAwardOrBadge",
      "any.required": "validation.typeIsRequired",
    }),

  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "validation.nameIsRequired",
    "string.min": "validation.nameMustBeAtLeast2Characters",
    "string.max": "validation.nameMustNotExceed200Characters",
    "any.required": "validation.nameIsRequired",
  }),

  /**
   * Optional list of Content IDs to assign on creation.
   * Supports assigning to multiple movies/series at once.
   */
  contentIds: Joi.array()
    .items(
      Joi.string().pattern(objectIdPattern).messages({
        "string.pattern.base": "validation.eachContentIdMustBeAValidMongodbObjectid",
      }),
    )
    .optional()
    .default([])
    .messages({
      "array.base": "validation.contentidsMustBeAnArrayOfContentIds",
    }),

  status: Joi.string()
    .valid(AwardBadgeStatus.ACTIVE, AwardBadgeStatus.INACTIVE)
    .optional()
    .default(AwardBadgeStatus.ACTIVE)
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
});

/**
 * Validates the PUT /award-badges/:awardBadgeId body.
 * All fields are optional — the service applies only the provided fields.
 */
export const updateAwardBadgeSchema = Joi.object({
  type: Joi.string()
    .valid(AwardBadgeType.AWARD, AwardBadgeType.BADGE)
    .optional()
    .messages({
      "any.only": "validation.typeMustBeEitherAwardOrBadge",
    }),

  name: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "validation.nameMustBeAtLeast2Characters",
    "string.max": "validation.nameMustNotExceed200Characters",
  }),

  /**
   * Full replacement of the contentIds array.
   * Send an empty array [] to un-assign all content.
   */
  contentIds: Joi.array()
    .items(
      Joi.string().pattern(objectIdPattern).messages({
        "string.pattern.base": "validation.eachContentIdMustBeAValidMongodbObjectid",
      }),
    )
    .optional()
    .messages({
      "array.base": "validation.contentidsMustBeAnArrayOfContentIds",
    }),

  status: Joi.string()
    .valid(AwardBadgeStatus.ACTIVE, AwardBadgeStatus.INACTIVE)
    .optional()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
});

/**
 * Validates the PATCH /award-badges/:awardBadgeId/status body.
 * Only the status toggle is accepted.
 */
export const awardBadgeStatusSchema = Joi.object({
  status: Joi.string()
    .valid(AwardBadgeStatus.ACTIVE, AwardBadgeStatus.INACTIVE)
    .required()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
      "any.required": "validation.statusIsRequired",
    }),
});

// ─── Query schema ─────────────────────────────────────────────────────────────

/**
 * Validates query parameters for GET /award-badges (listing).
 *
 * Supports:
 *  - search   : partial name match
 *  - type     : filter by award | badge
 *  - status   : filter by active | inactive
 *  - fromDate / toDate : creation date range
 *  - sortBy / sortOrder / page / limit : standard pagination controls
 */
export const listAwardBadgesQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),

  type: Joi.string()
    .valid(AwardBadgeType.AWARD, AwardBadgeType.BADGE, "")
    .optional(),

  status: Joi.string()
    .valid(AwardBadgeStatus.ACTIVE, AwardBadgeStatus.INACTIVE, "")
    .optional(),

  fromDate: Joi.date()
    .optional()
    .messages({ "date.base": "validation.fromdateMustBeAValidDate" }),

  toDate: Joi.date()
    .optional()
    .messages({ "date.base": "validation.todateMustBeAValidDate" }),

  assignedTo: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({ "string.pattern.base": "validation.assignedtoMustBeAValidMongodbObjectid" }),

  sortBy: Joi.string()
    .valid("name", "type", "status", "createdAt", "updatedAt")
    .default("createdAt"),

  sortOrder: Joi.string().valid("asc", "desc").default("desc"),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),
});
