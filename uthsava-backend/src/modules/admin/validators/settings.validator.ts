import Joi from "joi";

const urlRegex = /^https?:\/\/.+/;

// ─── Revenue bracket ──────────────────────────────────────────────────────────

const revenueBracketSchema = Joi.object({
  fromViews: Joi.number().integer().min(0).required().messages({
    "number.min": "validation.fromviewsMustBe0OrGreater",
    "any.required": "validation.fromviewsIsRequired",
  }),
  toViews: Joi.number()
    .integer()
    .min(0)
    .required()
    .when("fromViews", {
      is: Joi.number().exist(),
      then: Joi.number().min(Joi.ref("fromViews")).messages({
        "number.min": "validation.toviewsMustBeGreaterThanOrEqualToFromviews",
      }),
    })
    .messages({ "any.required": "validation.toviewsIsRequired" }),
  amountPerView: Joi.number().min(0).required().messages({
    "number.min": "validation.amountperviewMustBe0OrGreater",
    "any.required": "validation.amountperviewIsRequired",
  }),
});

// ─── Full settings update ─────────────────────────────────────────────────────

export const updateSettingsSchema = Joi.object({
  // Social / contact
  instagram: Joi.string()
    .trim()
    .pattern(urlRegex)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "settings.validation.instagram.invalid",
    }),
  facebook: Joi.string()
    .trim()
    .pattern(urlRegex)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "settings.validation.facebook.invalid",
    }),
  linkedin: Joi.string()
    .trim()
    .pattern(urlRegex)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "settings.validation.linkedin.invalid",
    }),
  appStore: Joi.string()
    .trim()
    .pattern(urlRegex)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "settings.validation.appStore.invalid",
    }),
  googlePlayStore: Joi.string()
    .trim()
    .pattern(urlRegex)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "settings.validation.googlePlayStore.invalid",
    }),
  email: Joi.string()
    .email()
    .allow(null, "")
    .optional()
    .messages({ "string.email": "settings.validation.email.invalid" }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, "")
    .optional()
    .messages({ "string.pattern.base": "settings.validation.phone.invalid" }),

  // Free Preview Settings
  freePreviewEnabled: Joi.boolean().optional().messages({
    "boolean.base": "validation.freepreviewenabledMustBeTrueOrFalse",
  }),
  // Accept all aliases sent by the frontend
  freePreviewDurationMinutes: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      "number.min": "validation.freePreviewDurationMustBeAtLeast1Minute",
    }),
  freePreviewDuration: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.freePreviewDurationMustBeAtLeast1Minute",
  }),
  previewDuration: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.freePreviewDurationMustBeAtLeast1Minute",
  }),

  // Revenue Configuration — full bracket array replacement
  revenueBrackets: Joi.array().items(revenueBracketSchema).optional(),

  // Payout Settings
  payoutFrequencyDays: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.payoutFrequencyMustBeAtLeast1Day",
  }),

  // Yearly Subscription Discount
  yearlySubscriptionDiscount: Joi.number().integer().min(0).max(100).optional().messages({
    "number.min": "validation.yearlySubscriptionDiscountMustBe0OrGreater",
    "number.max": "validation.yearlySubscriptionDiscountMustBe100OrLess",
  }),

  // Session & OTP Settings
  sessionTimeoutDays: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.sessionTimeoutMustBeAtLeast1Day",
  }),
  maxOtpAttempts: Joi.number().integer().min(1).optional().messages({
    "number.min": "validation.maxOtpAttemptsMustBeAtLeast1",
  }),
  otpResendTimerSeconds: Joi.number().integer().min(0).optional().messages({
    "number.min": "validation.otpResendTimerCannotBeNegative",
  }),

  // Admin Upload Rules
  /*
  adminContentRevenueRule: Joi.object({
    ownerType: Joi.string().valid("PLATFORM", "PRODUCER", "SPLIT").optional(),
    assignedProducerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null, ""),
    producerPercentage: Joi.number().min(0).max(100).optional().allow(null),
    platformPercentage: Joi.number().min(0).max(100).optional().allow(null),
  }).optional(),
  */
});

// ─── Revenue bracket CRUD ─────────────────────────────────────────────────────

/** Add a single bracket */
export const addRevenueBracketSchema = Joi.object({
  fromViews: Joi.number().integer().min(0).required(),
  toViews: Joi.number()
    .integer()
    .min(Joi.ref("fromViews"))
    .required()
    .messages({
      "number.min": "validation.toviewsMustBeGreaterThanOrEqualToFromviews",
    }),
  amountPerView: Joi.number().min(0).required(),
});

/** Update a single bracket (all fields optional) */
export const updateRevenueBracketSchema = Joi.object({
  fromViews: Joi.number().integer().min(0).optional(),
  toViews: Joi.number().integer().min(0).optional(),
  amountPerView: Joi.number().min(0).optional(),
})
  .min(1)
  .messages({ "object.min": "validation.atLeastOneFieldMustBeProvided" });

/** Bracket ID param */
export const bracketIdParamSchema = Joi.object({
  bracketId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "validation.invalidBracketIdFormat",
      "any.required": "validation.bracketidIsRequired",
    }),
});

export default {
  updateSettingsSchema,
  addRevenueBracketSchema,
  updateRevenueBracketSchema,
  bracketIdParamSchema,
};
