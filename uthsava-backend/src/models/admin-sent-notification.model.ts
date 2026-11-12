import mongoose, { Schema, Document, Types } from 'mongoose';

export enum NotificationType {
  // Existing User Notifications
  EMAIL_OTP = 'EMAIL_OTP',
  MOBILE_OTP = 'MOBILE_OTP',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',

  // Added for automated cron jobs and admin templates
  NEW_MOVIE_RELEASED = 'NEW_MOVIE_RELEASED',
  NEW_SERIES_RELEASED = 'NEW_SERIES_RELEASED',
  NEW_EPISODE_AVAILABLE = 'NEW_EPISODE_AVAILABLE',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  PROMOTIONAL_OFFER = 'PROMOTIONAL_OFFER',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  NEW_FEATURE_ANNOUNCEMENT = 'NEW_FEATURE_ANNOUNCEMENT',
  ACCOUNT_SECURITY_ALERT = 'ACCOUNT_SECURITY_ALERT',
  NEW_COUPON_AVAILABLE = 'NEW_COUPON_AVAILABLE',
  COUPON_EXPIRING_SOON = 'COUPON_EXPIRING_SOON',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRY_REMINDER_7_DAYS = 'SUBSCRIPTION_EXPIRY_REMINDER_7_DAYS',
  SUBSCRIPTION_EXPIRY_REMINDER_3_DAYS = 'SUBSCRIPTION_EXPIRY_REMINDER_3_DAYS',
  SUBSCRIPTION_EXPIRY_REMINDER_1_DAY = 'SUBSCRIPTION_EXPIRY_REMINDER_1_DAY',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  AUTO_RENEWAL_SUCCESSFUL = 'AUTO_RENEWAL_SUCCESSFUL',
  AUTO_RENEWAL_FAILED = 'AUTO_RENEWAL_FAILED',
  INVOICE_GENERATED = 'INVOICE_GENERATED'
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationRecipientType {
  ALL_USERS = 'ALL_USERS',
  ALL_PRODUCERS = 'ALL_PRODUCERS',
  ALL_SUBADMINS = 'ALL_SUBADMINS',
  FREE_USERS = 'FREE_USERS',
  SUBSCRIBED_USERS = 'SUBSCRIBED_USERS',
  SELECTED_USERS = 'SELECTED_USERS',
  SELECTED_PRODUCERS = 'SELECTED_PRODUCERS',
}

export enum NotificationStatus {
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT'
}

export interface IAdminSentNotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  channels: NotificationChannel[];
  recipientType: NotificationRecipientType;
  recipientUserIds?: Types.ObjectId[];
  senderId?: Types.ObjectId;
  dataId?: string;
  status: NotificationStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  successCount?: number;
  failureCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<IAdminSentNotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    channels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
        required: true,
      },
    ],
    recipientType: {
      type: String,
      enum: Object.values(NotificationRecipientType),
      required: true,
    },

    /**
     * Used only when:
     * SELECTED_USERS
     * SELECTED_PRODUCERS
     */
    recipientUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.SCHEDULED,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    // Added fields to match NotificationService properties correctly
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dataId: {
      type: String,
      default: null,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Notification listing
 */
NotificationSchema.index({
  createdAt: -1,
});

/**
 * Scheduler worker lookup
 */
NotificationSchema.index({
  status: 1,
  scheduledAt: 1,
});

/**
 * Filter by notification type
 */
NotificationSchema.index({
  type: 1,
});

/**
 * Filter by recipient type
 */
NotificationSchema.index({
  recipientType: 1,
});

export const AdminSentNotification = mongoose.model<IAdminSentNotification>(
  'adminSentNotification',
  NotificationSchema
);
