import Joi from "joi";

/**
 * Email Template ID Validation Schema (for route parameters)
 */
export const emailTemplateIdParamSchema = Joi.object({
  templateId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidEmailTemplateIdFormat",
      "any.required": "validation.emailTemplateIdIsRequired",
    }),
});

/**
 * Email Template Status Validation Schema
 */
export const emailTemplateStatusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive").required().messages({
    "any.only": "validation.statusMustBeEitherActiveOrInactive",
    "any.required": "validation.statusIsRequired",
  }),
});

/**
 * Email Template Create Schema
 * Validates required fields for creating new email templates
 */
export const createEmailTemplateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .required()
    .messages({
      "string.empty": "validation.templateTitleCannotBeEmpty",
      "string.min": "validation.templateTitleMustBeAtLeast2Characters",
      "string.max": "validation.templateTitleCannotExceed150Characters",
      "any.required": "validation.templateTitleIsRequired",
    }),
  subject: Joi.string()
    .trim()
    .min(5)
    .required()
    .messages({
      "string.empty": "validation.subjectCannotBeEmpty",
      "string.min": "validation.subjectMustBeAtLeast5Characters",
      "any.required": "validation.subjectIsRequired",
    }),
  description: Joi.string()
    .trim()
    .min(10)
    .required()
    .messages({
      "string.empty": "validation.descriptionContentCannotBeEmpty",
      "string.min": "validation.descriptionMustBeAtLeast10Characters",
      "any.required": "validation.descriptionIsRequired",
    }),
  signature: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid("active", "inactive")
    .default("active")
    .optional()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
  keywordList: Joi.array().items(Joi.any()).optional(),
});

/**
 * Email Template List Filters Validation Schema
 */
export const emailTemplateListFiltersSchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional().messages({
    "string.max": "validation.searchTermCannotExceed100Characters",
  }),
  status: Joi.string().valid("active", "inactive").optional().messages({
    "any.only": "validation.statusMustBeEitherActiveOrInactive",
  }),
  fromDate: Joi.date().optional().messages({
    "date.base": "validation.fromDateMustBeAValidDate",
  }),
  toDate: Joi.date().optional().messages({
    "date.base": "validation.toDateMustBeAValidDate",
  }),
  sortBy: Joi.string()
    .valid("title", "subject", "status", "createdAt", "updatedAt")
    .default("updatedAt")
    .optional()
    .messages({
      "any.only":
        "validation.sortFieldMustBeOneOfTitleSubjectStatusCreatedatUpdatedat",
    }),
  sortOrder: Joi.string()
    .valid("asc", "desc")
    .default("desc")
    .optional()
    .messages({
      "any.only": "validation.sortOrderMustBeEitherAscOrDesc",
    }),
  page: Joi.number().integer().min(1).default(1).optional().messages({
    "number.base": "validation.pageMustBeANumber",
    "number.integer": "validation.pageMustBeAnInteger",
    "number.min": "validation.pageMustBeAtLeast1",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .messages({
      "number.base": "validation.limitMustBeANumber",
      "number.integer": "validation.limitMustBeAnInteger",
      "number.min": "validation.limitMustBeAtLeast1",
      "number.max": "validation.limitCannotExceed100",
    }),
});
