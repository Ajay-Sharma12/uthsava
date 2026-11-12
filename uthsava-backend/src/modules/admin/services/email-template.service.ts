import { FilterQuery } from "mongoose";
import {
  EmailTemplate,
  IEmailTemplate,
} from "../../../models/email-template.model";
import {
  PaginationParams,
  PaginationHelper,
} from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import {
  EMAIL_TEMPLATE_SORT_FIELDS,
  QueryBuilder,
} from "../../shared/helpers/query-builder.helper";
import { User, UserStatus } from "../../../models";
import { QueueService } from "../../shared/services/queue.service";
import { sendMail } from "../../shared/services/mail.service";

// Error message constants
export const ERROR_MESSAGES = {
  TEMPLATE_NOT_FOUND: "email_template.not_found",
  INVALID_TEMPLATE_ID: "email_template.invalid_id",
} as const;

/**
 * Helper to format populated user fields with associated action timestamps.
 */
const formatUserWithDate = (userField: any, dateField: any) => {
  if (!userField) return null;
  if (typeof userField === "object" && userField._id) {
    return {
      name:
        userField.fullName ||
        [userField.firstName, userField.lastName].filter(Boolean).join(" ") ||
        "Unknown",
      date: dateField || null,
    };
  }
  return null;
};

/**
 * Email Template Service
 * Handles business logic for email template management
 * Updated: Added updateTemplate method
 */ 
export class EmailTemplateService {
  /**
   * Get paginated list of email templates
   */
  static async listEmailTemplates(
    pagination: PaginationParams,
    query: FilterQuery<IEmailTemplate> = {},
  ): Promise<{
    data: IEmailTemplate[];
    pagination: any;
    counts: {
      totalTemplates: number;
      activeTemplates: number;
      inactiveTemplates: number;
    };
  }> {
    try {
      const parsedParams = PaginationHelper.parseParams(pagination, [
        ...EMAIL_TEMPLATE_SORT_FIELDS,
      ]);

      const result = await PaginationHelper.paginate(
        EmailTemplate,
        query,
        parsedParams,
        undefined,
        [
          { path: "createdBy", select: "fullName firstName lastName" },
          { path: "updatedBy", select: "fullName firstName lastName" },
        ]
      );

      // Global counts
      const [totalTemplates, activeTemplates, inactiveTemplates] =
        await Promise.all([
          EmailTemplate.countDocuments(),
          EmailTemplate.countDocuments({ status: "active" }),
          EmailTemplate.countDocuments({ status: "inactive" }),
        ]);

      return {
        data: result.data,
        pagination: result.pagination,
        counts: {
          totalTemplates,
          activeTemplates,
          inactiveTemplates,
        },
      };
    } catch (error: any) {
      logger.error("List email templates error:", error);
      throw error;
    }
  }

