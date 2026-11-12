import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
  ANDROID_TV = 'android_tv',
  APPLE_TV = 'apple_tv',
  FIRE_TV = 'fire_tv',
}

export interface IUserSession extends Document {
  userId: Types.ObjectId;
  refreshToken: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceToken?: string;
  ipAddress?: string;
  lastActiveAt?: Date;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      enum: Object.values(DeviceType),
      default: null,
    },
    deviceName: {
      type: String,
      default: null,
    },
    deviceToken: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * User sessions lookup
 */
UserSessionSchema.index({
  userId: 1,
});

/**
 * Refresh token lookup
 */
UserSessionSchema.index({
  refreshToken: 1,
});

/**
 * Device lookup
 */
UserSessionSchema.index({
  userId: 1,
  deviceId: 1,
});

/**
 * Session expiry cleanup
 */

//Automatically deletes documents when: expiresAt < current time
UserSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

/**
 * Active device listing
 */
UserSessionSchema.index({
  userId: 1,
  lastActiveAt: -1,
});

export const UserSession = mongoose.model<IUserSession>(
  'UserSession',
  UserSessionSchema
);