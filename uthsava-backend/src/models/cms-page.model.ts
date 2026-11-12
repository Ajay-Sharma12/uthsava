import { Schema, model, Document } from "mongoose";

export enum PageStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DELETED = "deleted",
}

export enum PublicationStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

export interface ICmsPage extends Document {
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  bannerImage?: string;
  companyWebsiteUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  publicationStatus: PublicationStatus;
  status: PageStatus;
  createdBy?: any;
  updatedBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const cmsPageSchema = new Schema<ICmsPage>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: { type: String, required: true },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    bannerImage: { type: String, trim: true },
    companyWebsiteUrl: { type: String, trim: true },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    publicationStatus: {
      type: String,
      enum: Object.values(PublicationStatus),
      default: PublicationStatus.DRAFT,
    },
    status: {
      type: String,
      enum: Object.values(PageStatus),
      default: PageStatus.ACTIVE,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
// `slug` field already has `unique: true` which creates an index; avoid duplicate
cmsPageSchema.index({ status: 1 });
cmsPageSchema.index({ createdAt: -1 });
cmsPageSchema.index({ title: "text", content: "text" });

export const CmsPage = model<ICmsPage>("CmsPage", cmsPageSchema);
