import { Request, Response } from "express";
import { ContentApprovalService } from "../services/content-approval.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";
import { EmailTemplate } from "../../../models/email-template.model";
import { sendMail } from "../../shared/services/mail.service";
import { getAdminBaseUrl, resolveMediaUrl } from "../../shared/helpers/url.helper";
import { getFullLanguageName } from "../../shared/helpers/language-name.helper";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * GET /api/v1/admin/contents/approvals/pending
 * List all pending content approvals with pagination and filters
 */
export const listPendingApprovals = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const {
      page = 1,
      limit = 10,
      search,
      contentType,
      genre,
      producerId,
      status,
      cast,
      tags,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await ContentApprovalService.getPendingApprovals(
      Number(page),
      Number(limit),
      {
        search: typeof search === "string" ? search : undefined,
        contentType: typeof contentType === "string" ? contentType : undefined,
        genre: typeof genre === "string" ? genre : undefined,
        producerId: typeof producerId === "string" ? producerId : undefined,
        status: typeof status === "string" ? status : undefined,
        cast: typeof cast === "string" ? cast : undefined,
        tags: typeof tags === "string" ? tags : undefined,
        dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
        dateTo: typeof dateTo === "string" ? dateTo : undefined,
        sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
        sortOrder: typeof sortOrder === "string" ? sortOrder : "desc",
      },
    );
    // Transform the data to match frontend expectations
    const transformedData = result.data.map((content: any) => {
      // Get uploader info from the lookup result (it's an array, get the first element)
      const uploaderInfo =
        Array.isArray(content.uploaderInfo) && content.uploaderInfo.length > 0
          ? content.uploaderInfo[0]
          : null;

      // Get genres from the lookup result
      const genreDetails = content.genreDetails || [];

      return {
        _id: content._id,
        id: content._id,
        contentId: content._id,

        title: content.title,

        contentType: content.type?.toLowerCase() || "movie",

        genre: genreDetails.map((g: any) => g.name || g) || [],

        producerName:
          (content.producer && String(content.producer).trim() && String(content.producer).trim() !== "Studio")
            ? String(content.producer).trim()
            : (uploaderInfo && (uploaderInfo.fullName || uploaderInfo.name)) ||
              content.producer ||
              "Producer",

        producer: {
          _id: uploaderInfo?._id,
          id: uploaderInfo?._id,
          name:
            (content.producer && String(content.producer).trim() && String(content.producer).trim() !== "Studio")
              ? String(content.producer).trim()
              : (uploaderInfo && (uploaderInfo.fullName || uploaderInfo.name)) ||
                content.producer ||
                "Producer",
          email: uploaderInfo?.email,
        },

        submissionDate: content.submittedAt || (content as any).submissionDate || content.createdAt,

        approvalStatus: content.approvalStatus || (content.rejectionReason ? "REJECTED" : "PENDING"),
        status: content.approvalStatus?.toLowerCase() === "re_edit_requested"
          ? "re_edit_requested"
          : content.approvalStatus?.toLowerCase() === "on_hold"
            ? "on_hold"
            : (content.approvalStatus?.toLowerCase() === "rejected" || content.rejectionReason)
              ? "rejected"
              : (content.approvalStatus?.toLowerCase() || "pending"),
        holdUntil: (content as any).holdUntil || null,
        totalEpisodes: (content as any).totalEpisodes || 0,
        totalSeasons: (content as any).totalSeasons || 0,
        seasons: (content as any).seasons || [],
        createdAt: content.createdAt,

        language: (Array.isArray((content as any).language) && (content as any).language.length > 0
          ? (content as any).language
          : ((content as any).languageIds || ["Hindi"])
        ).map((l: any) => {
          const val = typeof l === "object" ? l?.name || l?.code || "" : String(l);
          return getFullLanguageName(val, val);
        }),

        duration: content.duration,

        releaseYear: content.releaseYear,

        posterUrl: resolveMediaUrl((content as any).posterImage || (Array.isArray(content.poster) ? content.poster[0] : content.poster) || content.thumbnail),
        thumbnailUrl: resolveMediaUrl(content.thumbnail),
        mainVideoUrl: resolveMediaUrl(content.mainVideo) || resolveMediaUrl(Array.isArray(content.teaserVideo) ? content.teaserVideo[0] : content.teaserVideo),
        teaserVideoUrl: resolveMediaUrl(Array.isArray(content.teaserVideo) ? content.teaserVideo[0] : content.teaserVideo),
        description: content.description || content.shortDescription || "",
        shortDescription: content.shortDescription || "",
        castAndCrew: content.castCrew || [],
        rejectionReason: content.rejectionReason,
        reEditRequestedReason: (content as any).reEditRequestedReason,

        ageCategory: content.ageCategory?.toLowerCase(),

        approvalNotes: content.approvalNotes,

        reviewCount: content.reviewCount || 0,

        lastReviewDate: content.lastReviewDate,
      };
    });

    return ResponseHandler.success(
      res,
      {
        data: transformedData,
        pagination: result.pagination,
      },
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("List pending approvals error:", error);

    const lang = getLanguage(req);

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * GET /api/v1/admin/contents/:contentId/approval-details
 * Get content details for approval review
 */
export const getContentForApproval = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    const content = await ContentApprovalService.getContentForApproval(contentId);

    // Get uploader info from lookup
    const uploadedBy = (content as any).uploaderInfo?.[0] || (content as any).uploadedBy;

    const firstEpisodeVideo = (content as any).seasons?.[0]?.episodes?.[0]?.videoUrl || (content as any).seasons?.[0]?.episodes?.[0]?.videoFile;
    const resolvedFirstEpVideo = resolveMediaUrl(typeof firstEpisodeVideo === "object" ? firstEpisodeVideo?.url : firstEpisodeVideo) || (typeof firstEpisodeVideo === "string" ? firstEpisodeVideo : null);

    // Transform the data to match frontend expectations
    const transformedContent = {
      _id: content._id,
      id: content._id,
      contentId: content._id,
      title: content.title,
      description: content.description || content.shortDescription || "",
      shortDescription: content.shortDescription || "",
      contentType: content.type?.toLowerCase() || "movie",
      genre: (content.genreIds || []).map((g: any) => g.name || g) || [],
      language: ((content.languageIds && content.languageIds.length > 0)
        ? content.languageIds
        : (Array.isArray((content as any).language) && (content as any).language.length > 0)
          ? (content as any).language
          : ["Hindi"]
      ).map((l: any) => {
        const val = typeof l === "object" ? l?.name || l?.code || "" : String(l);
        return getFullLanguageName(val, val);
      }),
      releaseYear: content.releaseYear,
      duration: content.duration,
      posterUrl: resolveMediaUrl((content.poster && content.poster[0]) || (content as any).posterImage || content.thumbnail) || "",
      thumbnailUrl: resolveMediaUrl(content.thumbnail) || "",
      mainVideoUrl: resolveMediaUrl(content.mainVideo) || resolvedFirstEpVideo || resolveMediaUrl((content.teaserVideo && content.teaserVideo[0])) || "",
      teaserVideoUrl: resolveMediaUrl((content.teaserVideo && content.teaserVideo[0])) || null,
      castAndCrew: content.castCrew || [],
      tags: content.tags || [],
      seasons: (content as any).seasons || [],
      submissionDate: content.submittedAt || (content as any).submissionDate || content.createdAt,
      createdAt: content.createdAt,
      producerName:
        (content.producer && String(content.producer).trim() && String(content.producer).trim() !== "Studio")
          ? String(content.producer).trim()
          : (uploadedBy && (uploadedBy.fullName || uploadedBy.name)) ||
            content.producer ||
            "Producer",
      uploadedBy: uploadedBy
        ? {
            _id: uploadedBy._id,
            id: uploadedBy._id,
            name:
              (content.producer && String(content.producer).trim() && String(content.producer).trim() !== "Studio")
                ? String(content.producer).trim()
                : (uploadedBy.fullName || uploadedBy.name || "Producer"),
            email: uploadedBy.email,
            role: uploadedBy.role,
          }
        : (content.producer ? { name: content.producer } : null),
      producer: {
        _id: uploadedBy?._id,
        id: uploadedBy?._id,
        name:
          (content.producer && String(content.producer).trim() && String(content.producer).trim() !== "Studio")
            ? String(content.producer).trim()
            : (uploadedBy && (uploadedBy.fullName || uploadedBy.name)) ||
              content.producer ||
              "Producer",
        email: uploadedBy?.email,
      },
      approvalStatus: content.approvalStatus || (content.rejectionReason ? "REJECTED" : "PENDING"),
      status: content.approvalStatus?.toLowerCase() === "re_edit_requested"
        ? "re_edit_requested"
        : content.approvalStatus?.toLowerCase() === "on_hold"
          ? "on_hold"
          : (content.rejectionReason
            ? "rejected"
            : content.approvalStatus?.toLowerCase() || "pending"),
      holdUntil: (content as any).holdUntil || null,
      rejectionReason: content.rejectionReason || (content as any).reEditRequestedReason,
      reEditRequestedReason: (content as any).reEditRequestedReason,
      ageCategory: content.ageCategory?.toLowerCase(),
      approvalNotes: content.approvalNotes,
    };

    return ResponseHandler.success(
      res,
      transformedContent,
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Get content for approval error:", error);

    const lang = getLanguage(req);

    if (error.message === "error.contentNotFound") {
      return ResponseHandler.notFound(res, "general.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PATCH /api/v1/admin/contents/:contentId/approve
 * Approve pending content
 * Body: { ageCategory?: 'KIDS' | 'ADULTS', approvalNotes?: string }
 */
export const approveContent = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const { contentId } = req.params;

    const { ageCategory, approvalNotes } = req.body;

    const adminId = req.user?.sub;

    if (!adminId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const updated = await ContentApprovalService.approveContent(
      contentId,
      adminId,
      ageCategory,
      approvalNotes,
    );

    AuditLogService.logAction({
      adminId,
      module: AuditModule.CONTENT,
      action: "Approve Content",
      entityId: contentId,
      newData: { ageCategory, approvalNotes, approvalStatus: "APPROVED" },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    // ── Content approval email ────────────────────────────────
    if (updated && updated.uploadedBy) {
      const producer: any = updated.uploadedBy;
      if (producer.email) {
        try {
          const emailTemplate = await EmailTemplate.findOne({ keyword: "CONTENT_APPROVAL" });
          const frontendUrl = getAdminBaseUrl(req);
          const contentTitle = updated.title || "";
          const approvedDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "medium" });

          const isSeries = (updated.type || "").toUpperCase() === "SERIES";
          const viewUrl = isSeries
            ? `${frontendUrl}/series?contentId=${updated._id}`
            : `${frontendUrl}/content-manager?contentId=${updated._id}`;

          let emailSubject = emailTemplate?.subject || "Content Approved - Uthsava";
          let emailBody = emailTemplate?.description || "";

          // Fallback or legacy plain text replacement
          if (!emailBody || !emailBody.includes("<a ") || emailBody.includes("https://uthsava.com")) {
            emailBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h2 style="color: #28a745;">Your Content Has Been Approved</h2>
                <p>Hello,</p>
                <p>Great news! Your submitted content <strong>{{Content Title}}</strong> has been reviewed and approved on {{Approved Date}}.</p>
                <p><a href="{{Platform URL}}" style="display: inline-block; padding: 12px 24px; background-color: #e50914; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Content</a></p>
              </div>
            `;
          }

          emailSubject = emailSubject
            .replaceAll("{{Platform Name}}", "Uthsava")
            .replaceAll("{{platformName}}", "Uthsava")
            .replaceAll("{{Content Title}}", contentTitle)
            .replaceAll("{{contentTitle}}", contentTitle)
            .replaceAll("{{title}}", contentTitle);

          emailBody = emailBody
            .replaceAll("https://uthsava.com", viewUrl)
            .replaceAll("{{Platform Name}}", "Uthsava")
            .replaceAll("{{platformName}}", "Uthsava")
            .replaceAll("{{Content Title}}", contentTitle)
            .replaceAll("{{contentTitle}}", contentTitle)
            .replaceAll("{{title}}", contentTitle)
            .replaceAll("{{Approved Date}}", approvedDate)
            .replaceAll("{{approvedDate}}", approvedDate)
            .replaceAll("{{date}}", approvedDate)
            .replaceAll("{{Platform URL}}", viewUrl)
            .replaceAll("{{platformUrl}}", viewUrl)
            .replaceAll("{{Content Link}}", viewUrl)
            .replaceAll("{{contentLink}}", viewUrl)
            .replaceAll("{{Login URL}}", frontendUrl)
            .replaceAll("{{loginUrl}}", frontendUrl);

          await sendMail(producer.email, emailSubject, emailBody);
          logger.info(`Content approval email sent to: ${producer.email}`);
        } catch (err: any) {
          logger.error("Failed to process CONTENT_APPROVAL email:", err);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return ResponseHandler.success(
      res,
      updated,
      "content.approved",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Approve content error:", error);

    const lang = getLanguage(req);

    if (error.message === "error.contentNotFound") {
      return ResponseHandler.notFound(res, "general.notFound", lang);
    }

    if (error.message === "error.contentIsAlreadyApproved") {
      return ResponseHandler.conflict(res, error.message, lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PATCH /api/v1/admin/contents/:contentId/reject
 * Reject pending content
 * Body: { rejectionReason: string }
 */
export const rejectContent = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const { contentId } = req.params;

    const { rejectionReason } = req.body;

    const adminId = req.user?.sub;

    if (!adminId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    if (!rejectionReason || rejectionReason.trim().length < 5) {
      return ResponseHandler.validationError(
        res,
        {
          rejectionReason:
            "Rejection reason is required and must be at least 5 characters",
        },
        "validation.failed",
        lang,
      );
    }

    const updated = await ContentApprovalService.rejectContent(
      contentId,
      adminId,
      rejectionReason,
    );

    // ── Content rejection email ────────────────────────────────
    if (updated && updated.uploadedBy) {
      const producer: any = updated.uploadedBy;
      if (producer.email) {
        try {
          const emailTemplate = await EmailTemplate.findOne({ keyword: "CONTENT_REJECTION" });
          const adminBaseUrl = getAdminBaseUrl(req);
          const editUrl = `${adminBaseUrl}/content-manager?contentId=${updated._id}`;
          const contentTitle = updated.title || "";

          let emailSubject = emailTemplate?.subject || "Content Rejection Notice - Uthsava";
          let emailBody = emailTemplate?.description || `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
              <h2 style="color: #e50914;">Content Submission Update</h2>
              <p>Hello,</p>
              <p>Your content <strong>${contentTitle}</strong> has been rejected during review.</p>
              <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #e50914; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Reason for Rejection:</strong> ${rejectionReason}</p>
              </div>
              <p>You can edit and resubmit your content by clicking below:</p>
              <p><a href="${editUrl}" style="display: inline-block; padding: 10px 20px; background-color: #e50914; color: #fff; text-decoration: none; border-radius: 4px;">Edit & Resubmit Content</a></p>
            </div>
          `;

          emailSubject = emailSubject
            .replaceAll("{{Platform Name}}", "Uthsava")
            .replaceAll("{{platformName}}", "Uthsava")
            .replaceAll("{{Content Title}}", contentTitle)
            .replaceAll("{{contentTitle}}", contentTitle)
            .replaceAll("{{title}}", contentTitle);
            
          emailBody = emailBody
            .replaceAll("{{Platform Name}}", "Uthsava")
            .replaceAll("{{platformName}}", "Uthsava")
            .replaceAll("{{Content Title}}", contentTitle)
            .replaceAll("{{contentTitle}}", contentTitle)
            .replaceAll("{{title}}", contentTitle)
            .replaceAll("{{Rejection Reason}}", rejectionReason)
            .replaceAll("{{rejectionReason}}", rejectionReason)
            .replaceAll("{{reason}}", rejectionReason)
            .replaceAll("{{Edit & Resubmit URL}}", editUrl)
            .replaceAll("{{Edit and Resubmit URL}}", editUrl)
            .replaceAll("{{editUrl}}", editUrl)
            .replaceAll("{{Platform URL}}", adminBaseUrl);

          await sendMail(
            producer.email,
            emailSubject,
            emailBody,
          );
          logger.info(`Content rejection email sent to: ${producer.email}`);
        } catch (err: any) {
          logger.error("Failed to process CONTENT_REJECTION email:", err);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    AuditLogService.logAction({
      adminId,
      module: AuditModule.CONTENT,
      action: "Reject Content",
      entityId: contentId,
      newData: { rejectionReason, approvalStatus: "REJECTED" },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      updated,
      "content.rejected",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Reject content error:", error);

    const lang = getLanguage(req);

    if (error.message === "error.contentNotFound") {
      return ResponseHandler.notFound(res, "general.notFound", lang);
    }

    if (error.message?.includes("must be at least 5 characters")) {
      return ResponseHandler.validationError(
        res,
        {
          rejectionReason: error.message,
        },
        "validation.failed",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PATCH /api/v1/admin/contents/:contentId/hold
 * Put content on 24h quality hold
 */
export const holdContent = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;
    const { notes, approvalNotes } = req.body || {};
    const adminId = req.user?.sub;

    if (!adminId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const updated = await ContentApprovalService.holdContent(
      contentId,
      adminId,
      notes || approvalNotes,
    );

    AuditLogService.logAction({
      adminId,
      module: AuditModule.CONTENT,
      action: "Hold Content",
      entityId: contentId,
      newData: { approvalNotes: notes || approvalNotes },
      req,
    }).catch((err) => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      updated,
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Hold content error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      error.message || "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PATCH /api/v1/admin/contents/:contentId/request-reedit
 * Request re-edit from producer
 */
export const requestReEdit = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;
    const { reason, reEditRequestedReason, notes } = req.body || {};
    const adminId = req.user?.sub;

    if (!adminId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const feedback = reason || reEditRequestedReason || notes || "Re-edit requested by administrator";

    const updated = await ContentApprovalService.requestReEditContent(
      contentId,
      adminId,
      feedback,
    );

    AuditLogService.logAction({
      adminId,
      module: AuditModule.CONTENT,
      action: "Request Re-edit",
      entityId: contentId,
      newData: { reEditRequestedReason: feedback, approvalStatus: "RE_EDIT_REQUESTED" },
      req,
    }).catch((err) => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      updated,
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Request re-edit error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      error.message || "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * PATCH /api/v1/producer/contents/:contentId/submit-for-review
 * Producer submits content for admin review
 * Changes status from DRAFT or REJECTED to PENDING
 */
export const submitForReview = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;
    const producerId = req.user?.sub;

    if (!producerId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const updated = await ContentApprovalService.submitForReview(
      contentId,
      producerId,
    );

    return ResponseHandler.success(
      res,
      { content: updated },
      "content.submitted_for_review",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Submit for review error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.contentNotFound") {
      return ResponseHandler.notFound(res, "content.not_found", lang);
    }

    if (error.message === "error.cannotSubmitOthersContent") {
      return ResponseHandler.forbidden(
        res,
        "error.cannotSubmitOthersContent",
        lang,
      );
    }

    if (error.message === "error.canOnlySubmitDraftOrRejectedContent") {
      return ResponseHandler.conflict(
        res,
        "error.canOnlySubmitDraftOrRejectedContent",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * GET /api/v1/admin/contents/:contentId/approval-history
 * Get approval history for specific content
 */
// export const getContentApprovalHistory = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {
//   try {
//     const lang = getLanguage(req);

//     const { contentId } = req.params;

//     const { page = 1, limit = 10, status, sortOrder } = req.query;

//     const result = await ContentApprovalService.getContentApprovalHistory(
//       contentId,
//       Number(page),
//       Number(limit),
//       {
//         status: status ? String(status) : undefined,

//         sortOrder: sortOrder ? String(sortOrder) : "desc",
//       },
//     );

//     return ResponseHandler.success(
//       res,
//       result,
//       "general.success",
//       lang,
//       HTTP_STATUS.OK,
//     );
//   } catch (error: any) {
//     logger.error("Get approval history error:", error);

//     const lang = getLanguage(req);

//     if (error.message === "error.contentNotFound") {
//       return ResponseHandler.notFound(res, "general.notFound", lang);
//     }

//     return ResponseHandler.error(
//       res,
//       "general.error",
//       lang,
//       HTTP_STATUS.INTERNAL_SERVER_ERROR,
//       error,
//     );
//   }
// };

/**
 * GET /api/v1/admin/contents/approvals/summary
 * Get approval statistics summary
 */
export const getApprovalSummary = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const { dateFrom, dateTo } = req.query;

    let startDate: Date | undefined;

    let endDate: Date | undefined;

    if (dateFrom && typeof dateFrom === "string") {
      startDate = new Date(dateFrom);

      if (isNaN(startDate.getTime())) {
        return ResponseHandler.validationError(
          res,
          {
            dateFrom: "Invalid date format. Use YYYY-MM-DD",
          },
          "validation.failed",
          lang,
        );
      }
    }

    if (dateTo && typeof dateTo === "string") {
      endDate = new Date(dateTo);

      if (isNaN(endDate.getTime())) {
        return ResponseHandler.validationError(
          res,
          {
            dateTo: "Invalid date format. Use YYYY-MM-DD",
          },
          "validation.failed",
          lang,
        );
      }

      endDate.setHours(23, 59, 59, 999);
    }

    const summary = await ContentApprovalService.getApprovalSummary(
      startDate,
      endDate,
    );

    return ResponseHandler.success(
      res,
      summary,
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Get approval summary error:", error);

    const lang = getLanguage(req);

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * GET /api/v1/admin/contents/approvals/stats
 * Get approval statistics for date range
 */
export const getApprovalStats = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const { dateFrom, dateTo } = req.query;

    let startDate: Date | undefined;

    let endDate: Date | undefined;

    if (dateFrom && typeof dateFrom === "string") {
      startDate = new Date(dateFrom);

      if (isNaN(startDate.getTime())) {
        return ResponseHandler.validationError(
          res,
          {
            dateFrom: "Invalid date format. Use YYYY-MM-DD",
          },
          "validation.failed",
          lang,
        );
      }
    }

    if (dateTo && typeof dateTo === "string") {
      endDate = new Date(dateTo);

      if (isNaN(endDate.getTime())) {
        return ResponseHandler.validationError(
          res,
          {
            dateTo: "Invalid date format. Use YYYY-MM-DD",
          },
          "validation.failed",
          lang,
        );
      }

      endDate.setHours(23, 59, 59, 999);
    }

    const stats = await ContentApprovalService.getApprovalStats(
      startDate,
      endDate,
    );

    return ResponseHandler.success(
      res,
      { stats },
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Get approval stats error:", error);

    const lang = getLanguage(req);

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Revoke re-edit request and move content back to PENDING review
 * PATCH /api/v1/admin/contents/:contentId/revoke-reedit
 */
export const revokeReEdit = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;
    const { notes } = req.body || {};
    const adminId = (req as any).user?.sub || (req as any).user?._id || "system";

    const updated = await ContentApprovalService.revokeReEditContent(
      contentId,
      adminId,
      notes,
    );

    AuditLogService.logAction({
      adminId,
      module: AuditModule.CONTENT,
      action: "Revoke Re-edit Request",
      entityId: contentId,
      newData: { approvalStatus: "PENDING", notes },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      updated,
      "general.success",
      lang,
      HTTP_STATUS.OK,
    );
  } catch (error: any) {
    logger.error("Revoke re-edit error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      error.message || "Failed to revoke re-edit request",
      lang,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};
