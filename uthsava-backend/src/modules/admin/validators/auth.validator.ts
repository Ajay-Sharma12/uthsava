import Joi from "joi";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Admin Login Validation Schema
 */

export const adminLoginSchema = Joi.object({
  email: Joi.string().required().messages({
    "any.required": "validation.email.required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "validation.passwordMustBeAtLeast6CharactersLong",
    "any.required": "validation.password.required",
  }),
  rememberMe: Joi.boolean().optional(),
  remember: Joi.boolean().optional(),
  deviceId: Joi.string().allow("").optional(),
  deviceType: Joi.string().allow("").optional(),
  deviceToken: Joi.string().allow("").optional(),
})
  .unknown(true)
  .prefs({ stripUnknown: true });

/**
 * Forgot Password Validation Schema
 */
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "validation.email.invalid",
    "any.required": "validation.email.required",
  }),
  origin: Joi.string().allow("").optional(),
  adminUrl: Joi.string().allow("").optional(),
  clientUrl: Joi.string().allow("").optional(),
})
  .unknown(true)
  .prefs({ stripUnknown: true });

/**
 * Reset Password Validation Schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "validation.resetTokenIsRequired",
  }),
  newPassword: Joi.string().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "validation.passwordMustContainAtLeast8CharactersOneUppercaseLetterOneLowercaseLetterOneNumberAndOneSpecialCharacter",
    "any.required": "validation.password.required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "validation.passwordsDoNotMatch",
      "any.required": "validation.password.required",
    }),
});

/**
 * Verify Reset Token Validation Schema
 */
export const verifyResetTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "validation.resetTokenIsRequired",
  }),
});

/**
 * Change Password Validation Schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "validation.currentPasswordIsRequired",
  }),
  newPassword: Joi.string().pattern(passwordRegex).required().messages({
    "string.pattern.base":
      "validation.passwordMustContainAtLeast8CharactersOneUppercaseLetterOneLowercaseLetterOneNumberAndOneSpecialCharacter",
    "any.required": "validation.password.required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "validation.passwordsDoNotMatch",
      "any.required": "validation.password.required",
    }),
});

/**
 * Update Profile Validation Schema
 */
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).messages({
    "string.min": "validation.firstName.min",
    "string.max": "validation.firstName.max",
  }),
  lastName: Joi.string().min(2).max(50).messages({
    "string.min": "validation.lastName.min",
    "string.max": "validation.lastName.max",
  }),
  profileImage: Joi.string().allow("").messages({
    "string.base": "validation.profileImage.invalid",
  }),
});

export default {
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
};
