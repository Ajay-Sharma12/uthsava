import { Request, Response } from "express";
import {
  createEmailTemplate,
  listEmailTemplates,
  getEmailTemplateById,
  searchEmailTemplates,
  updateEmailTemplate,
  updateEmailTemplateStatus,
  sendBulkEmail,
} from "../../../../src/modules/admin/controllers/email-template.controller";
import { EmailTemplateService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/email-template.service";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Types } from "mongoose";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

jest.mock("../../../../src/modules/admin/services/email-template.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("Admin EmailTemplate Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("createEmailTemplate", () => {
    it("should create email template successfully", async () => {
      mockReq = {
        body: { title: "Welcome Email", subject: "Welcome!", description: "<p>Hi</p>", signature: "Team", status: "active" },
        user: { sub: "507f1f77bcf86cd799439011" } as any,
      };
      const mockCreated = { _id: "template1", title: "Welcome Email" };
      (EmailTemplateService.createEmailTemplate as jest.Mock).mockResolvedValue(mockCreated);
      (EmailTemplateService.sanitizeEmailTemplate as jest.Mock).mockReturnValue(mockCreated);

      await createEmailTemplate(mockReq as Request, mockRes as Response);

      expect(EmailTemplateService.createEmailTemplate).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { emailTemplate: mockCreated },
        "email_template.created",
        "en",
        HTTP_STATUS.CREATED
      );
    });

    it("should handle error when creation fails", async () => {
      mockReq = { body: {} };
      (EmailTemplateService.createEmailTemplate as jest.Mock).mockRejectedValue(new Error("Database error"));

      await createEmailTemplate(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expect.any(Error)
      );
    });
  });

  describe("listEmailTemplates", () => {
    it("should list templates with pagination and status filter", async () => {
      mockReq = { query: { search: "test", status: "active", page: "1", limit: "10" } };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({ sortOrder: "desc" });
      (EmailTemplateService.listEmailTemplates as jest.Mock).mockResolvedValue({
        data: [{ title: "Template 1" }],
        pagination: { totalPages: 1 },
        counts: { total: 1 },
      });
      (EmailTemplateService.formatListItem as jest.Mock).mockImplementation((t) => t);

      await listEmailTemplates(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle error during listing", async () => {
      mockReq = { query: {} };
      (EmailTemplateService.listEmailTemplates as jest.Mock).mockRejectedValue(new Error("Listing failed"));

      await listEmailTemplates(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getEmailTemplateById", () => {
    it("should get template by ID successfully", async () => {
      const validId = new Types.ObjectId().toHexString();
      mockReq = { params: { templateId: validId } };
      const mockTemplate = { _id: validId, title: "Test" };
      (EmailTemplateService.getEmailTemplateById as jest.Mock).mockResolvedValue(mockTemplate);
      (EmailTemplateService.sanitizeEmailTemplate as jest.Mock).mockReturnValue(mockTemplate);

      await getEmailTemplateById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { emailTemplate: mockTemplate },
        "email_template.retrieved",
        "en"
      );
    });

    it("should return 404 error when template is not found", async () => {
      mockReq = { params: { templateId: "507f1f77bcf86cd799439011" } };
      (EmailTemplateService.getEmailTemplateById as jest.Mock).mockResolvedValue(null);

      await getEmailTemplateById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "email_template.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should return validationError on INVALID_TEMPLATE_ID", async () => {
      mockReq = { params: { templateId: "invalid-id" } };
      (EmailTemplateService.getEmailTemplateById as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID));

      await getEmailTemplateById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle unexpected error", async () => {
      mockReq = { params: { templateId: "123" } };
      (EmailTemplateService.getEmailTemplateById as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

      await getEmailTemplateById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expect.any(Error)
      );
    });
  });

  describe("searchEmailTemplates", () => {
    it("should search templates successfully", async () => {
      mockReq = { query: { search: "TEST", limit: "5" } };
      (EmailTemplateService.searchEmailTemplates as jest.Mock).mockResolvedValue([{ title: "TEST" }]);
      (EmailTemplateService.sanitizeEmailTemplate as jest.Mock).mockImplementation((t) => t);

      await searchEmailTemplates(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should return validationError if search term is missing", async () => {
      mockReq = { query: {} };
      await searchEmailTemplates(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle error during search", async () => {
      mockReq = { query: { search: "TEST" } };
      (EmailTemplateService.searchEmailTemplates as jest.Mock).mockRejectedValue(new Error("Search error"));

      await searchEmailTemplates(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateEmailTemplate", () => {
    it("should update template successfully", async () => {
      mockReq = { params: { templateId: "1" }, body: { title: "Updated" }, user: { sub: "user1" } as any };
      (EmailTemplateService.updateTemplate as jest.Mock).mockResolvedValue({ _id: "1", title: "Updated" });
      (EmailTemplateService.sanitizeEmailTemplate as jest.Mock).mockImplementation((t) => t);

      await updateEmailTemplate(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should return 404 when template to update is not found", async () => {
      mockReq = { params: { templateId: "1" }, body: { title: "Updated" } };
      (EmailTemplateService.updateTemplate as jest.Mock).mockResolvedValue(null);

      await updateEmailTemplate(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "email_template.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle INVALID_TEMPLATE_ID on update", async () => {
      mockReq = { params: { templateId: "invalid" }, body: {} };
      (EmailTemplateService.updateTemplate as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID));

      await updateEmailTemplate(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle general error on update", async () => {
      mockReq = { params: { templateId: "1" }, body: {} };
      (EmailTemplateService.updateTemplate as jest.Mock).mockRejectedValue(new Error("Update failed"));

      await updateEmailTemplate(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateEmailTemplateStatus", () => {
    it("should update template status successfully", async () => {
      mockReq = { params: { templateId: "1" }, body: { status: "active" } };
      (EmailTemplateService.updateTemplate as jest.Mock).mockResolvedValue({ _id: "1", status: "active" });
      (EmailTemplateService.sanitizeEmailTemplate as jest.Mock).mockImplementation((t) => t);

      await updateEmailTemplateStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should return 404 if template not found during status update", async () => {
      mockReq = { params: { templateId: "1" }, body: { status: "active" } };
      (EmailTemplateService.updateTemplate as jest.Mock).mockResolvedValue(null);

      await updateEmailTemplateStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "email_template.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle INVALID_TEMPLATE_ID during status update", async () => {
      mockReq = { params: { templateId: "invalid" }, body: { status: "active" } };
      (EmailTemplateService.updateTemplate as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID));

      await updateEmailTemplateStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle error during status update", async () => {
      mockReq = { params: { templateId: "1" }, body: { status: "active" } };
      (EmailTemplateService.updateTemplate as jest.Mock).mockRejectedValue(new Error("Status update failed"));

      await updateEmailTemplateStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("sendBulkEmail", () => {
    it("should send bulk email successfully", async () => {
      mockReq = { params: { templateId: "1" }, body: { userIds: ["u1", "u2"] } };
      (EmailTemplateService.sendBulkEmail as jest.Mock).mockResolvedValue({ enqueued: 2 });

      await sendBulkEmail(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { enqueued: 2 },
        "email_template.bulk_send_initiated",
        "en"
      );
    });

    it("should return validationError if userIds is missing or empty array", async () => {
      mockReq = { params: { templateId: "1" }, body: { userIds: [] } };
      await sendBulkEmail(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle INVALID_TEMPLATE_ID on bulk send", async () => {
      mockReq = { params: { templateId: "invalid" }, body: { userIds: ["u1"] } };
      (EmailTemplateService.sendBulkEmail as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_TEMPLATE_ID));

      await sendBulkEmail(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle TEMPLATE_NOT_FOUND on bulk send", async () => {
      mockReq = { params: { templateId: "1" }, body: { userIds: ["u1"] } };
      (EmailTemplateService.sendBulkEmail as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.TEMPLATE_NOT_FOUND));

      await sendBulkEmail(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "email_template.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle general error on bulk send", async () => {
      mockReq = { params: { templateId: "1" }, body: { userIds: ["u1"] } };
      (EmailTemplateService.sendBulkEmail as jest.Mock).mockRejectedValue(new Error("Bulk send error"));

      await sendBulkEmail(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });
});

