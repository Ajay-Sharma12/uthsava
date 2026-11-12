import mongoose, { Schema, Document, Types } from 'mongoose';

import { ICastCrew } from './content.model';

export interface ISeason extends Document {
  contentId: Types.ObjectId;
  seasonNumber: number;
  title?: string;
  description?: string;
  totalEpisodes?: number;
  castCrew?: ICastCrew[];
  releaseYear?: number;
  poster?: string[]; // Multiple posters
  thumbnail?: string;
  teaserVideo?: string[]; // Multiple videos
  banner?: string[]; // Multiple banners
  status?: string;
  duration?: number;
  releaseDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CastCrewSchema = new Schema<ICastCrew>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ['Cast', 'Crew', 'CAST', 'CREW'],
      default: 'Cast',
    },
    image: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const SeasonSchema = new Schema<ISeason>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
    },
    seasonNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    totalEpisodes: {
      type: Number,
      default: 0,
    },
    castCrew: [CastCrewSchema],
    releaseYear: {
      type: Number,
      min: 1900,
      max: 3000,
    },
    poster: [
      {
        type: String,
        trim: true
      }
    ],
    banner: [
      {
        type: String,
        trim: true
      }
    ],
    thumbnail: {
      type: String,
      default: null,
    },
    teaserVideo: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      default: 'ACTIVE',
      index: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    releaseDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SeasonSchema.index({
  contentId: 1,
  seasonNumber: 1,
});

export const Season = mongoose.model<ISeason>(
  'Season',
  SeasonSchema
);
