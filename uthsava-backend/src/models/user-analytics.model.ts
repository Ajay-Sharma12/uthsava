import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserAnalytics extends Document {
    userId: Types.ObjectId;
    totalWatchDuration: number;
    totalMoviesWatched: number;
    totalEpisodesWatched: number;
    totalCompletedMovies: number;
    totalCompletedEpisodes: number;
    totalWatchlistItems: number;
    totalDownloads: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const UserAnalyticsSchema = new Schema<IUserAnalytics>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        totalWatchDuration: {
            type: Number,
            default: 0,
            min: 0,
        },
        //should be unique like one count for one movie
        totalMoviesWatched: {
            type: Number,
            default: 0,
            min: 0,
        },
        //should be unique like one count for one episode
        totalEpisodesWatched: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCompletedMovies: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCompletedEpisodes: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalWatchlistItems: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalDownloads: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

UserAnalyticsSchema.index({
    totalWatchDuration: -1,
});

export const UserAnalytics = mongoose.model<IUserAnalytics>(
    'UserAnalytics',
    UserAnalyticsSchema
);