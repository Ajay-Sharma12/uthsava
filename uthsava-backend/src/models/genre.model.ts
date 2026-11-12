import mongoose, { Schema, Document, Types } from 'mongoose';

export enum GenreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum type {
  CATEGORY = "category",
  GENRE = "genre",
}

export interface IGenre extends Document {
  name: string;
  type: type;
  slug: string;
  icon: string;
  description?: string;
  displayOrder: number;
  contentCount: number;
  status: GenreStatus;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  seoTitle?: string;
  seoDescription?: string;
}

const GenreSchema = new Schema<IGenre>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: Object.values(type),
      required: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    // we can increment this count when any content created under this genre so no need to run queries for it on CMS.
    contentCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(GenreStatus),
      default: GenreStatus.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate names within the same type
GenreSchema.index(
  {
    name: 1,
    type: 1,
  },
  {
    unique: true,
  }
);

// Search by keyword
GenreSchema.index({
  name: 'text',
});

// Filter by status
GenreSchema.index({
  status: 1,
});

//Sort by display order
GenreSchema.index({
  displayOrder: 1,
});

//Sort by content count
GenreSchema.index({
  contentCount: -1,
});

//Filter by created date
GenreSchema.index({
  createdAt: -1,
});

export const Genre = mongoose.model<IGenre>(
  'Genre',
  GenreSchema
);