import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AuditModule {
    USERS = 'USERS',
    CONTENT = 'CONTENT',
    PRODUCERS = 'PRODUCERS',
    SUBSCRIPTIONS = 'SUBSCRIPTIONS',
    PAYMENTS = 'PAYMENTS',
    COUPONS = 'COUPONS',
    NOTIFICATIONS = 'NOTIFICATIONS',
    SETTINGS = 'SETTINGS',
    GENRES = 'GENRES',
    CATEGORIES = 'CATEGORIES',
    LANGUAGES = 'LANGUAGES',
    TUTORIALS = 'TUTORIALS',
    AUTH = 'AUTH',
    SUB_ADMINS = 'SUB_ADMINS',
    ROLES = 'ROLES',
    CMS = 'CMS',
    FAQS = 'FAQS',
    EMAIL_TEMPLATES = 'EMAIL_TEMPLATES',
    BANNERS = 'BANNERS',
    AWARDS = 'AWARDS',
}

export enum AuditStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface IAuditLog extends Document {
    adminId?: Types.ObjectId | null;
    module: AuditModule;
    action: string;
    entityId?: Types.ObjectId | null;
    oldData?: Record<string, any>;
    newData?: Record<string, any>;
    ipAddress?: string;
    device?: string;
    status: AuditStatus;
    failureReason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            default: null,
            index: true,
        },
        module: {
            type: String,
            enum: Object.values(AuditModule),
            required: true,
            index: true,
        },

        /**
         * Action Name
         * Examples:
         * Create User
         * Approve Content
         * Suspend User
         * Delete Coupon
         */
        action: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        /**
         * Affected Record
         */
        entityId: {
            type: Schema.Types.ObjectId,
            default: null,
        },

        /**
         * Before Update Snapshot
         */
        oldData: {
            type: Schema.Types.Mixed,
            default: null,
        },

        /**
         * After Update Snapshot
         */
        newData: {
            type: Schema.Types.Mixed,
            default: null,
        },

        /**
         * Request IP
         */
        ipAddress: {
            type: String,
            default: null,
            trim: true,
        },

        /**
         * Example:
         * Mac - Chrome
         * Win - Edge
         * iPhone - Safari
         */
        device: {
            type: String,
            default: null,
            trim: true,
        },

        /**
         * Success / Failed
         */
        status: {
            type: String,
            enum: Object.values(AuditStatus),
            default: AuditStatus.SUCCESS,
        },

        /**
         * Failure Reason
         */
        failureReason: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

AuditLogSchema.index({
    module: 1,
    createdAt: -1,
});

AuditLogSchema.index({
    adminId: 1,
    createdAt: -1,
});

AuditLogSchema.index({
    entityId: 1,
});

AuditLogSchema.index({
    status: 1,
});

export const AuditLog = mongoose.model<IAuditLog>(
    'AuditLog',
    AuditLogSchema
);