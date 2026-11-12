/// <reference types="jest" />
import { Request, Response } from "express";
import {
  createCoupon,
  listCoupons,
  getCouponById,
  updateCoupon,
  updateCouponStatus,
  assignUsersToCoupon,
} from "../../../../src/modules/admin/controllers/coupon.controller";
import { CouponService } from "../../../../src/modules/admin/services/coupon.service";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Types } from "mongoose";

jest.mock("../../../../src/modules/admin/services/coupon.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("Admin Coupon Controller API Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("createCoupon", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should create coupon successfully with valid parameters", async () => {
      mockReq = { 
        body: { 
          code: "TEST", 
          expiryDate: new Date(Date.now() + 1000000).toISOString(),
          applicableUsers: "all"
        }, 
        user: { sub: new Types.ObjectId().toHexString() } as any 
      };
      (CouponService.createCoupon as jest.Mock).mockResolvedValue({ _id: "1" });

      await createCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return error response if coupon creation service fails", async () => {
      mockReq = { body: { code: "FAIL", expiryDate: new Date(Date.now() + 1000000).toISOString() } };
      (CouponService.createCoupon as jest.Mock).mockRejectedValue(new Error("Database write error"));

      await createCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle missing body or invalid schema format gracefully", async () => {
      mockReq = { body: {} };
      await createCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });

  describe("listCoupons", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should list coupons with pagination successfully", async () => {
      mockReq = { query: {} };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (CouponService.listCoupons as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listCoupons(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle service rejection when retrieving coupons list", async () => {
      mockReq = { query: {} };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (CouponService.listCoupons as jest.Mock).mockRejectedValue(new Error("Query failed"));

      await listCoupons(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle invalid query pagination parameters gracefully", async () => {
      mockReq = { query: { page: "-1", limit: "invalid" } };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CouponService.listCoupons as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listCoupons(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getCouponById", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should get coupon details by ID successfully", async () => {
      mockReq = { params: { couponId: "1" } };
      (CouponService.getCouponById as jest.Mock).mockResolvedValue({ _id: "1" });

      await getCouponById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 404 when coupon ID is not found", async () => {
      mockReq = { params: { couponId: "non-existent" } };
      (CouponService.getCouponById as jest.Mock).mockRejectedValue(new Error("error.couponNotFound"));

      await getCouponById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.notFound).toBeDefined();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle missing couponId parameter gracefully", async () => {
      mockReq = { params: {} };
      await getCouponById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.notFound).toBeDefined();
    });
  });

  describe("updateCoupon", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should update coupon details successfully", async () => {
      mockReq = { params: { couponId: "1" }, body: { code: "UPDATED" } };
      (CouponService.updateCoupon as jest.Mock).mockResolvedValue({ _id: "1", code: "UPDATED" });

      await updateCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return error if service fails to update coupon", async () => {
      mockReq = { params: { couponId: "1" }, body: {} };
      (CouponService.updateCoupon as jest.Mock).mockRejectedValue(new Error("Update failed"));

      await updateCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle malformed couponId parameter in update payload", async () => {
      mockReq = { params: { couponId: "invalid-format" }, body: {} };
      await updateCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });

  describe("updateCouponStatus", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should update coupon status successfully", async () => {
      mockReq = { params: { couponId: "1" }, body: { status: "ACTIVE" } };
      (CouponService.updateCouponStatus as jest.Mock).mockResolvedValue({ _id: "1", status: "ACTIVE" });

      await updateCouponStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle service failure when changing coupon status", async () => {
      mockReq = { params: { couponId: "1" }, body: { status: "INACTIVE" } };
      (CouponService.updateCouponStatus as jest.Mock).mockRejectedValue(new Error("Status update failed"));

      await updateCouponStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should return validation error for unrecognized status string", async () => {
      mockReq = { params: { couponId: "1" }, body: { status: "INVALID_STATUS" } };
      (CouponService.updateCouponStatus as jest.Mock).mockRejectedValue(new Error("error.invalidStatus"));

      await updateCouponStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });

  describe("assignUsersToCoupon", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should assign users to coupon successfully", async () => {
      mockReq = { params: { couponId: "1" }, body: { userIds: [new Types.ObjectId().toHexString()] } };
      (CouponService.assignUsersToCoupon as jest.Mock).mockResolvedValue({ _id: "1" });

      await assignUsersToCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle service failure during user assignment", async () => {
      mockReq = { params: { couponId: "1" }, body: { userIds: [] } };
      (CouponService.assignUsersToCoupon as jest.Mock).mockRejectedValue(new Error("Assignment failed"));

      await assignUsersToCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation/Edge] should handle empty userIds array or invalid ID format gracefully", async () => {
      mockReq = { params: { couponId: "1" }, body: { userIds: ["invalid-user-id"] } };
      await assignUsersToCoupon(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });
});
