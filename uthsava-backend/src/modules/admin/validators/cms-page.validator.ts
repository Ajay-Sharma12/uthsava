import Joi from "joi";
import { PageStatus, PublicationStatus } from "../../../models";

/**
 * Create CMS Page Validation Schema
 */
export const createCmsPageSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "validation.titleIsRequired",
    "string.min": "validation.titleMustBeAtLeast2CharactersLong",
    "string.max": "validation.titleCannotExceed200Characters",
    "any.required": "validation.titleIsRequired",
  }),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.slugMustContainOnlyLowercaseLettersNumbersAndHyphens",
    }),
  content: Joi.string().required().messages({
    "string.empty": "validation.contentIsRequired",
    "any.required": "validation.contentIsRequired",
  }),
  metaTitle: Joi.string().trim().max(200).optional().allow(""),
  metaDescription: Joi.string().trim().max(500).optional().allow(""),
  bannerImage: Joi.string().trim().max(1000).optional().allow(""),
  companyWebsiteUrl: Joi.string().trim().max(1000).optional().allow(""),
  seoTitle: Joi.string().trim().max(200).optional().allow(""),
  seoDescription: Joi.string().trim().max(1000).optional().allow(""),
  publicationStatus: Joi.string()
    .valid(...Object.values(PublicationStatus))
    .default(PublicationStatus.DRAFT)
    .messages({
      "any.only": "validation.publicationStatusMustBeDraftOrPublished",
    }),
  status: Joi.string()
    .valid(...Object.values(PageStatus))
    .default(PageStatus.ACTIVE)
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
    }),
});

/**
 * Update CMS Page Validation Schema
 */
export const updateCmsPageSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "validation.titleMustBeAtLeast2CharactersLong",
    "string.max": "validation.titleCannotExceed200Characters",
  }),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.slugMustContainOnlyLowercaseLettersNumbersAndHyphens",
    }),
  content: Joi.string().optional(),
  metaTitle: Joi.string().trim().max(200).optional().allow(""),
  metaDescription: Joi.string().trim().max(500).optional().allow(""),
  bannerImage: Joi.string().trim().max(1000).optional().allow(""),
  companyWebsiteUrl: Joi.string().trim().max(1000).optional().allow(""),
  seoTitle: Joi.string().trim().max(200).optional().allow(""),
  seoDescription: Joi.string().trim().max(1000).optional().allow(""),
  publicationStatus: Joi.string()
    .valid(...Object.values(PublicationStatus))
    .optional()
    .messages({
      "any.only": "validation.publicationStatusMustBeDraftOrPublished",
    }),
  status: Joi.string()
    .valid(...Object.values(PageStatus))
    .optional()
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
    }),
});

/**
 * Update CMS Page Status Validation Schema
 */
export const updateCmsPageStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PageStatus))
    .required()
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
      "any.required": "validation.status.required",
    }),
});

/**
 * Update CMS Page Publication Status Validation Schema
 */
export const updateCmsPagePublicationStatusSchema = Joi.object({
  publicationStatus: Joi.string()
    .valid(...Object.values(PublicationStatus))
    .required()
    .messages({
      "any.only": "validation.publicationStatusMustBeDraftOrPublished",
      "any.required": "validation.publicationStatus.required",
    }),
});

export default {
  createCmsPageSchema,
  updateCmsPageSchema,
  updateCmsPageStatusSchema,
  updateCmsPagePublicationStatusSchema,
};
