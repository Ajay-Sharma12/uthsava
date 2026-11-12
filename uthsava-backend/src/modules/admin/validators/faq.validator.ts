import Joi from "joi";
import { FaqStatus } from "../../../models";

/**
 * Create FAQ Validation Schema
 */
export const createFaqSchema = Joi.object({
  question: Joi.string().trim().min(5).max(500).required().messages({
    "string.empty": "validation.questionIsRequired",
    "string.min": "validation.questionMustBeAtLeast5CharactersLong",
    "string.max": "validation.questionCannotExceed500Characters",
    "any.required": "validation.questionIsRequired",
  }),
  answer: Joi.string().required().messages({
    "string.empty": "validation.answerIsRequired",
    "any.required": "validation.answerIsRequired",
  }),
  status: Joi.string()
    .valid(...Object.values(FaqStatus))
    .default(FaqStatus.ACTIVE)
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
    }),
  order: Joi.number().integer().min(0).default(0).messages({
    "number.base": "validation.orderMustBeANumber",
    "number.integer": "validation.orderMustBeAnInteger",
    "number.min": "validation.orderCannotBeNegative",
  }),
});

/**
 * Update FAQ Validation Schema
 */
export const updateFaqSchema = Joi.object({
  question: Joi.string().trim().min(5).max(500).optional().messages({
    "string.min": "validation.questionMustBeAtLeast5CharactersLong",
    "string.max": "validation.questionCannotExceed500Characters",
  }),
  answer: Joi.string().optional(),
  status: Joi.string()
    .valid(...Object.values(FaqStatus))
    .optional()
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
    }),
  order: Joi.number().integer().min(0).optional().messages({
    "number.base": "validation.orderMustBeANumber",
    "number.integer": "validation.orderMustBeAnInteger",
    "number.min": "validation.orderCannotBeNegative",
  }),
});

/**
 * Update FAQ Status Validation Schema
 */
export const updateFaqStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(FaqStatus))
    .required()
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveOrDeleted",
      "any.required": "validation.status.required",
    }),
});

export default {
  createFaqSchema,
  updateFaqSchema,
  updateFaqStatusSchema,
};
