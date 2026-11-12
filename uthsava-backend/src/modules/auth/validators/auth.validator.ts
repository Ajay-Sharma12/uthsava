import Joi from "joi";

/**
 * =========================================================================
 * Reusable Validator Rules & Helpers
 * =========================================================================
 */

/**
 * Country Code Validation Rule
 * Accepts dial codes formatted like +91, +1, +44 (1-5 digits preceded by + or digit)
 * Max length of 6 characters. Default is +91.
 */
const countryCodeRule = Joi.string()
  .pattern(/^\+[1-9]\d{0,4}$/)
  .max(6)
  .required()
  .messages({
    "string.pattern.base": "validation.countryCodeInvalidFormat",
    "string.max": "validation.countryCodeCannotExceed6Characters",
    "string.empty": "validation.countryCodeCannotBeEmpty",
    "any.required": "validation.countryCodeIsRequired",
  });

/**
 * Mobile Number Validation Rule
 * Must be exactly 10 numeric digits and cannot consist of all identical digits.
 */
const mobileNumberRule = Joi.string()
  .length(10)
  .pattern(/^\d+$/)
  .custom((value, helpers) => {
    if (/^(\d)\1{9}$/.test(value)) {
      return helpers.error("string.pattern.identical");
    }
    return value;
  })
  .required()
  .messages({
    "string.length": "validation.mobileNumberMustBeExactly10Digits",
    "string.pattern.base": "validation.mobileNumberMustContainOnlyDigits",
    "string.pattern.identical": "validation.mobileNumberCannotBeAllSameDigits",
    "any.required": "validation.mobileNumberIsRequired",
  });

/**
 * Email Address Validation Rule
 * Valid email format, maximum 50 characters limit.
 */
const emailRule = Joi.string()
  .email()
  .max(50)
  .required()
  .messages({
    "string.email": "validation.email.invalid",
    "string.max": "validation.emailCannotExceed50Characters",
    "any.required": "validation.email.required",
  });

/**
 * Device Tracking Fields Rules
 */
const deviceIdRule = Joi.string()
  .max(255)
  .allow("")
  .optional()
  .messages({
    "string.max": "validation.deviceIdCannotExceed255Characters",
  });

const deviceTypeRule = Joi.string()
  .max(50)
  .allow("")
  .optional()
  .messages({
    "string.max": "validation.deviceTypeCannotExceed50Characters",
  });

const deviceTokenRule = Joi.string()
  .max(500)
  .allow("")
  .optional()
  .messages({
    "string.max": "validation.deviceTokenCannotExceed500Characters",
  });

/**
 * =========================================================================
 * User Authentication Schemas
 * =========================================================================
 */

/**
 * User Login Validation Schema
 */
export const userLoginSchema = Joi.object({
  email: emailRule,
  password: Joi.string().min(6).max(128).required().messages({
    "string.min": "validation.passwordMustBeAtLeast6CharactersLong",
    "string.max": "validation.passwordCannotExceed128Characters",
    "any.required": "validation.password.required",
  }),
  type: Joi.string().valid("user", "admin_sub_user", "producer", "admin").required().messages({
    "any.only": "validation.typeIsRequired",
    "any.required": "validation.typeIsRequired",
  }),
  rememberMe: Joi.boolean().optional(),
  remember: Joi.boolean().optional(),
  deviceId: deviceIdRule,
  deviceType: deviceTypeRule,
  deviceToken: deviceTokenRule,
})
  .unknown(true)
  .prefs({ stripUnknown: true });

/**
 * User Registration Validation Schema
 */
export const userRegisterSchema = Joi.object({
  email: emailRule,
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "validation.passwordMustBeAtLeast8CharactersLong",
    "string.max": "validation.passwordCannotExceed128Characters",
    "any.required": "validation.passwordIsRequired",
  }),
  role: Joi.string().valid("user", "admin", "producer").optional().messages({
    "any.only": "validation.roleMustBeValid",
  }),
});

/**
 * Forgot Password OTP Request Schema
 */
