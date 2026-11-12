import mongoose, { Schema, Document, Types } from 'mongoose';


export interface IProducerProfile extends Document {
    userId: Types.ObjectId;
    companyName: string;
    description: string;
    gstNumber?: string;
    logo?: string;

    website?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;

    verificationDocuments: string[];
    signedContract?: string;
    bankAccountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    payoutFrequency?: string;
    revenueShare?: number;
}

const ProducerProfileSchema =
    new Schema<IProducerProfile>(
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                unique: true,
                index: true,
            },
            companyName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200,
            },
            description: {
                type: String,
                trim: true,
                maxlength: 500,
                default: null,
            },
            gstNumber: {
                type: String,
                trim: true,
                uppercase: true,
                default: null,
            },
            logo: {
                type: String,
                default: null,
            },
            verificationDocuments: [
                {
                    type: String,
                    trim: true,
                },
            ],
            signedContract: {
                type: String,
                default: null,
            },
            bankAccountHolderName: {
                type: String,
                trim: true,
                default: null,
            },
            bankName: {
                type: String,
                trim: true,
                default: null,
            },
            accountNumber: {
                type: String,
                trim: true,
                default: null,
            },
            ifscCode: {
                type: String,
                trim: true,
                uppercase: true,
                default: null,
            },
            payoutFrequency: {
                type: String,
                trim: true,
                enum: ['weekly', 'monthly', 'yearly'],
                default: 'monthly',
            },
            revenueShare: {
                type: Number,
                default: 50,
                min: 0,
                max: 100
            },
website: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
},

country: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
},

state: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
},

city: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
},

address: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
},
        },
        {
            timestamps: true,
        }
    );

ProducerProfileSchema.index({
    companyName: 'text',
});

export const ProducerProfile =
    mongoose.model<IProducerProfile>(
        'ProducerProfile',
        ProducerProfileSchema
    );