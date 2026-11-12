import Joi from "joi";
import { ALLOWED_SUBADMIN_PERMISSION_MODULES } from "../helpers/subadmin-permissions.helper";
const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const noWhitespaceRegex = /^\S+$/;

/**
 * Subadmin Validator - Manages validation schemas for Subadmin operations
 * SonarQube compliant: Enforces strict input validation
 */

/**
 * Subadmin ID Param Schema
 */
export const subAdminIdParamSchema = Joi.object({
  subAdminId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidSubadminIdFormat",
      "any.required": "validation.subadminIdIsRequired",
    }),
});

/**
 * Permission schema for a single module.
 *
 * `all: true`  → full manager access (view + create + edit + delete all implied)
 * Individual flags can be set independently for granular task-level access.
 */
const modulePermissionSchema = Joi.object({
  _id: Joi.any().strip(),
  id: Joi.any().strip(),
  view: Joi.boolean().default(false),
  create: Joi.boolean().default(false),
  edit: Joi.boolean().default(false),
  delete: Joi.boolean().default(false),
  all: Joi.boolean().default(false),
}).unknown(true);

const permissionsSchema = Joi.object()
  .pattern(
    Joi.string(),
    modulePermissionSchema,
  )
  .unknown(true);

/**
 * Create Subadmin Schema
 *
 * Note: `password` is intentionally stripped — it is always auto-generated
 * server-side and returned in the response for the admin to share.
 */
export const createSubAdminSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .required()
    .messages({
      "string.pattern.base":
        "validation.firstNameMustContainAlphabeticCharactersOnly",
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .required()
    .messages({
      "string.pattern.base":
        "validation.lastNameMustContainAlphabeticCharactersOnly",
    }),
  email: Joi.string()
    .trim()
    .pattern(noWhitespaceRegex)
    .email()
    .lowercase()
    .required()
    .messages({
      "string.pattern.base": "validation.emailMustNotContainSpaces",
    }),
  // Password is always auto-generated — strip any value sent by the client
  password: Joi.any().strip(),
  mobile: Joi.string()
    .trim()
    .pattern(/^\d{8,12}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.mobileNumberMustContainNumericDigitsOnlyAndBe812DigitsLong",
    }),
  countryCode: Joi.number().optional(),
  address: Joi.string().trim().max(200).allow("").optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  roleId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  customPermissions: permissionsSchema.optional(),
});

/**
 * Update Subadmin Schema
 */
export const updateSubAdminSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.firstNameMustContainAlphabeticCharactersOnly",
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.lastNameMustContainAlphabeticCharactersOnly",
    }),
  email: Joi.string()
    .trim()
    .pattern(noWhitespaceRegex)
    .email()
    .lowercase()
    .optional()
    .messages({
      "string.pattern.base": "validation.emailMustNotContainSpaces",
    }),
  mobile: Joi.string()
    .trim()
    .pattern(/^\d{8,12}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "validation.mobileNumberMustContainNumericDigitsOnlyAndBe812DigitsLong",
    }),
  countryCode: Joi.number().optional(),
  address: Joi.string().trim().max(200).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  roleId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  customPermissions: permissionsSchema.optional(),
});

export const updateSubAdminStatusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive").required(),
});

/**
 * List Subadmins Filters Schema
 */
export const listSubAdminsFiltersSchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),
  status: Joi.string().valid("active", "inactive", "all", "").optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  sortBy: Joi.string()
    .valid(
      "email",
      "fullName",
      "firstName",
      "lastName",
      "mobile",
      "status",
      "createdAt",
      "updatedAt",
    )
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

/**
 * List SubAdmin Activities Pagination Schema
 */
export const listSubAdminActivitiesSchema = Joi.object({
  sortBy: Joi.string()
    .valid("module", "action", "method", "statusCode", "createdAt", "updatedAt")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