export const forgotPasswordOTPSchema = Joi.object({
  email: emailRule,
});

/**
 * Verify OTP Schema (Email OTP)
 */
export const verifyOTPSchema = Joi.object({
  email: emailRule,
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "validation.otpMustBe6CharactersLong",
    "string.pattern.base": "validation.otpMustContainOnlyDigits",
    "any.required": "validation.otpIsRequired",
  }),
  otpId: Joi.string().required().messages({
    "any.required": "validation.otpIdIsRequired",
  }),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = Joi.object({
  email: emailRule,
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    )
    .required()
    .messages({
      "string.min": "validation.passwordMustBeAtLeast8CharactersLong",
      "string.max": "validation.passwordCannotExceed128Characters",
      "string.pattern.base":
        "validation.passwordMustContainAtLeastOneUppercaseLetterOneLowercaseLetterOneDigitAndOneSpecialCharacter",
      "any.required": "validation.passwordIsRequired",
    }),
  otpId: Joi.string().required().messages({
    "any.required": "validation.otpIdIsRequired",
  }),
});

/**
 * =========================================================================
 * Mobile Authentication Schemas
 * =========================================================================
 */

/**
 * Mobile Login Request Validation Schema
 */
export const mobileLoginSchema = Joi.object({
  mobile: mobileNumberRule,
  countryCode: countryCodeRule,
});

/**
 * Verify Mobile OTP Validation Schema
 */
export const verifyMobileOtpSchema = Joi.object({
  mobile: mobileNumberRule,
  countryCode: countryCodeRule,
  otp: Joi.string().length(4).pattern(/^\d+$/).required().messages({
    "string.length": "validation.otpMustBe4CharactersLong",
    "string.pattern.base": "validation.otpMustContainOnlyDigits",
    "any.required": "validation.otpIsRequired",
  }),
  deviceId: deviceIdRule,
  deviceType: deviceTypeRule,
  deviceToken: deviceTokenRule,
});

/**
 * Resend Mobile OTP Validation Schema
 */
export const resendMobileOtpSchema = Joi.object({
  mobile: mobileNumberRule,
  countryCode: countryCodeRule,
});

/**
 * Complete Profile Validation Schema
 */
export const completeProfileSchema = Joi.object({
  mobile: mobileNumberRule,
  countryCode: countryCodeRule,
  fullName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-z ]+$/)
    .required()
    .messages({
      "string.min": "validation.fullNameMustBeAtLeast2Characters",
      "string.max": "validation.fullNameCannotExceed50Characters",
      "string.pattern.base": "validation.fullNameCanOnlyContainAlphabetsAndSpaces",
      "any.required": "validation.fullNameIsRequired",
    }),
  email: emailRule,
  age: Joi.number().min(13).max(120).required().messages({
    "number.min": "validation.ageMustBeAtLeast13",
    "number.max": "validation.ageMustBeAtMost120",
    "any.required": "validation.ageIsRequired",
  }),
  gender: Joi.string()
    .valid("male", "female", "other", "prefer not to say")
    .required()
    .messages({
      "any.only": "validation.genderMustBeMaleFemaleOtherOrPreferNotToSay",
      "any.required": "validation.genderIsRequired",
    }),
  acceptedTerms: Joi.boolean().valid(true).required().messages({
    "any.only": "validation.youMustAcceptTheTermsAndConditions",
    "any.required": "validation.acceptanceOfTermsIsRequired",
  }),
  role: Joi.string()
    .valid("user", "producer", "actor")
    .default("user")
    .optional()
    .messages({
      "any.only": "validation.roleMustBeValid",
    }),
  deviceId: deviceIdRule,
  deviceType: deviceTypeRule,
  deviceToken: deviceTokenRule,
});

/**
 * Select Genre Validation Schema
 */
export const selectGenreSchema = Joi.object({
  genres: Joi.array()
    .items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
        "string.pattern.base": "validation.invalidGenreIdFormat"
      })
    )
    .min(0)
    .max(5)
    .required()
    .messages({
      "array.max": "validation.youCanSelectAMaximumOf5Genres",
      "any.required": "validation.genresSelectionIsRequired",
    }),
});

