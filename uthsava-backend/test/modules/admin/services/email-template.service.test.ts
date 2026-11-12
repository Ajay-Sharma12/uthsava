import { EmailTemplateService } from "../../../../src/modules/admin/services/email-template.service";
import { EmailTemplate } from "../../../../src/models/email-template.model";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { Types } from "mongoose";

jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    countDocuments: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(() => ({
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    })),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../../../src/modules/shared/helpers/pagination.helper");

describe("EmailTemplate Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listEmailTemplates", () => {
    it("should list email templates with counts", async () => {
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue({ data: [], pagination: {} });
      (EmailTemplate.countDocuments as jest.Mock).mockResolvedValue(0);

      const result = await EmailTemplateService.listEmailTemplates({ page: 1, limit: 10 } as any);
      expect(result).toBeDefined();
      expect(result.counts).toBeDefined();
      expect(PaginationHelper.paginate).toHaveBeenCalled();
    });
  });

  describe("getEmailTemplateById", () => {
    it("should get email template by id", async () => {
      (EmailTemplate.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() })
        })
      });
      const result = await EmailTemplateService.getEmailTemplateById(new Types.ObjectId().toHexString());
      expect(result).toBeDefined();
    });

    it("should throw error for invalid id format", async () => {
      await expect(EmailTemplateService.getEmailTemplateById("invalid")).rejects.toThrow("email_template.invalid_id");
    });
  });

  describe("searchEmailTemplates", () => {
    it("should return empty array for empty search", async () => {
      const result = await EmailTemplateService.searchEmailTemplates("");
      expect(result).toEqual([]);
    });

    it("should search templates", async () => {
      const result = await EmailTemplateService.searchEmailTemplates("TEST");
      expect(result).toEqual([]);
    });
  });

  describe("updateTemplate", () => {
    it("should update template", async () => {
      (EmailTemplate.findByIdAndUpdate as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() })
        })
      });
      const result = await EmailTemplateService.updateTemplate(new Types.ObjectId().toHexString(), { title: "New Title" });
      expect(result).toBeDefined();
    });

    it("should throw error for invalid id format on update", async () => {
      await expect(EmailTemplateService.updateTemplate("invalid", {})).rejects.toThrow("email_template.invalid_id");
    });
  });

  describe("formatListItem", () => {
    it("should format list item", () => {
      const mockTemplate = {
        _id: "1",
        title: "Test",
        status: "active",
        toObject: () => ({ _id: "1", title: "Test", status: "active" })
      };
      
      const result = EmailTemplateService.formatListItem(mockTemplate, 1);
      expect(result.sNo).toBe(1);
      expect(result.templateTitle).toBe("Test");
    });
  });
});
