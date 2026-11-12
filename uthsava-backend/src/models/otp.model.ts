import { Schema, model, Document, Types } from "mongoose";

export enum OTPType {
  FORGOT_PASSWORD = "forgot_password",
  SIGNUP = "signup",
  EMAIL_VERIFICATION = "email_verification",
  MOBILE_LOGIN = "mobile_login",
  DELETE_ACCOUNT = "delete_account",
}

export interface IOTP extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  email?: string;
  mobile?: string;
  countryCode?: string;
  otp: string;
  type: OTPType;
  isUsed: boolean;
  attempts: number;
  sendAttempts: number;
  createdAt: Date;
  expiresAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: function(this: IOTP) {
        return this.type === OTPType.MOBILE_LOGIN || this.type === OTPType.DELETE_ACCOUNT;
      },
    },
    countryCode: {
      type: String,
      required: function(this: IOTP) {
        return this.type === OTPType.MOBILE_LOGIN || this.type === OTPType.DELETE_ACCOUNT;
      },
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(OTPType),
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    sendAttempts: {
      type: Number,
      default: 1,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB will auto-delete after this time
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for quick lookups
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ userId: 1, type: 1 });

export const OTP = model<IOTP>("OTP", otpSchema);
