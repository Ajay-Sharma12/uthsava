import mongoose, { Schema, Document, Types } from 'mongoose';

export enum EpisodeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IEpisodeVideo {
  fileName: string;
  originalName?: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  url: string;
}

import { ISubtitle } from './content.model';

const SubtitleSchema = new Schema<ISubtitle>(
  {
    languageId: {
      type: Schema.Types.ObjectId,
      ref: 'Language',
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

export interface IEpisode extends Document {
  contentId: Types.ObjectId;
  seasonId: Types.ObjectId;
  title: string;
  description?: string;
  duration?: number;
  episodeNumber: number;
  thumbnail?: string;
  video?: IEpisodeVideo;
  status: EpisodeStatus;
  createdAt?: Date;
  updatedAt?: Date;
  availableQualities?: string[];
  audioLanguages?: Types.ObjectId[];
  subtitles?: ISubtitle[];
  introStartTime?: number;
  introEndTime?: number;
  adsEnables?: boolean;
  freePreviewEnabled: boolean;
  freePreviewDuration: number;
  releaseDate: Date;
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: 'Season',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    introStartTime: {
      type: Number,
      default: null,
      min: 0,
    },
    introEndTime: {
      type: Number,
      default: null,
      min: 0,
    },
    availableQualities: [
      {
        type: String,
        enum: ['240p', '360p', '480p', '720p', '1080p', '4K'],
      },
    ],
    subtitles: [SubtitleSchema],
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    duration: {
      type: Number,
      default: null,
    },
    episodeNumber: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    video: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: EpisodeStatus.ACTIVE,
      index: true,
    },
    adsEnables: {
      type: Boolean,
      default: false,
    },
    freePreviewEnabled: {
      type: Boolean,
      default: false,
    },
    freePreviewDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    releaseDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

EpisodeSchema.index({
  contentId: 1,
  seasonId: 1,
  episodeNumber: 1,
});

EpisodeSchema.index({
  title: 'text',
});

export const Episode = mongoose.model<IEpisode>(
  'Episode',
  EpisodeSchema
);
