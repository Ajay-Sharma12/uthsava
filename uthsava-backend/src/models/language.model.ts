import mongoose, { Schema, Document } from 'mongoose';

export enum LanguageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ILanguage extends Document {
  name: string;
  code?: string;
  contentCount?: number;
  status: LanguageStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const LanguageSchema = new Schema<ILanguage>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: null,
    },
    contentCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(LanguageStatus),
      default: LanguageStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

LanguageSchema.index({
  createdAt: -1,
});

LanguageSchema.index({
  contentCount: -1,
});

LanguageSchema.index({
  name: 'text',
});

export const Language = mongoose.model<ILanguage>(
  'Language',
  LanguageSchema
);