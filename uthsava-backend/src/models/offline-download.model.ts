import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DownloadStatus {
    QUEUED = 'QUEUED',
    DOWNLOADING = 'DOWNLOADING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
    DELETED = 'DELETED',
}

export interface IOfflineDownload extends Document {
    userId: Types.ObjectId;
    profileId: Types.ObjectId;
    contentId: Types.ObjectId;
    seasonId?: Types.ObjectId;
    episodeId?: Types.ObjectId;
    deviceId: string;
    status: DownloadStatus;
    downloadedAt?: Date;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const OfflineDownloadSchema =
    new Schema<IOfflineDownload>(
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
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
            seasonId: {
                type: Schema.Types.ObjectId,
                ref: 'Season',
                default: null,
            },
            episodeId: {
                type: Schema.Types.ObjectId,
                ref: 'Episode',
                default: null,
            },
            deviceId: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            status: {
                type: String,
                enum: Object.values(DownloadStatus),
                default: DownloadStatus.QUEUED,
                index: true,
            },
            downloadedAt: {
                type: Date,
                default: null,
            },
            //Netflix expires downloads after 30 days
            expiresAt: {
                type: Date,
                default: null,
                index: true,
            },
        },
        {
            timestamps: true,
        }
    );

OfflineDownloadSchema.index(
    {
        profileId: 1,
        contentId: 1,
        seasonId: 1,
        episodeId: 1,
        deviceId: 1,
    },
    {
        unique: true,
    }
);

export const OfflineDownload =
    mongoose.model<IOfflineDownload>(
        'OfflineDownload',
        OfflineDownloadSchema
    );