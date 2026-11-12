import mongoose, { Schema, Document, Types } from 'mongoose';

export enum UserNotificationType {
  NEW_CONTENT = 'NEW_CONTENT',
  NEW_EPISODE = 'NEW_EPISODE',
  SUBSCRIPTION_PURCHASED = 'SUBSCRIPTION_PURCHASED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CONTENT_APPROVED = 'CONTENT_APPROVED',
  CONTENT_REJECTED = 'CONTENT_REJECTED',
  OFFER_PROMO = 'OFFER_PROMO',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  senderId?: Types.ObjectId;
  title: string;
  message: string;
  type: UserNotificationType;
  contentId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: Object.values(UserNotificationType),
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Notification Listing
 */
NotificationSchema.index({
  userId: 1,
  createdAt: -1,
});

/**
 * Unread Count
 */
NotificationSchema.index({
  userId: 1,
  isRead: 1,
});

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);