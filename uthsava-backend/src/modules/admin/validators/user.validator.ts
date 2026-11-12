import Joi from 'joi';
import { UserStatus, Gender, SubscriptionStatus } from '../../../models';

export const listUserQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid(...Object.values(UserStatus), 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED').optional(),
  accountStatus: Joi.string().valid(...Object.values(UserStatus), 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED').optional(),
  subscriptionStatus: Joi.string().valid(...Object.values(SubscriptionStatus), 'none', 'inactive', 'Inactive', 'active', 'Active', 'expired', 'Expired', 'cancelled', 'Cancelled').optional(),
  subscriptionPlan: Joi.string().optional(),
  startDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow('', null),
  endDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow('', null),
  sortBy: Joi.string()
    .valid(
      "userId",
      "email",
      "fullName",
      "mobile",
      "status",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
      "subscriptionStatus",
      "name",
      "date",
      "created",
      "updated",
      "id",
      "registrationDate",
      "lastLoginDate",
    )
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

/**
 * Create User Validation Schema
 */
export const createUserSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "validation.fullName.required",
    "string.min": "validation.fullNameMustBeAtLeast2CharactersLong",
    "string.max": "validation.fullNameCannotExceed100Characters",
    "any.required": "validation.fullName.required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "validation.email.invalid",
    "any.required": "validation.email.required",
  }),
  countryCode: Joi.number().integer().min(1).max(999).optional().default(91).messages({
    "number.base": "validation.countryCodeMustBeANumber",
    "number.integer": "validation.countryCodeMustBeAnInteger",
    "number.min": "validation.countryCodeMustBeAtLeast1",
    "number.max": "validation.countryCodeCannotExceed999",
  }),
  mobile: Joi.string()
    .pattern(/^\d{7,15}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.mobileNumberMustBe715Digits",
      "any.required": "validation.mobileNumber.required",
    }),
  gender: Joi.string()
    .valid(...Object.values(Gender), "Male", "Female", "Other", "male", "female", "other")
    .optional()
    .default(Gender.MALE)
    .messages({
      "any.only": "validation.genderMustBeMaleFemaleOrOther",
    }),
  status: Joi.string()
    .valid(...Object.values(UserStatus), "active", "inactive", "suspended", "deleted")
    .default(UserStatus.ACTIVE)
    .optional(),
  profileImage: Joi.string().optional().allow("", null),
  country: Joi.string().optional().allow("", null),
  state: Joi.string().optional().allow("", null),
  city: Joi.string().optional().allow("", null),
  dateOfBirth: Joi.string().optional().allow("", null),
  dob: Joi.string().optional().allow("", null),
  password: Joi.string().optional().allow("", null),
});

/**
 * Update User Validation Schema
 */
export const updateUserSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional().messages({
    "string.min": "validation.fullNameMustBeAtLeast2CharactersLong",
    "string.max": "validation.fullNameCannotExceed100Characters",
  }),
  email: Joi.string().email().optional().messages({
    "string.email": "validation.pleaseProvideAValidEmailAddress",
  }),
  countryCode: Joi.number().integer().min(1).max(999).optional().messages({
    "number.base": "validation.countryCodeMustBeANumber",
    "number.integer": "validation.countryCodeMustBeAnInteger",
    "number.min": "validation.countryCodeMustBeAtLeast1",
    "number.max": "validation.countryCodeCannotExceed999",
  }),
  mobile: Joi.string()
    .pattern(/^\d{7,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "validation.mobileNumberMustBe715Digits",
    }),
  gender: Joi.string()
    .valid(...Object.values(Gender), "Male", "Female", "Other", "male", "female", "other")
    .optional()
    .messages({
      "any.only": "validation.genderMustBeMaleFemaleOrOther",
    }),
  status: Joi.string()
    .valid(...Object.values(UserStatus), "active", "inactive", "suspended", "deleted")
    .optional(),
  profileImage: Joi.string().optional().allow("", null),
  country: Joi.string().optional().allow("", null),
  state: Joi.string().optional().allow("", null),
  city: Joi.string().optional().allow("", null),
  dateOfBirth: Joi.string().optional().allow("", null),
  dob: Joi.string().optional().allow("", null),
  password: Joi.string().optional().allow("", null),
});

/**
 * Update User Status Validation Schema
 */
export const updateUserStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .required()
    .messages({
      "any.only": "validation.statusMustBeActiveInactiveSuspendedOrDeleted",
      "any.required": "validation.status.required",
    }),
});

export default {
  listUserQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
};
