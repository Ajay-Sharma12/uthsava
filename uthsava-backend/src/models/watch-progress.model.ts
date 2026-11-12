import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchProgress extends Document {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  contentId: Types.ObjectId;
  seasonId?: Types.ObjectId;
  episodeId?: Types.ObjectId;
  watchedDuration: number;
  totalDuration: number;
  isCompleted: boolean;
  completedAt?: Date;
  lastWatchedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const WatchProgressSchema = new Schema<IWatchProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: 'Episode',
      default: null,
    },
    episodeId: {
      type: Schema.Types.ObjectId,
      ref: 'Episode',
      default: null,
    },
    //Current watched position in seconds
    watchedDuration: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    //Total content duration in seconds
    totalDuration: {
      type: Number,
      required: true,
      min: 1,
    },
    //True when content is completed
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    //Completion timestamp
    completedAt: {
      type: Date,
      default: null,
    },
    //Last playback activity
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

//One progress record per user + profile + content + season + episode
WatchProgressSchema.index(
  {
    userId: 1,
    profileId: 1,
    contentId: 1,
    seasonId: 1,
    episodeId: 1,
  },
  {
    unique: true,
  }
);

//Continue Watching
WatchProgressSchema.index({
  profileId: 1,
  lastWatchedAt: -1,
});

//Profile Analytics
WatchProgressSchema.index({
  profileId: 1,
  isCompleted: 1,
});

//User Analytics
WatchProgressSchema.index({
  userId: 1,
});

//Content Analytics
WatchProgressSchema.index({
  contentId: 1,
});

//season Analytics
WatchProgressSchema.index({
  seasonId: 1,
});

//Episode Analytics
WatchProgressSchema.index({
  episodeId: 1,
});

export const WatchProgress = mongoose.model<IWatchProgress>(
  'WatchProgress',
  WatchProgressSchema
);