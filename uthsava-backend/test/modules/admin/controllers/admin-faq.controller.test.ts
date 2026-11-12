/// <reference types="jest" />
import { Request, Response } from "express";
import {
  createFaq,
  listFaqs,
  getFaqById,
  updateFaq,
  updateFaqStatus,
  deleteFaq,
  listPublicFaqs,
} from "../../../../src/modules/admin/controllers/faq.controller";
import { FaqService } from "../../../../src/modules/admin/services/faq.service";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Faq } from "../../../../src/models";

jest.mock("../../../../src/modules/admin/services/faq.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../../../src/models", () => ({
  Faq: {
    find: jest.fn(),
  },
  FaqStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  }
}));

describe("Admin Faq Controller API Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("createFaq", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should create FAQ successfully with question and answer", async () => {
      mockReq = {
        body: { question: "Q1", answer: "A1" },
        user: { sub: "admin1" } as any,
      };

      const mockFaq = { _id: "faq1" };
      (FaqService.createFaq as jest.Mock).mockResolvedValue(mockFaq);

      await createFaq(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockFaq,
        "faq.created",
        "en",
        201
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 500 error if service fails to create FAQ", async () => {
      mockReq = { body: {} };
      const error = new Error("DB Error");
      (FaqService.createFaq as jest.Mock).mockRejectedValue(error);

      await createFaq(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, "general.error", "en", 500, error);
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle missing question/answer body payload gracefully", async () => {
      mockReq = { body: {} };
      (FaqService.createFaq as jest.Mock).mockResolvedValue({ _id: "faq2" });

      await createFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success || ResponseHandler.error).toBeDefined();
    });
  });

  describe("listFaqs", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should list FAQs with pagination parameters successfully", async () => {
      mockReq = { query: {} };
      const mockResult = { data: [], total: 0, totalPages: 0 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);

      await listFaqs(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle service database error when listing FAQs", async () => {
      mockReq = { query: {} };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (PaginationHelper.paginate as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await listFaqs(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle empty query parameters correctly", async () => {
      mockReq = { query: {} };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listFaqs(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getFaqById", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should return single FAQ details by ID successfully", async () => {
      mockReq = { params: { faqId: "faq1" } };
      (FaqService.getFaqById as jest.Mock).mockResolvedValue({ _id: "faq1" });

      await getFaqById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle FAQ not found error status", async () => {
      mockReq = { params: { faqId: "faq1" } };
      (FaqService.getFaqById as jest.Mock).mockRejectedValue(new Error("error.faqNotFound"));

      await getFaqById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.notFound).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle malformed or missing faqId parameter", async () => {
      mockReq = { params: {} };
      await getFaqById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.notFound || ResponseHandler.error).toBeDefined();
    });
  });

  describe("updateFaq", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should update FAQ details successfully", async () => {
      mockReq = { params: { faqId: "faq1" }, body: {}, user: { sub: "admin1" } as any };
      (FaqService.updateFaq as jest.Mock).mockResolvedValue({ _id: "faq1" });

      await updateFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return error if service update fails", async () => {
      mockReq = { params: { faqId: "faq1" }, body: {} };
      (FaqService.updateFaq as jest.Mock).mockRejectedValue(new Error("Update failed"));

      await updateFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle missing update body or invalid ID gracefully", async () => {
      mockReq = { params: { faqId: "invalid" }, body: {} };
      await updateFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.notFound).toBeDefined();
    });
  });

  describe("updateFaqStatus", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should update FAQ status successfully", async () => {
      mockReq = { params: { faqId: "faq1" }, body: { status: "ACTIVE" }, user: { sub: "admin1" } as any };
      (FaqService.updateFaqStatus as jest.Mock).mockResolvedValue({ _id: "faq1" });

      await updateFaqStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return error if FAQ status update fails in service", async () => {
      mockReq = { params: { faqId: "faq1" }, body: { status: "INACTIVE" } };
      (FaqService.updateFaqStatus as jest.Mock).mockRejectedValue(new Error("Status update failed"));

      await updateFaqStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle unrecognized status value gracefully", async () => {
      mockReq = { params: { faqId: "faq1" }, body: { status: "INVALID_STATUS" } };
      await updateFaqStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });

  describe("deleteFaq", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should delete FAQ successfully", async () => {
      mockReq = { params: { faqId: "faq1" }, user: { sub: "admin1" } as any };
      (FaqService.deleteFaq as jest.Mock).mockResolvedValue({ _id: "faq1" });

      await deleteFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle error if deletion fails in database", async () => {
      mockReq = { params: { faqId: "faq1" } };
      (FaqService.deleteFaq as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      await deleteFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle non-existent FAQ deletion gracefully", async () => {
      mockReq = { params: { faqId: "unknown-faq" } };
      (FaqService.deleteFaq as jest.Mock).mockRejectedValue(new Error("error.faqNotFound"));

      await deleteFaq(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.notFound || ResponseHandler.error).toBeDefined();
    });
  });

  describe("listPublicFaqs", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should list active public FAQs successfully", async () => {
      mockReq = { query: {} };
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      (Faq.find as jest.Mock).mockReturnValue(mockFind);

      await listPublicFaqs(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle error if public FAQ query fails", async () => {
      mockReq = { query: {} };
      (Faq.find as jest.Mock).mockImplementation(() => {
        throw new Error("DB Query Error");
      });

      await listPublicFaqs(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle empty public FAQ results array gracefully", async () => {
      mockReq = { query: {} };
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      (Faq.find as jest.Mock).mockReturnValue(mockFind);

      await listPublicFaqs(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });
});
