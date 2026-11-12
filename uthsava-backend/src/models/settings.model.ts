import mongoose, { Schema, Document } from 'mongoose';

export interface IRevenueBracket {
  fromViews: number;
  toViews: number;
  amountPerView: number;
}

export interface IPlatformSettings extends Document {
  freePreviewEnabled: boolean;
  freePreviewDuration: number;
  yearlySubscriptionDiscount: number;
  payoutFrequencyDays: number;
  revenueBrackets: IRevenueBracket[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RevenueBracketSchema = new Schema<IRevenueBracket>(
  {
    fromViews: {
      type: Number,
      required: true,
      min: 0,
    },
    toViews: {
      type: Number,
      required: true,
      validate: {
        validator: function (
          this: IRevenueBracket,
          value: number
        ) {
          return value > this.fromViews;
        },
        message:
          'The upper view count (Y) must be greater than the lower view count (X).',
      },
    },
    amountPerView: {
      type: Number,
      required: true,
      min: 0,
    }
  },
  {
    _id: false,
  }
);

const PlatformSettingsSchema =
  new Schema<IPlatformSettings>(
    {
      freePreviewEnabled: {
        type: Boolean,
        default: false,
      },
      freePreviewDuration: {
        type: Number,
        default: 0,
        min: 0,
      },
      revenueBrackets: {
        type: [RevenueBracketSchema],
        default: [],
      },
      payoutFrequencyDays: {
        type: Number,
        default: 90,
        min: 1,
      },
      yearlySubscriptionDiscount: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );


PlatformSettingsSchema.index({
  payoutFrequencyDays: 1,
});

export const PlatformSettings =
  mongoose.model<IPlatformSettings>(
    'PlatformSettings',
    PlatformSettingsSchema
  );
