import Joi from "joi";
import {
  CouponStatus,
  DiscountType,
  ApplicableUsers,
} from "../../../models/coupon.model";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const couponIdParamSchema = Joi.object({
  couponId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "validation.invalidCouponIdFormat",
    "any.required": "validation.couponIdIsRequired",
  }),
});

export const createCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .alphanum()
    .min(4)
    .max(10)
    .required()
    .messages({
      "string.alphanum": "validation.couponCodeMayOnlyContainLettersAndNumbers",
      "string.min": "validation.couponCodeMustBeAtLeast4Characters",
      "string.max": "validation.couponCodeMustBeAtMost10Characters",
      "any.required": "validation.couponCodeIsRequired",
    }),
  discountType: Joi.string()
    .valid(DiscountType.PERCENTAGE, DiscountType.FIXED)
    .required()
    .messages({
      "any.only": "validation.discountTypeMustBeEitherPercentageOrFixedAmount",
      "any.required": "validation.discountTypeIsRequired",
    }),
  discountValue: Joi.number()
    .positive()
    .required()
    .when("discountType", {
      is: DiscountType.PERCENTAGE,
      then: Joi.number().max(90).messages({
        "number.max": "validation.percentageDiscountCannotExceed90",
      }),
    })
    .messages({
      "number.base": "validation.discountValueMustBeANumber",
      "number.positive": "validation.discountValueMustBeGreaterThanZero",
      "any.required": "validation.discountValueIsRequired",
    }),
  usageLimit: Joi.number().integer().min(1).required().messages({
    "number.base": "validation.usageLimitMustBeANumber",
    "number.integer": "validation.usageLimitMustBeAnInteger",
    "number.min": "validation.usageLimitMustBeAtLeast1",
    "any.required": "validation.usageLimitIsRequired",
  }),
  perUserLimit: Joi.number().integer().min(1).required().messages({
    "number.base": "validation.perUserLimitMustBeANumber",
    "number.integer": "validation.perUserLimitMustBeAnInteger",
    "number.min": "validation.perUserLimitMustBeAtLeast1",
    "any.required": "validation.perUserLimitIsRequired",
  }),
  startDate: Joi.date().required().messages({
    "date.base": "validation.startDateMustBeAValidDate",
    "any.required": "validation.startDateIsRequired",
  }),
  expiryDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
    "date.base": "validation.expiryDateMustBeAValidDate",
    "date.greater": "validation.expiryDateMustBeAfterTheStartDate",
    "any.required": "validation.expiryDateIsRequired",
  }),
  expiryTime: Joi.string().pattern(timePattern).optional().messages({
    "string.pattern.base": "validation.expiryTimeMustBeInHhmmOrHhmmssFormat",
  }),
  applicableUsers: Joi.string()
    .valid(ApplicableUsers.ALL, ApplicableUsers.SELECTED)
    .required()
    .messages({
      "any.only": "validation.applicableUsersMustBeAllOrSelected",
      "any.required": "validation.applicableUsersIsRequired",
    }),
  status: Joi.string()
    .valid(CouponStatus.ACTIVE, CouponStatus.INACTIVE)
    .optional()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
  selectedUsers: Joi.array()
    .items(
      Joi.alternatives()
        .try(Joi.string().pattern(objectIdPattern), Joi.string().email())
        .messages({
          "string.pattern.base": "validation.selectedUserMustBeAValidUserId",
          "string.email": "validation.selectedUserMustBeAValidEmailAddress",
          "alternatives.match":
            "validation.selectedUserMustBeAValidUserIdOrEmailAddress",
        }),
    )
    .optional(),
  assignedUserIds: Joi.when("applicableUsers", {
    is: ApplicableUsers.SELECTED,
    then: Joi.array()
      .items(
        Joi.string().pattern(objectIdPattern).messages({
          "string.pattern.base": "validation.invalidUserIdFormat",
        }),
      )
      .optional(),
    otherwise: Joi.forbidden(),
  }),
});

