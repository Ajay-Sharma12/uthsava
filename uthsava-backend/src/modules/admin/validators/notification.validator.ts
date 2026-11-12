import Joi from "joi";
import { NotificationType, NotificationRecipientType } from "../../../models/admin-sent-notification.model";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Notification Validator
 *
 * sendTo options (use UPPERCASE):
 *   - ALL_USERS       → every active user (role: USER)
 *   - ALL_PRODUCERS   → every active producer (role: PRODUCER)
 *   - ALL_SUBADMINS   → every active sub-admin (role: ADMIN_SUB_USER)
 *   - FREE_USERS      → users without active subscription
 *   - SUBSCRIBED_USERS → users with active subscription
 *   - SELECTED_USERS  → explicit list of user IDs (requires `recipients` array)
 *   - SELECTED_PRODUCERS → specific producers (requires `recipients` array)
 *
 * category options:
 *   - new_content              → Sent when new content is added
 *   - subscription_renewal     → Sent before subscription expires
 *   - offer_promo              → Sent for coupons/promotional offers
 *   - system_maintenance       → Sent for planned maintenance
 *   - approval_rejection       → Sent when content is approved/rejected
 *
 * notificationTypes (one or more):
 *   - push  → Firebase push notification
 *   - email → Email via SMTP
 *   - sms   → SMS via configured provider
 */

export const sendNotificationSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    "string.min": "validation.titleMustBeAtLeast2Characters",
    "string.max": "validation.titleMustNotExceed200Characters",
    "any.required": "validation.titleIsRequired",
  }),

  message: Joi.string().trim().min(2).max(1000).required().messages({
    "string.min": "validation.messageMustBeAtLeast2Characters",
    "string.max": "validation.messageMustNotExceed1000Characters",
    "any.required": "validation.messageIsRequired",
  }),

  // Note: We dynamically pull valid categories from NotificationType enum 
  // instead of hardcoding to support the extensive list of automated/admin notifications.
  category: Joi.string()
    .uppercase()
    .valid(...Object.values(NotificationType))
    .required()
    .messages({
      "any.only": `category must be one of: ${Object.values(NotificationType).join(", ")}`,
      "any.required": "validation.categoryIsRequired",
    }),

  notificationTypes: Joi.array()
    .items(
      Joi.string()
        .uppercase()
        .valid("PUSH", "EMAIL", "SMS")
    )
    .min(1)
    .required()
    .messages({
      "array.min": "validation.atLeastOneNotificationTypeIsRequired",
      "any.required": "validation.notificationtypesIsRequired",
      "any.only": "validation.notificationtypesMustBeOneOfPushEmailSms",
    }),

  sendTo: Joi.string()
    .uppercase()
    .valid(...Object.values(NotificationRecipientType))
    .required()
    .messages({
      "any.only": `sendTo must be one of: ${Object.values(NotificationRecipientType).join(", ")}`,
      "any.required": "validation.sendtoIsRequired",
    }),

  recipients: Joi.array()
    .items(
      Joi.string().pattern(objectIdRegex).messages({
        "string.pattern.base":
          "validation.eachRecipientIdMustBeAValidMongodbObjectid",
      }),
    )
    .optional()
    .when("sendTo", {
      is: Joi.any().valid(NotificationRecipientType.SELECTED_USERS, NotificationRecipientType.SELECTED_PRODUCERS),
      then: Joi.array().min(1).required().messages({
        "array.min": "Please select at least one recipient to send the notification.",
        "any.required": "Please select at least one recipient to send the notification.",
      }),
    }),

  userGroups: Joi.array()
    .items(Joi.string().trim().min(1))
    .optional(),

  scheduledAt: Joi.date().optional().allow(null, ""),

  dataId: Joi.string().optional().allow(null, ""),
});

export const listNotificationsQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(100).optional(),
  sendTo: Joi.string()
    .uppercase()
    .valid(...Object.values(NotificationRecipientType), "")
    .optional(),
  category: Joi.string()
    .uppercase()
    .valid(...Object.values(NotificationType), "")
    .optional(),
  status: Joi.string()
    .uppercase()
    .valid("SCHEDULED", "SENT", "DRAFT", "FAILED", "")
    .optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  sortBy: Joi.string()
    .valid("createdAt", "title", "sendTo", "recipientCount")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

