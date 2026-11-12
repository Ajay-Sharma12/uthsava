import { Schema, model, Document, Types } from "mongoose";
import { Role } from "../common/types/auth.types";
import { config } from "../core/config";

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  APPLE = 'apple'
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
  PREFER_NOT_TO_SAY = "prefer not to say",
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  SUPPORT_LEAD = 'SUPPORT_LEAD',
  FINANCE = 'FINANCE',
  MODERATOR = 'MODERATOR',
}



export interface IUser extends Document {
  authProvider?: AuthProvider;
  userId: number;
  email?: string;
  password?: string;
  role: Role;
  roleId?: Types.ObjectId; // Reference to Role document
  firstName?: string;
  lastName?: string;
  fullName?: string;
  mobile?: string;
  country?: string;
  state?: string;
  city?: string;
  countryCode?: number;
  location?: string;
  profileImage?: string;
  gender?: Gender;
  status: UserStatus;
  notificationEnabled?: boolean; // Push notification preference
  googleId?: string;
  appleId?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  isProfileCompleted?: boolean;
  age?: number;
  acceptedTerms?: boolean;
  genres?: Types.ObjectId[];

  newContentAlerts: boolean;
  subscriptionAlerts: boolean;
  promotionalNotifications: boolean;

  /** Optional creator reference (e.g. admin who provisioned the producer account) */
  addedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;

  // Subadmin Permissions - Map of module key to permissions
  adminRole: AdminRole | null;

  deviceId?: string;
  deviceType?: string;
  deviceToken?: string;
  refreshToken?: string;
  rememberMe?: boolean;
  loginType?: string;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  lastLoginDevice?: string | null;
  loginAttempts?: number;
  loginLockUntil?: Date | null;
  otpAttempts?: number;
  otpLockUntil?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;

  lastActiveAt?: Date;
}

// Counter schema for auto-increment
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model("Counter", counterSchema);

const userSchema = new Schema<IUser>(
  {
    userId: { type: Number, unique: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: null
    },
    password: { type: String, default: null },
    role: { type: String, enum: Object.values(Role), default: Role.USER },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    fullName: { type: String, trim: true, minlength: 2, maxlength: 105 },
    mobile: { type: String, trim: true },
    country: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: null
    },
    city: {
      type: String,
      trim: true,
      default: null
    },
    countryCode: { type: Number },
    location: { type: String, trim: true, maxlength: 200 },
    profileImage: { type: String },
    gender: { type: String, enum: Object.values(Gender) },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    notificationEnabled: { type: Boolean, default: true }, // Push notification preference
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isMobileVerified: {
      type: Boolean,
      default: false
    },
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.EMAIL
    },
    googleId: {
      type: String,
      default: null
    },
    appleId: {
      type: String,
      default: null
    },
    isProfileCompleted: {
      type: Boolean,
      default: false
    },
    age: {
      type: Number,
      min: 13,
      max: 120,
      default: null
    },
    acceptedTerms: {
      type: Boolean,
      default: false
    },
    genres: [{
      type: Schema.Types.ObjectId,
      ref: 'Genre'
    }],

    newContentAlerts: {
      type: Boolean,
      default: true,
    },
    subscriptionAlerts: {
      type: Boolean,
      default: true,
    },
    promotionalNotifications: {
      type: Boolean,
      default: true,
    },

    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    adminRole: {
      type: String,
      enum: Object.values(AdminRole),
      default: null,
      index: true,
    },

    deviceId: { type: String, trim: true },
    deviceType: { type: String, trim: true },
    deviceToken: { type: String, trim: true },
    refreshToken: { type: String },
    rememberMe: { type: Boolean, default: false },
    loginType: { type: String, default: "Mobile" },

    // Login tracking
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastLoginIp: { type: String, default: null },
    lastLoginDevice: { type: String, default: null },
    loginAttempts: { type: Number, default: 0 },
    loginLockUntil: { type: Date, default: null },

    // OTP Limitations
    otpAttempts: { type: Number, default: 0 },
    otpLockUntil: { type: Date, default: null }
  },
  {
    timestamps: true,
    // discriminatorKey: "role",
  },
);

// Indexes for better query performance
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
userSchema.index({
  authProvider: 1
});

//for uniqueness for googleId
// userSchema.index(
//   {
//     googleId: 1
//   },
//   {
//     unique: true,
//     sparse: true
//   }
// );

//for uniqueness for appleId
userSchema.index(
  {
    appleId: 1
  },
  {
    unique: true,
    sparse: true
  }
);

//for uniqueness for mobile and country code
userSchema.index(
  {
    countryCode: 1,
    mobile: 1
  },
  {
    unique: true,
    sparse: true
  }
);

// Auto-increment userId
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "userId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.userId = counter.seq;
    } catch (error) {
      return next(error as Error);
    }
  }

  // Auto-generate fullName if not provided
  if (!this.fullName && (this.firstName || this.lastName)) {
    this.fullName = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }

  next();
});

// Transform Object output to include full CloudFront URL for profileImage
userSchema.set("toObject", {
  transform: function (doc, ret: Record<string, any>) {
    if (ret.profileImage && ret.profileImage.trim() !== '') {
      ret.profileImage = `${config.aws.cloudFrontUrl}/${ret.profileImage}`;
    }
    delete ret.password;
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);
