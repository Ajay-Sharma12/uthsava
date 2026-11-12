import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchList extends Document {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  contentId: Types.ObjectId;
  addedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const WatchListSchema = new Schema<IWatchList>(
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
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

//Prevent duplicate watchlist entries
WatchListSchema.index(
  {
    profileId: 1,
    contentId: 1,
  },
  {
    unique: true,
  }
);

//Recently Added Sorting
WatchListSchema.index({
  profileId: 1,
  addedAt: -1,
});

//User Analytics
WatchListSchema.index({
  userId: 1,
});

export const Watchlist = mongoose.model<IWatchList>(
  'Watchlist',
  WatchListSchema
);