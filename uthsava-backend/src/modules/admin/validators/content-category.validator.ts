import Joi from 'joi';
import { GenreStatus, type } from '../../../models';

export const contentCategoryIdParamSchema = Joi.object({
  categoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidCategoryIdFormat",
      "any.required": "validation.categoryIdIsRequired",
    }),
});

const typeField = Joi.string()
  .valid(...Object.values(type))
  .required()
  .messages({
    "any.only": "validation.typeMustBeCategoryOrGenre",
    "any.required": "validation.typeIsRequired",
  });

const validateImageUrl = (value: string, helpers: Joi.CustomHelpers) => {
  if (!value) return value;
  if (!/\.(jpe?g|png|webp)$/i.test(value)) {
    return helpers.error("string.imageExtension");
  }
  return value;
};

export const createContentCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "any.required": "validation.nameIsRequired",
    "string.max": "validation.nameCannotExceed50Characters",
  }),
  type: typeField,
  description: Joi.string().trim().max(500).optional().allow(""),
  displayOrder: Joi.number().integer().min(1).default(1).messages({
    "number.min": "validation.displayOrderMustBeAtLeast1",
  }),
  status: Joi.string()
    .valid(...Object.values(GenreStatus))
    .default(GenreStatus.ACTIVE),
  icon: Joi.string().trim().optional().allow("", null),
  seoTitle: Joi.string().trim().max(60).optional().allow(""),
  seoDescription: Joi.string().trim().max(160).optional().allow(""),
});

export const updateContentCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional().messages({
    "string.max": "validation.nameCannotExceed50Characters",
  }),
  description: Joi.string().trim().max(500).optional().allow(""),
  displayOrder: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.displayOrderMustBeAtLeast1",
  }),
  status: Joi.string().valid(...Object.values(GenreStatus)).optional(),
  icon: Joi.string().trim().optional().allow("", null),
  seoTitle: Joi.string().trim().max(60).optional().allow(""),
  seoDescription: Joi.string().trim().max(160).optional().allow(""),
}).min(1);

export const updateContentCategoryStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(GenreStatus))
    .required()
    .messages({
      "any.only": "validation.statusMustBeActiveOrInactive",
      "any.required": "validation.statusIsRequired",
    }),
});

export const updateDisplayOrderSchema = Joi.object({
  displayOrder: Joi.number().integer().min(1).required().messages({
    "any.required": "validation.displayOrderIsRequired",
    "number.min": "validation.displayOrderMustBeAtLeast1",
  }),
});

export const listContentCategoriesQuerySchema = Joi.object({
  type: Joi.string()
    .lowercase()
    .valid("category", "genre", "all", "categories", "genres", "")
    .required()
    .messages({
      "any.only": "Type must be category, genre, or all",
    }),
  search: Joi.string().trim().allow("").max(100).optional(),
  status: Joi.string().valid("active", "inactive", "all", "").optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  sortBy: Joi.string().default("displayOrder"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