  /**
   * Get email template by ID
   */
  static async getEmailTemplateById(
    templateId: string,
  ): Promise<IEmailTemplate | null> {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(templateId)) {
        throw new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID);
      }

      return await EmailTemplate.findById(templateId)
        .populate("createdBy", "fullName firstName lastName")
        .populate("updatedBy", "fullName firstName lastName");
    } catch (error: any) {
      logger.error("Get email template by ID error:", error);
      throw error;
    }
  }

  /**
   * Search email templates
   */
  static async searchEmailTemplates(
    searchTerm: string,
    limit: number = 10,
  ): Promise<IEmailTemplate[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const searchQuery = QueryBuilder.buildSearchQuery(searchTerm, ["title"]);

      return await EmailTemplate.find(searchQuery)
        .limit(limit)
        .sort({ createdAt: -1 });
    } catch (error: any) {
      logger.error("Search email templates error:", error);
      throw error;
    }
  }

  /**
   * Create new email template
   */
  static async createEmailTemplate(
    templateData: Partial<IEmailTemplate>,
    userId?: string,
  ): Promise<IEmailTemplate> {
    try {
      const newTemplate = new EmailTemplate({
        title: templateData.title,
        subject: templateData.subject,
        description: templateData.description,
        signature: templateData.signature || "",
        keywordList: templateData.keywordList || [],
        status: templateData.status || "active",
        createdBy: userId,
        updatedBy: userId,
      });

      await newTemplate.save();
      return newTemplate;
    } catch (error: any) {
      logger.error("Create email template error:", error);
      throw error;
    }
  }

  /**
   * Update email template
   */
  static async updateTemplate(
    templateId: string,
    updateData: Partial<IEmailTemplate>,
    userId?: string,
  ): Promise<IEmailTemplate | null> {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(templateId)) {
        throw new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID);
      }

      const updatePayload = {
        ...updateData,
        updatedBy: userId,
      };

      return await EmailTemplate.findByIdAndUpdate(
        templateId,
        { $set: updatePayload },
        { new: true, runValidators: true },
      )
        .populate("createdBy", "fullName firstName lastName")
        .populate("updatedBy", "fullName firstName lastName");
    } catch (error: any) {
      logger.error("Update email template error:", error);
      throw error;
    }
  }

  /**
   * Send a bulk email to specific users via BullMQ
   */
  static async sendBulkEmail(
    templateId: string,
    userIds: string[]
  ): Promise<{ enqueued: number }> {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(templateId)) {
        throw new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID);
      }

      if (!userIds || userIds.length === 0) {
        throw new Error("No users provided for bulk email");
      }

      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        throw new Error(ERROR_MESSAGES.TEMPLATE_NOT_FOUND);
      }

      // Find the users to send the email to
      const users = await User.find({
        _id: { $in: userIds },
        status: { $ne: UserStatus.DELETED },
      });

      let enqueued = 0;
      const isSingleUser = users.length === 1;

      for (const user of users) {
        if (!user.email) continue;

        let subject = template.subject || "No Subject";
        let body = template.description || "";
        const userName = user.fullName || user.firstName || "User";

        // Replace placeholders in subject
        subject = subject
          .replaceAll("{{Platform Name}}", "Uthsava")
          .replaceAll("{{platformName}}", "Uthsava")
          .replaceAll("{{Platform_Name}}", "Uthsava")
          .replaceAll("{{site_name}}", "Uthsava")
          .replaceAll("{{Name}}", userName)
          .replaceAll("{{name}}", userName)
          .replaceAll("{{User Name}}", userName)
          .replaceAll("{{userName}}", userName)
          .replaceAll("{{Email}}", user.email || "")
          .replaceAll("{{email}}", user.email || "");

        // Replace placeholders in body
        body = body.replaceAll("{{Platform Name}}", "Uthsava");
        body = body.replaceAll("{{platformName}}", "Uthsava");
        body = body.replaceAll("{{Platform_Name}}", "Uthsava");
        body = body.replaceAll("{{Name}}", userName);
        body = body.replaceAll("{{name}}", userName);
        body = body.replaceAll("{{User Name}}", userName);
        body = body.replaceAll("{{userName}}", userName);
        body = body.replaceAll("{{Email}}", user.email);
        body = body.replaceAll("{{email}}", user.email);
        body = body.replaceAll("{{userEmail}}", user.email);
        body = body.replaceAll("{{Email ID}}", user.email);

        if (isSingleUser) {
          // Send immediately for a single user
          await sendMail(user.email, subject, body);
        } else {
          // Use the queue for multiple users
          await QueueService.addEmailJob(`email-${templateId}-${user._id}`, {
            to: user.email,
            subject,
            html: body,
          });
        }

        enqueued++;
      }

      return { enqueued };
    } catch (error: any) {
      logger.error("Send bulk email error:", error);
      throw error;
    }
  }

  /**
   * Sanitize email template data for response
   */
  static sanitizeEmailTemplate(template: any): any {
    if (!template) return null;

    const sanitized = template.toObject ? template.toObject() : template;

    // Remove sensitive fields if any
    delete sanitized.__v;

    return sanitized;
  }

  static formatListItem(template: any, serialNumber: number): any {
    const sanitized = this.sanitizeEmailTemplate(template);

    return {
      sNo: serialNumber,
      id: sanitized._id,
      templateTitle: sanitized.title,
      subject: sanitized.subject || "",
      updatedDateTime: sanitized.updatedAt,
      status: sanitized.status,
      createdBy: formatUserWithDate(sanitized.createdBy, sanitized.createdAt),
      updatedBy: formatUserWithDate(sanitized.updatedBy, sanitized.updatedAt),
    };
  }
}
