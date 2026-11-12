import Joi from "joi";

/**
 * Notification Validators
 */

export const markNotificationAsReadSchema = Joi.object({
  id: Joi.string().required(),
}).unknown(true);

export const notificationIdParamSchema = Joi.object({
  id: Joi.string().required(),
}).unknown(true);

export const paginationQuerySchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  sort: Joi.string().optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
  search: Joi.string().optional(),
})
  .unknown(true)
  .prefs({ stripUnknown: true });
