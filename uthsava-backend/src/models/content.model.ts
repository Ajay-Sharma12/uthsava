import mongoose, { Schema, Document, Types } from "mongoose";

export enum ContentType {
  MOVIE = "MOVIE",
  SERIES = "SERIES",
}

export enum ContentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum AgeCategory {
  KIDS = "KIDS",
  ADULTS = "ADULTS",
}

export enum AgeRating {
  U = "U",
  UA = "U/A",
  A = "A",
  EIGHTEEN_PLUS = "18+",
}

export enum ContentApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DRAFT = 'DRAFT', //for save content without submit
  RE_EDIT_REQUESTED = 'RE_EDIT_REQUESTED', //for re-edit request
  ON_HOLD = 'ON_HOLD', //for 24h quality hold
}

export enum UploadedByType {
  ADMIN = 'ADMIN',
  PRODUCER = 'PRODUCER',
}

export enum ContentTag {
  NEW = 'NEW',
  TRENDING = 'TRENDING',
  TOP_RATED = 'TOP_RATED',
  MOST_VIEWED = 'MOST_VIEWED',
}

export interface ICastCrew {
  name: string;
  role?: string;
  type?: string;
  image: string;
}

export interface IIMDb {
  imdbId?: string;
  url?: string;
  rating?: number;
  voteCount?: number;
  lastSyncedAt?: Date;
}

export interface ISubtitle {
  languageId: Types.ObjectId;
  fileUrl: string;
}

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

export interface IContent extends Document {
  title: string;
  description?: string;
  shortDescription?: string;
  type: ContentType;
  genreIds: Types.ObjectId[];
  languageIds: Types.ObjectId[];
  castCrew?: ICastCrew[];
  releaseYear?: number;
  duration?: number;
  availableQualities?: string[]; // 144p, 240p, 360p...
  subtitles?: ISubtitle[];
  poster?: string[]; // Multiple posters
  thumbnail?: string;
  tags?: (ContentTag | string)[];
  teaserVideo?: string[]; // Multiple videos
  banner?: string[]; // Multiple banners
  mainVideo?: string; //  Single Video
  status: ContentStatus;
  approvalStatus: ContentApprovalStatus;
  rejectionReason?: string;
  ageCategory?: AgeCategory;
  ageRating?: AgeRating;
  censorCertificate?: string;
  uploadedByType: UploadedByType;
  uploadedBy: Types.ObjectId;
  producer?: string;
  director?: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  imdb?: IIMDb;
  releaseDate: Date;
  introStartTime?: number;
  introEndTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  viewsCount?: number;
  submittedAt?: Date;
  submittedBy?: Types.ObjectId;
  approvalDate?: Date;
  approvedBy?: Types.ObjectId;
  approvalNotes?: string;
  lastReviewDate?: Date;
  reviewCount?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  featuredOrder?: number;
  reEditRequestedReason?: string;
  isSubscriptionRequired?: boolean;
  isDownloadEnabled?: boolean;
  freePreviewEnabled: boolean;
  freePreviewDuration: number;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  likesCount?: number;
  isActive?: boolean;
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

const IMDbSchema = new Schema(
  {
    imdbId: {
      type: String,
      trim: true,
      default: null,
    },
    url: {
      type: String,
      trim: true,
      default: null,
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const ContentSchema = new Schema<IContent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: true,
      index: true,
    },
    availableQualities: [
      {
        type: String,
        enum: ['240p', '360p', '480p', '720p', '1080p', '4K'],
      },
    ],
    subtitles: {
      type: Schema.Types.Mixed,
      default: [],
    },
    genreIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Genre',
      },
    ],
    languageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Language',
      },
    ],
    castCrew: [CastCrewSchema],
    releaseYear: {
      type: Number,
      min: 1900,
      max: 3000,
    },
    duration: {
      type: Number,
      default: null,
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
    tags: [
      {
        type: String,
        trim: true,
      }
    ],
    teaserVideo: [
      {
        type: String,
        trim: true
      }
    ],
    mainVideo: {
      type: String,
      default: null,
    },
    imdb: {
      type: IMDbSchema,
      default: null,
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
    status: {
      type: String,
      enum: Object.values(ContentStatus),
      default: ContentStatus.ACTIVE,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(ContentApprovalStatus),
      default: ContentApprovalStatus.PENDING,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    ageCategory: {
      type: String,
      enum: Object.values(AgeCategory),
      default: null,
    },
    ageRating: {
      type: String,
      enum: Object.values(AgeRating),
      default: null,
    },
    censorCertificate: {
      type: String,
      default: null,
    },
    uploadedByType: {
      type: String,
      enum: Object.values(UploadedByType),
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    producer: {
      type: String,
      trim: true,
      default: "",
    },
    director: {
      type: String,
      trim: true,
      default: "",
    },
    totalSeasons: {
      type: Number,
      default: 0,
    },
    totalEpisodes: {
      type: Number,
      default: 0,
    },
    releaseDate: {
      type: Date,
      required: true,
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    lastReviewDate: {
      type: Date,
      default: null,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    reEditRequestedReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    isSubscriptionRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDownloadEnabled: {
      type: Boolean,
      default: false,
      index: true,
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
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 70,
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

ContentSchema.index({
  title: 'text',
});

ContentSchema.index({
  genreIds: 1,
});

ContentSchema.index({
  tag: 1,
});

ContentSchema.index({
  releaseYear: -1,
});

ContentSchema.index({
  uploadedBy: 1,
  uploadedByType: 1,
});

ContentSchema.index({
  createdAt: -1,
});

export const Content = mongoose.model<IContent>(
  'Content',
  ContentSchema
);
