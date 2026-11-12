import Joi from "joi";
import { ContentStatus } from "../../../models/content.model";

// ─── Approve Content ──────────────────────────────────────────────────────────

export const approveContentSchema = Joi.object({
  ageCategory: Joi.string().valid("KIDS", "ADULTS").optional().messages({
    "any.only": "validation.ageCategoryMustBeKidsOrAdults",
  }),
  approvalNotes: Joi.string().trim().max(500).optional().allow("").messages({
    "string.max": "validation.approvalNotesCannotExceed500Characters",
  }),
}).unknown(false);

// ─── Reject Content ───────────────────────────────────────────────────────────

export const rejectContentSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(5).max(500).required().messages({
    "string.min": "validation.rejectionReasonMustBeAtLeast5Characters",
    "string.max": "validation.rejectionReasonCannotExceed500Characters",
    "any.required": "validation.rejectionReasonIsRequired",
  }),
}).unknown(false);

// ─── Hold Content (24h Hold) ──────────────────────────────────────────────────

export const holdContentSchema = Joi.object({
  notes: Joi.string().trim().max(500).optional().allow(""),
  approvalNotes: Joi.string().trim().max(500).optional().allow(""),
}).unknown(true);

// ─── Request Re-Edit ─────────────────────────────────────────────────────────

export const requestReEditSchema = Joi.object({
  reason: Joi.string().trim().max(1000).optional().allow(""),
  reEditRequestedReason: Joi.string().trim().max(1000).optional().allow(""),
  notes: Joi.string().trim().max(1000).optional().allow(""),
}).unknown(true);

// ─── List Pending Approvals (Query Parameters) ────────────────────────────────

export const listPendingApprovalsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "validation.pageMustBeAtLeast1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.min": "validation.limitMustBeAtLeast1",
    "number.max": "validation.limitCannotExceed100",
  }),
  search: Joi.string().trim().max(200).optional().allow(""),
  status: Joi.string()
    .valid("pending", "approved", "rejected", "under_review")
    .optional()
    .messages({
      "any.only":
        "validation.statusMustBeOneOfPendingApprovedRejectedUnderreview",
    }),
  contentType: Joi.string().valid("MOVIE", "SERIES").optional().messages({
    "any.only": "validation.contentTypeMustBeMovieOrSeries",
  }),
  genre: Joi.string().trim().optional(),
  producerId: Joi.string().trim().optional(),
  cast: Joi.string().trim().max(100).optional().allow("").messages({
    "string.max": "validation.castSearchCannotExceed100Characters",
  }),
  tags: Joi.string().trim().optional().allow("").messages({
    "string.pattern.base":
      "validation.tagsMustBeCommaseparatedValuesLikeTrendingnewtoprated",
  }),
  dateFrom: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation.datefromMustBeAValidIsoDateYyyymmdd",
  }),
  dateTo: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation.datetoMustBeAValidIsoDateYyyymmdd",
  }),
  sortBy: Joi.string()
    .valid(
      "createdAt",
      "title",
      "uploadedBy",
      "submissionDate",
      "contentType",
      "producerName",
      "approvalDate",
    )
    .default("createdAt")
    .messages({
      "any.only":
        "validation.sortByMustBeOneOfCreatedatTitleUploadedbySubmissiondateContenttypeProducernameApprovaldate",
    }),
  sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
    "any.only": "validation.sortOrderMustBeAscOrDesc",
  }),
}).unknown(true); // Allow extra params but validate known ones

// ─── List Approval History (Query Parameters) ─────────────────────────────────

export const listApprovalHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "validation.pageMustBeAtLeast1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.min": "validation.limitMustBeAtLeast1",
    "number.max": "validation.limitCannotExceed100",
  }),
  status: Joi.string()
    .valid("APPROVED", "REJECTED", "PENDING")
    .optional()
    .messages({
      "any.only": "validation.statusMustBeApprovedRejectedOrPending",
    }),
  sortBy: Joi.string().valid("date", "status").default("date").messages({
    "any.only": "validation.sortByMustBeOneOfDateStatus",
  }),
  sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
    "any.only": "validation.sortOrderMustBeAscOrDesc",
  }),
}).unknown(true);

// ─── Get Approval Summary (Query Parameters) ──────────────────────────────────

export const getApprovalSummaryQuerySchema = Joi.object({
  dateFrom: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation.datefromMustBeAValidIsoDateYyyymmdd",
  }),
  dateTo: Joi.string().isoDate().optional().messages({
    "string.isoDate": "validation.datetoMustBeAValidIsoDateYyyymmdd",
  }),
}).unknown(true);
