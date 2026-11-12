import Joi from "joi";
import { AvatarStatus } from "../../../models/avatar.model";

/**
 * Validation schema for creating a standalone Avatar Category.
 */
export const createAvatarCategorySchema = Joi.object({
  category: Joi.string().trim().min(1).max(100).optional(),
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(""),
  isKids: Joi.boolean().optional().default(false),
  status: Joi.string()
    .valid(...Object.values(AvatarStatus))
    .optional()
    .default(AvatarStatus.ACTIVE),
}).or("category", "name").messages({
  "object.missing": "validation.categoryNameIsRequired",
});

/**
 * Validation schema for creating an Avatar category entry with multiple images.
 */
export const createAvatarSchema = Joi.object({
  category: Joi.string().trim().min(1).max(100).required().messages({
    "any.required": "Category is required",
    "string.empty": "Category name cannot be empty",
  }),
  description: Joi.string().trim().max(500).optional().allow(""),
  isKids: Joi.boolean().optional().default(false),
  status: Joi.string()
    .valid(...Object.values(AvatarStatus))
    .optional()
    .default(AvatarStatus.ACTIVE),

  // Supports multiple images array (S3 keys or full URLs)
  images: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().trim(),
        Joi.object({
          image: Joi.string().trim().optional().allow(""),
          url: Joi.string().trim().optional().allow(""),
        })
      )
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      "any.required": "At least one image is required for the avatar category",
      "array.min": "Please provide at least one avatar image",
      "array.max": "Cannot upload more than 10 avatar images per category",
    }),

  // Optional single image fallback or legacy alias
  image: Joi.string().trim().optional().allow(""),
  avatars: Joi.array().optional(),
});

/**
 * Validation schema for updating an Avatar category entry.
 */
export const updateAvatarSchema = Joi.object({
  category: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(""),
  isKids: Joi.boolean().optional(),
  status: Joi.string()
    .valid(...Object.values(AvatarStatus))
    .optional(),
  images: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().trim(),
        Joi.object({
          image: Joi.string().trim().optional().allow(""),
          url: Joi.string().trim().optional().allow(""),
        })
      )
    )
    .max(10)
    .optional()
    .messages({
      "array.max": "Cannot upload more than 10 avatar images per category",
    }),
  image: Joi.string().trim().optional().allow(""),
});

/**
 * Query schema for public Mobile / TV GET /api/v1/avatars listing.
 */
export const getAvatarsQuerySchema = Joi.object({
  isKids: Joi.boolean().optional(),
  iskids: Joi.boolean().optional(),
  kids: Joi.boolean().optional(),
  category: Joi.string().trim().optional().allow(""),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

/**
 * Query schema for Admin GET /api/v1/admin/avatars listing.
 */
export const adminListAvatarsQuerySchema = Joi.object({
  search: Joi.string().trim().optional().allow(""),
  isKids: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional().allow(""),
  status: Joi.string().optional().allow(""),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  sortBy: Joi.string().optional().default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc", "ASC", "DESC").optional().default("desc"),
  fromDate: Joi.string().optional().allow(""),
  toDate: Joi.string().optional().allow(""),
});

/**
 * Validation schema for toggling avatar status.
 */
export const avatarStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(AvatarStatus))
    .required()
    .messages({
      "any.required": "Status is required",
      "any.only": "Status must be either active or inactive",
    }),
});

/**
 * ID parameter validation schema.
 */
export const avatarIdParamSchema = Joi.object({
  avatarId: Joi.string().hex().length(24).required().messages({
    "string.length": "Invalid Avatar ID format",
  }),
});

/**
 * Validation schema for sub-profile creation.
 */
export const createSubProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(40).required().messages({
    "any.required": "validation.nameIsRequired",
    "string.empty": "validation.nameCannotBeEmpty",
    "string.min": "validation.nameMustBeAtLeast2CharactersLong",
    "string.max": "validation.nameCannotExceed40Characters",
  }),

  displayName: Joi.string().trim().min(2).max(40).optional(),
  isKids: Joi.boolean().optional().default(false),
  kids: Joi.boolean().optional(),
  avatar: Joi.string().trim().optional().allow(null, ""),
  avatarId: Joi.string().trim().optional().allow(null, ""),
  profilePicture: Joi.string().trim().optional().allow(null, ""),
});
