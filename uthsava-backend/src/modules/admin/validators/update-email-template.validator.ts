import Joi from "joi";

/**
 * Update Email Template Schema
 * Allows admins to edit visible template fields while protecting immutable keywords.
 */
export const updateEmailTemplateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(150).optional().messages({
    "string.empty": "validation.templateTitleCannotBeEmpty",
    "string.min": "validation.templateTitleMustBeAtLeast2Characters",
    "string.max": "validation.templateTitleCannotExceed150Characters",
  }),
  subject: Joi.string().trim().min(5).optional().messages({
    "string.empty": "validation.subjectCannotBeEmpty",
    "string.min": "validation.subjectMustBeAtLeast5Characters",
  }),
  description: Joi.string().trim().min(10).optional().messages({
    "string.empty": "validation.descriptionContentCannotBeEmpty",
    "string.min": "validation.descriptionMustBeAtLeast10Characters",
  }),
  signature: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid("active", "inactive").optional().messages({
    "any.only": "validation.statusMustBeEitherActiveOrInactive",
  }),
  keywordList: Joi.array().items(Joi.any()).optional(),
  keyword: Joi.any().forbidden().messages({
    "any.unknown": "validation.keywordCannotBeUpdated",
  }),
});
