import { Schema, model, Document } from "mongoose";

export enum FaqStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DELETED = "deleted",
}

export interface IFaq extends Document {
  question: string;
  answer: string;
  status: FaqStatus;
  order: number;
  createdBy?: any;
  updatedBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(FaqStatus),
      default: FaqStatus.ACTIVE,
    },
    order: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
faqSchema.index({ status: 1 });
faqSchema.index({ order: 1 });
faqSchema.index({ createdAt: -1 });
faqSchema.index({ question: "text", answer: "text" });

export const Faq = model<IFaq>("Faq", faqSchema);
