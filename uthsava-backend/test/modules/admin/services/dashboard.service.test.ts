import { DashboardService } from "../../../../src/modules/admin/services/dashboard.service";
import { User, Content, Coupon, UserSubscription } from "../../../../src/models";

jest.mock("../../../../src/models", () => ({
  User: {
    countDocuments: jest.fn().mockResolvedValue(0),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    })),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  Content: {
    countDocuments: jest.fn().mockResolvedValue(0),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    })),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  Coupon: {
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  UserSubscription: {
    countDocuments: jest.fn().mockResolvedValue(0),
    find: jest.fn(() => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    })),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  WatchProgress: {
    aggregate: jest.fn().mockResolvedValue([{ totalSeconds: 0 }]),
  },
  UserSession: {
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
  },
  PaymentTransaction: {
    aggregate: jest.fn().mockResolvedValue([]),
  },
  Role: {
    USER: "USER",
    ADMIN_SUB_USER: "ADMIN_SUB_USER",
    PRODUCER: "PRODUCER",
  },
  UserStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    DELETED: "DELETED",
  },
  SubscriptionStatus: {
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED",
  },
  PaymentStatus: {
    SUCCESS: "COMPLETED",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    PENDING: "PENDING",
  },
  CouponStatus: {
    ACTIVE: "ACTIVE",
  },
  ContentApprovalStatus: {
    PENDING: "PENDING",
  },
  UploadedByType: {
    PRODUCER: "PRODUCER",
  },
}));

describe("Dashboard Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("should return dashboard stats without date filter", async () => {
      const stats = await DashboardService.getDashboardStats();
      expect(stats).toBeDefined();
      expect(stats.users.totalUsers).toBe(0);
      expect(stats.graphs).toBeDefined();
      expect(stats.quickActions).toBeDefined();
    });

    it("should return dashboard stats with fromDate and toDate filters", async () => {
      const stats = await DashboardService.getDashboardStats("2023-01-01", "2023-12-31");
      expect(stats).toBeDefined();
      expect(User.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
        createdAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        })
      }));
    });
  });
});