export const updateCouponSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .alphanum()
    .min(4)
    .max(10)
    .optional()
    .messages({
      "string.alphanum":
        "validation.couponCodeMayOnlyContainLettersAndNumbers",
      "string.min":
        "validation.couponCodeMustBeAtLeast4Characters",
      "string.max":
        "validation.couponCodeMustBeAtMost10Characters",
    }),

  discountType: Joi.string()
    .valid(DiscountType.PERCENTAGE, DiscountType.FIXED)
    .optional()
    .messages({
      "any.only": "validation.discountTypeMustBeEitherPercentageOrFixedAmount",
    }),
  discountValue: Joi.number()
    .positive()
    .optional()
    .when("discountType", {
      is: DiscountType.PERCENTAGE,
      then: Joi.number().max(90).messages({
        "number.max": "validation.percentageDiscountCannotExceed90",
      }),
    })
    .messages({
      "number.base": "validation.discountValueMustBeANumber",
      "number.positive": "validation.discountValueMustBeGreaterThanZero",
    }),
      minOrderAmount: Joi.number()
    .min(0)
    .optional()
    .messages({
      "number.base": "validation.minOrderAmountMustBeANumber",
      "number.min": "validation.minOrderAmountCannotBeNegative",
    }),

  maxDiscountAmount: Joi.number()
    .min(0)
    .optional()
    .messages({
      "number.base": "validation.maxDiscountAmountMustBeANumber",
      "number.min": "validation.maxDiscountAmountCannotBeNegative",
    }),

  usageLimit: Joi.number().integer().min(1).optional().messages({
    "number.base": "validation.usageLimitMustBeANumber",
    "number.integer": "validation.usageLimitMustBeAnInteger",
    "number.min": "validation.usageLimitMustBeAtLeast1",
  }),
  perUserLimit: Joi.number().integer().min(1).optional().messages({
    "number.base": "validation.perUserLimitMustBeANumber",
    "number.integer": "validation.perUserLimitMustBeAnInteger",
    "number.min": "validation.perUserLimitMustBeAtLeast1",
  }),
  startDate: Joi.date().optional().messages({
    "date.base": "validation.startDateMustBeAValidDate",
  }),
  expiryDate: Joi.date().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('startDate')),
    otherwise: Joi.date().greater('now')
  }).optional().messages({
    "date.base": "validation.expiryDateMustBeAValidDate",
    "date.greater": "validation.expiryDateMustBeAfterTheStartDateOrCurrentTime",
  }),
  expiryTime: Joi.string().pattern(timePattern).optional().messages({
    "string.pattern.base": "validation.expiryTimeMustBeInHhmmOrHhmmssFormat",
  }),
  applicableUsers: Joi.string()
    .valid(ApplicableUsers.ALL, ApplicableUsers.SELECTED)
    .optional()
    .messages({
      "any.only": "validation.applicableUsersMustBeAllOrSelected",
    }),
  status: Joi.string()
    .valid(CouponStatus.ACTIVE, CouponStatus.INACTIVE)
    .optional()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
    }),
  selectedUsers: Joi.array()
    .items(
      Joi.alternatives()
        .try(Joi.string().pattern(objectIdPattern), Joi.string().email())
        .messages({
          "string.pattern.base": "validation.selectedUserMustBeAValidUserId",
          "string.email": "validation.selectedUserMustBeAValidEmailAddress",
          "alternatives.match":
            "validation.selectedUserMustBeAValidUserIdOrEmailAddress",
        }),
    )
    .optional(),
  assignedUserIds: Joi.array()
    .items(
      Joi.string().pattern(objectIdPattern).messages({
        "string.pattern.base": "validation.invalidUserIdFormat",
      }),
    )
    .optional(),
});

export const couponStatusSchema = Joi.object({
  status: Joi.string()
    .valid(CouponStatus.ACTIVE, CouponStatus.INACTIVE)
    .required()
    .messages({
      "any.only": "validation.statusMustBeEitherActiveOrInactive",
      "any.required": "validation.statusIsRequired",
    }),
});

export const couponListFiltersSchema = Joi.object({
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .uppercase()
    .valid(CouponStatus.ACTIVE, CouponStatus.INACTIVE)
    .optional(),
  discountType: Joi.string()
    .uppercase()
    .valid(DiscountType.PERCENTAGE, DiscountType.FIXED)
    .optional(),
  applicableUsers: Joi.string()
    .uppercase()
    .valid(ApplicableUsers.ALL, ApplicableUsers.SELECTED)
    .optional(),
  fromDate: Joi.date()
    .optional()
    .messages({ "date.base": "validation.fromDateMustBeAValidDate" }),
  toDate: Joi.date()
    .optional()
    .messages({ "date.base": "validation.toDateMustBeAValidDate" }),
  sortBy: Joi.string()
    .valid(
      "code",
      "discountType",
      "discountValue",
      "usageLimit",
      "expiryDate",
      "applicableUsers",
      "status",
      "createdAt",
      "updatedAt",
    )
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const assignCouponUsersSchema = Joi.object({
  userIds: Joi.array()
    .items(
      Joi.string().pattern(objectIdPattern).messages({
        "string.pattern.base": "validation.invalidUserIdFormat",
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "validation.atLeastOneUserIdMustBeProvided",
      "any.required": "validation.userIdsAreRequired",
    }),
});
