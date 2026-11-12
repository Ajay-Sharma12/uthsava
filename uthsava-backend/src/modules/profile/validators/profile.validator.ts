import Joi from "joi";

/**
 * Update Profile Validation Schema
 */
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional().messages({
    "string.empty": "validation.firstNameIsRequired",
    "string.min": "validation.firstNameMustBeAtLeast2CharactersLong",
    "string.max": "validation.firstNameCannotExceed50Characters",
  }),

  lastName: Joi.string().trim().min(2).max(50).optional().messages({
    "string.empty": "validation.lastNameIsRequired",
    "string.min": "validation.lastNameMustBeAtLeast2CharactersLong",
    "string.max": "validation.lastNameCannotExceed50Characters",
  }),

  fullName: Joi.string().trim().min(2).max(100).optional().messages({
    "string.empty": "validation.fullNameIsRequired",
    "string.min": "validation.fullNameMustBeAtLeast2CharactersLong",
    "string.max": "validation.fullNameCannotExceed100Characters",
  }),

  location: Joi.string().trim().max(200).optional().allow("").messages({
    "string.max": "validation.locationCannotExceed200Characters",
  }),

  mobile: Joi.string().trim().max(12).optional().allow("").messages({
    "string.max": "validation.mobileNumberCannotExceed12Characters",
  }),

  profileImage: Joi.string().trim().optional().allow("").messages({
    "string.empty": "validation.profileImageCannotBeEmpty",
  }),

  // Country code for phone number
  countryCode: Joi.number().integer().min(1).max(999).optional().messages({
    "number.min": "validation.countryCodeMustBeAtLeast1",
    "number.max": "validation.countryCodeCannotExceed999",
  }),
})
  .min(1)
  .messages({
    "object.min": "validation.atLeastOneFieldMustBeProvidedToUpdate",
  });

/**
 * Update Profile Image Validation Schema
 */
export const updateProfileImageSchema = Joi.object({
  profileImage: Joi.string().trim().required().messages({
    "any.required": "validation.profileImageIsRequired",
    "string.empty": "validation.profileImageCannotBeEmpty",
  }),
});

/**
 * Change Password Validation Schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "validation.currentPasswordIsRequired",
    "string.empty": "validation.currentPasswordCannotBeEmpty",
  }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .messages({
      "any.required": "validation.newPasswordIsRequired",
      "string.empty": "validation.newPasswordCannotBeEmpty",
      "string.min": "validation.newPasswordMustBeAtLeast8CharactersLong",
      "string.max": "validation.newPasswordCannotExceed128Characters",
      "string.pattern.base":
        "validation.newPasswordMustContainAtLeastOneUppercaseLetterOneLowercaseLetterOneNumberAndOneSpecialCharacter",
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.required": "validation.confirmPasswordIsRequired",
      "any.only": "validation.passwordsDoNotMatch",
    }),
});

/**
 * Update Notification Settings Validation Schema
 */
export const updateNotificationSettingsSchema = Joi.object({
  notificationEnabled: Joi.boolean().required().messages({
    "any.required": "validation.notificationSettingIsRequired",
    "boolean.base": "validation.notificationSettingMustBeABooleanValue",
  }),
});