/**
 * Create Account / Sub-Profile Validation Schema
 * Enforces:
 * - name / displayName: min 2, max 50 characters
 * - isKids: strict boolean (true/false)
 * - Strict payload: rejects any unknown fields (.unknown(false))
 */
export const createAccountSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.base": "validation.nameMustBeString",
      "string.empty": "validation.nameCannotBeEmpty",
      "string.min": "validation.nameMustBeAtLeast2CharactersLong",
      "string.max": "validation.nameCannotExceed50Characters",
      "string.pattern.base": "validation.nameCanOnlyContainAlphabetsAndSpaces",
    }),
  displayName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.base": "validation.nameMustBeString",
      "string.empty": "validation.nameCannotBeEmpty",
      "string.min": "validation.nameMustBeAtLeast2CharactersLong",
      "string.max": "validation.nameCannotExceed50Characters",
      "string.pattern.base": "validation.nameCanOnlyContainAlphabetsAndSpaces",
    }),
  isKids: Joi.boolean().strict().optional().default(false).messages({
    "boolean.base": "validation.isKidsMustBeBoolean",
  }),
  kids: Joi.boolean().strict().optional().messages({
    "boolean.base": "validation.isKidsMustBeBoolean",
  }),
  avatarId: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.avatarIdMustBeString",
  }),
  avatar: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.avatarMustBeString",
  }),
  profilePicture: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.profilePictureMustBeString",
  }),
  favoriteGenreIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
  preferredLanguageIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
})
  .or("name", "displayName")
  .unknown(false)
  .messages({
    "object.missing": "validation.nameIsRequired",
    "object.unknown": "validation.unknownFieldNotAllowed",
  });

/**
 * Update Account / Sub-Profile Validation Schema
 * Accepts optional fields for sub-profile updates (name/displayName, isKids, avatarId, avatar, profilePicture, genres, languages).
 * Rejects unknown fields (.unknown(false)).
 */
export const updateAccountSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.base": "validation.nameMustBeString",
      "string.empty": "validation.nameCannotBeEmpty",
      "string.min": "validation.nameMustBeAtLeast2CharactersLong",
      "string.max": "validation.nameCannotExceed50Characters",
      "string.pattern.base": "validation.nameCanOnlyContainAlphabetsAndSpaces",
    }),
  displayName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.base": "validation.nameMustBeString",
      "string.empty": "validation.nameCannotBeEmpty",
      "string.min": "validation.nameMustBeAtLeast2CharactersLong",
      "string.max": "validation.nameCannotExceed50Characters",
      "string.pattern.base": "validation.nameCanOnlyContainAlphabetsAndSpaces",
    }),
  isKids: Joi.boolean().strict().optional().messages({
    "boolean.base": "validation.isKidsMustBeBoolean",
  }),
  kids: Joi.boolean().strict().optional().messages({
    "boolean.base": "validation.isKidsMustBeBoolean",
  }),
  avatarId: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.avatarIdMustBeString",
  }),
  avatar: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.avatarMustBeString",
  }),
  profilePicture: Joi.string().trim().optional().allow(null, "").messages({
    "string.base": "validation.profilePictureMustBeString",
  }),
  favoriteGenreIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
  preferredLanguageIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
})
  .unknown(false)
  .messages({
    "object.unknown": "validation.unknownFieldNotAllowed",
  });

/**
 * Delete User Account Validation Schema
 */
export const deleteUserSchema = Joi.object({
  otp: Joi.string().trim().required().messages({
    "string.empty": "validation.otpIsRequired",
    "any.required": "validation.otpIsRequired",
  }),
});

export default {
  userLoginSchema,
  userRegisterSchema,
  forgotPasswordOTPSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  mobileLoginSchema,
  verifyMobileOtpSchema,
  resendMobileOtpSchema,
  completeProfileSchema,
  selectGenreSchema,
  createAccountSchema,
  updateAccountSchema,
  deleteUserSchema,
};
