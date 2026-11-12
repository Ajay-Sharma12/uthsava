import Joi from "joi";

const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const noSpaceEmail = /^\S+$/;

// ─── Param ───────────────────────────────────────────────────────────────────

export const producerIdParamSchema = Joi.object({
  producerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidProducerIdFormat",
      "any.required": "validation.producerIdIsRequired",
    }),
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createProducerSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .required()
    .messages({
      "string.pattern.base":
        "validation.firstNameMustContainAlphabeticCharactersOnly",
      "any.required": "validation.firstNameIsRequired",
    }),
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(nameRegex)
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "validation.lastNameMustContainAlphabeticCharactersOnly",
    }),
  email: Joi.string()
    .trim()
    .pattern(noSpaceEmail)
    .email()
    .lowercase()
    .required()
    .messages({
      "string.pattern.base": "validation.emailMustNotContainSpaces",
      "string.email": "validation.pleaseProvideAValidEmailAddress",
      "any.required": "validation.emailIsRequired",
    }),
  mobile: Joi.string()
    .trim()
    .pattern(/^\d{8,12}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.mobileNumberMustBeNumericAnd812Digits",
      "any.required": "validation.mobileNumberIsRequired",
    }),
  countryCode: Joi.number().integer().min(1).max(999).optional(),
  companyName: Joi.string().trim().max(150).optional().allow(""),
  website: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

description: Joi.string()
  .trim()
  .max(500)
  .allow("", null)
  .optional(),

gstNumber: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

country: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

state: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

city: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

address: Joi.string()
  .trim()
  .max(500)
  .allow("", null)
  .optional(),

  categories: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
    .allow(null),
  status: Joi.string().valid("active", "inactive").default("active"),
  // password is always system-generated — strip if sent
  password: Joi.any().optional().strip(),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateProducerSchema = Joi.object({
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
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "validation.lastNameMustContainAlphabeticCharactersOnly",
    }),
  email: Joi.string()
    .trim()
    .pattern(noSpaceEmail)
    .email()
    .lowercase()
    .optional()
    .messages({
      "string.pattern.base": "validation.emailMustNotContainSpaces",
      "string.email": "validation.pleaseProvideAValidEmailAddress",
    }),
  mobile: Joi.string()
    .trim()
    .pattern(/^\d{8,12}$/)
    .optional()
    .messages({
      "string.pattern.base": "validation.mobileNumberMustBeNumericAnd812Digits",
    }),
  countryCode: Joi.number().integer().min(1).max(999).optional(),
  companyName: Joi.string().trim().max(150).optional().allow(""),
  website: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

description: Joi.string()
  .trim()
  .max(500)
  .allow("", null)
  .optional(),

gstNumber: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

country: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

state: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

city: Joi.string()
  .trim()
  .max(100)
  .allow("", null)
  .optional(),

address: Joi.string()
  .trim()
  .max(500)
  .allow("", null)
  .optional(),
  
  categories: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
    .allow(null),
  genres: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
    .allow(null),
  status: Joi.string().valid("active", "inactive").optional(),
  password: Joi.any().optional().strip(),
});

// ─── Status toggle ───────────────────────────────────────────────────────────

export const updateProducerStatusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive", "suspended").required().messages({
    "any.only": "validation.statusMustBeActiveInactiveOrSuspended",
    "any.required": "validation.statusIsRequired",
  }),
});

// ─── List filters ─────────────────────────────────────────────────────────────

export const listProducersQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),
  status: Joi.string().valid("active", "inactive", "suspended", "deleted", "all", "pending", "").optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  sortBy: Joi.string()
    .valid(
      "email",
      "fullName",
      "firstName",
      "lastName",
      "mobile",
      "companyName",
      "status",
      "createdAt",
      "updatedAt",
    )
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
