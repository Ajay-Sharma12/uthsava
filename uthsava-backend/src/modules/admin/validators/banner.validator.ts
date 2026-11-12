import Joi from 'joi';
import { BannerStatus } from '../../../models';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Create Banner Validation Schema
 */
export const createBannerSchema = Joi.object({
  contentId: Joi.string()
    .trim()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.empty': 'validation.contentIdIsRequired',
      'string.pattern.base': 'validation.invalidContentId',
      'any.required': 'validation.contentIdIsRequired',
    }),
  customTitle: Joi.string().trim().max(200).optional().allow('', null),
  customBannerImage: Joi.string().trim().max(1000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional().default(0),
  status: Joi.string()
    .valid(...Object.values(BannerStatus))
    .default(BannerStatus.ACTIVE)
    .messages({
      'any.only': 'validation.statusMustBeActiveOrInactive',
    }),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
});

/**
 * Update Banner Validation Schema
 */
export const updateBannerSchema = Joi.object({
  contentId: Joi.string()
    .trim()
    .regex(objectIdPattern)
    .optional()
    .messages({
      'string.pattern.base': 'validation.invalidContentId',
    }),
  customTitle: Joi.string().trim().max(200).optional().allow('', null),
  customBannerImage: Joi.string().trim().max(1000).optional().allow('', null),
  displayOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string()
    .valid(...Object.values(BannerStatus))
    .optional()
    .messages({
      'any.only': 'validation.statusMustBeActiveOrInactive',
    }),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
});

/**
 * Update Banner Status Schema
 */
export const updateBannerStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BannerStatus))
    .required()
    .messages({
      'any.only': 'validation.statusMustBeActiveOrInactive',
      'any.required': 'validation.statusIsRequired',
    }),
});

/**
 * Reorder Banners Schema
 */
export const reorderBannersSchema = Joi.object({
  banners: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().regex(objectIdPattern).required(),
        displayOrder: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'validation.bannersArrayMustNotBeEmpty',
      'any.required': 'validation.bannersIsRequired',
    }),
});

export default {
  createBannerSchema,
  updateBannerSchema,
  updateBannerStatusSchema,
  reorderBannersSchema,
};
