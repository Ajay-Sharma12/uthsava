import { Types } from "mongoose";
import { CouponService } from "../../../../src/modules/admin/services/coupon.service";
import { Coupon, CouponStatus, DiscountType, ApplicableUsers, User } from "../../../../src/models";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/models", () => {
  const mockSave = jest.fn().mockResolvedValue(true);
  const CouponMock = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
  })) as any;
  
  CouponMock.findOne = jest.fn();
  CouponMock.find = jest.fn();
  CouponMock.findById = jest.fn();
  CouponMock.create = jest.fn();
  CouponMock.updateMany = jest.fn();
  
  return {
    Coupon: CouponMock,
    User: { find: jest.fn() },
    CouponStatus: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
    DiscountType: { PERCENTAGE: "PERCENTAGE", FIXED: "FIXED" },
    ApplicableUsers: { ALL: "ALL", SELECTED: "SELECTED" }
  };
});

jest.mock("../../../../src/modules/shared/helpers/pagination.helper");

describe("Coupon Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCoupon", () => {
    it("should create coupon successfully", async () => {
      const mockData = {
        code: "TESTCODE",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        usageLimit: 100,
        startDate: new Date(),
        expiryDate: new Date(),
        perUserLimit: 1,
        applicableUsers: ApplicableUsers.ALL,
      };

      (Coupon.findOne as jest.Mock).mockResolvedValue(null);
      (Coupon.create as jest.Mock).mockResolvedValue({ _id: "1", ...mockData });

      const result = await CouponService.createCoupon(mockData);
      expect(result).toHaveProperty("_id");
      expect(Coupon.create).toHaveBeenCalled();
    });

    it("should throw error if code exists", async () => {
      (Coupon.findOne as jest.Mock).mockResolvedValue({ _id: "1" });
      await expect(CouponService.createCoupon({ code: "TEST" } as any)).rejects.toThrow("coupon.code_exists");
    });
  });

  describe("listCoupons", () => {
    it("should list coupons", async () => {
      (Coupon.updateMany as jest.Mock).mockResolvedValue({});
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      const result = await CouponService.listCoupons({ page: 1, limit: 10 } as any, { search: "TEST" });
      expect(result).toBeDefined();
      expect(PaginationHelper.paginate).toHaveBeenCalled();
    });
  });

  describe("getCouponById", () => {
    it("should get coupon by id", async () => {
      const mockCoupon = { _id: "1", status: "ACTIVE", expiryAt: new Date(Date.now() + 100000), usedCount: 0, usageLimit: 10, save: jest.fn() };
      (Coupon.findById as jest.Mock).mockResolvedValue(mockCoupon);

      const result = await CouponService.getCouponById("1");
      expect(result).toEqual(mockCoupon);
    });

    it("should return null if not found", async () => {
      (Coupon.findById as jest.Mock).mockResolvedValue(null);
      const result = await CouponService.getCouponById("1");
      expect(result).toBeNull();
    });
  });

  describe("updateCoupon", () => {
    it("should update inactive coupon", async () => {
      const mockCoupon = { _id: "1", status: "INACTIVE", save: jest.fn().mockResolvedValue(true) };
      (Coupon.findById as jest.Mock).mockResolvedValue(mockCoupon);

      await CouponService.updateCoupon("1", { discountValue: 20 });
      expect(mockCoupon.save).toHaveBeenCalled();
    });

    it("should throw error if active", async () => {
      const mockCoupon = { _id: "1", status: "ACTIVE" };
      (Coupon.findById as jest.Mock).mockResolvedValue(mockCoupon);

      await expect(CouponService.updateCoupon("1", {})).rejects.toThrow("error.runningactiveCouponCodeCannotBeEditable");
    });
  });

  describe("assignUsersToCoupon", () => {
    it("should assign users to coupon", async () => {
      const mockCoupon = { _id: "1", status: "ACTIVE", save: jest.fn().mockResolvedValue(true) };
      (Coupon.findById as jest.Mock).mockResolvedValue(mockCoupon);
      
      const mockUsers = [{ _id: new Types.ObjectId() }];
      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      await CouponService.assignUsersToCoupon("1", [mockUsers[0]._id.toHexString()]);
      expect(mockCoupon.save).toHaveBeenCalled();
    });
  });

  describe("getValidCouponByCode", () => {
    it("should get valid coupon by code", async () => {
      const mockCoupon = {
        _id: "1",
        code: "TEST",
        status: "ACTIVE",
        usedCount: 0,
        usageLimit: 10,
        expiryAt: new Date(Date.now() + 100000),
        startDate: new Date(Date.now() - 100000),
        save: jest.fn(),
      };
      (Coupon.findOne as jest.Mock).mockResolvedValue(mockCoupon);

      const result = await CouponService.getValidCouponByCode("TEST");
      expect(result).toEqual(mockCoupon);
    });
  });
});
