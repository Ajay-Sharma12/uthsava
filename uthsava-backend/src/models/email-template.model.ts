import { Schema, model, Document } from "mongoose";

// @ts-ignore
const mongooseSlugPlugin = require("mongoose-slug-plugin");

export interface IEmailTemplate extends Document {
  title: string;
  subject?: string;
  description: string;
  keyword?: string;
  signature?: string;
  keywordList?: any[];
  slug?: string;
  status: "active" | "inactive";
  createdBy?: any;
  updatedBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      // required: true
    },
    description: {
      type: String,
      required: true,
    },
    keyword: {
      type: String,
      // required: true
    },
    signature: {
      type: String,
      // required: true
    },
    keywordList: [Schema.Types.Mixed],
    slug: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

emailTemplateSchema.plugin(mongooseSlugPlugin, { tmpl: "<%=title%>" });

export const EmailTemplate = model<IEmailTemplate>(
  "emailTemplates",
  emailTemplateSchema,
);
