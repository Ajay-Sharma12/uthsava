import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ProfileType {
  STANDARD = 'STANDARD',
  KIDS = 'KIDS',
}

export interface IUserProfile extends Document {
  userId: Types.ObjectId;
  displayName: string;
  profilePicture?: string;
  profileType: ProfileType;
  preferredLanguageIds: Types.ObjectId[];
  favoriteGenreIds: Types.ObjectId[];
  notificationEnabled: boolean;
  avatarId?: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    profileType: {
      type: String,
      enum: Object.values(ProfileType),
      default: ProfileType.STANDARD,
      index: true,
    },
    preferredLanguageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Language',
        required: true,
      },
    ],
    favoriteGenreIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Genre',
        required: true,
      },
    ],
    /**
     * For default avatar library support
     * Example:
     * avatar_1
     * avatar_2
     * avatar_kids_1
     */
    avatarId: {
      type: String,
      default: null,
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


//Profile listing by user
UserProfileSchema.index({
  userId: 1,
});

//Profile switcher optimization
UserProfileSchema.index({
  userId: 1,
  profileType: 1,
});

//Search profile
UserProfileSchema.index({
  displayName: 'text',
});

//Prevent duplicate display names for same account
UserProfileSchema.index(
  {
    userId: 1,
    displayName: 1,
  },
  {
    unique: true,
  }
);

export const UserProfile = mongoose.model<IUserProfile>(
  'UserProfile',
  UserProfileSchema
);