/// <reference types="jest" />
import { SubscriptionStatus, UserStatus } from "../../../../src/models";
import { UserService } from "../../../../src/modules/admin/services/user.service";

interface MockedModel {
  aggregate?: jest.MockedFunction<any>;
  countDocuments?: jest.MockedFunction<any>;
  findById?: jest.MockedFunction<any>;
  findOne?: jest.MockedFunction<any>;
  find?: jest.MockedFunction<any>;
  updateMany?: jest.MockedFunction<any>;
  findByIdAndUpdate?: jest.MockedFunction<any>;
  deleteMany?: jest.MockedFunction<any>;
}

jest.mock("../../../../src/models", () => {
  const mockUser: MockedModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const mockSubscription: MockedModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockPayment: MockedModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };
  const mockDeviceSession: MockedModel = {
    find: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };

  return {
    User: mockUser,
    Subscription: mockSubscription,
    UserSubscription: mockSubscription, // Because we used UserSubscription
    PaymentTransaction: mockPayment, // Because we used PaymentTransaction
    Payment: mockPayment,
    DeviceSession: mockDeviceSession,
    UserSession: mockDeviceSession, // Because we used UserSession
    Watchlist: { countDocuments: jest.fn() },
    WatchProgress: { aggregate: jest.fn(), find: jest.fn() },
    UserProfile: { findOne: jest.fn() },
    UserStatus: {
      ACTIVE: "active",
      INACTIVE: "inactive",
      DELETED: "deleted",
      SUSPENDED: "suspended",
    },
    SubscriptionStatus: {
      ACTIVE: "active",
      EXPIRED: "expired",
      CANCELLED: "cancelled",
    },
    PaymentStatus: {
      COMPLETED: "completed",
      FAILED: "failed",
      PENDING: "pending",
    },
    Gender: {
      MALE: "male",
      FEMALE: "female",
      OTHER: "other",
    },
    Role: {
      USER: "user",
    },
  };
});

jest.mock("../../../../src/core/config", () => ({
  config: {
    aws: {
      cloudFrontUrl: "https://cdn.example.com",
    },
    smtp: {
      host: "smtp.test.com",
      port: 587,
      user: "test@test.com",
      password: "password",
    },
  },
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const models = jest.requireMock("../../../../src/models");

const User = models.User as MockedModel;
const Subscription = models.Subscription as MockedModel;
const Payment = models.Payment as MockedModel;
const DeviceSession = models.DeviceSession as MockedModel;
const Watchlist = models.Watchlist as any;
const WatchProgress = models.WatchProgress as any;
const UserProfile = models.UserProfile as any;

const mongoose = require("mongoose");

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listUsers", () => {
    it("should return mapped user list and counts when filters are applied", async () => {
      const mockUserRecord = {
        _id: "user123",
        userId: 101,
        fullName: "Alice Brown",
        email: "alice@example.com",
        mobile: "9876543210",
        countryCode: 91,
        createdAt: "2026-01-15T00:00:00.000Z",
        status: "active",
        subscriptionStatus: "active",
        latestSubscription: { planName: "Pro" },
        lastLoginAt: "2026-02-01T00:00:00.000Z",
        profileImage: "users/alice.png",
      };

      User.aggregate.mockResolvedValue([
        { data: [mockUserRecord], totalCount: [{ count: 1 }] },
      ]);
      User.countDocuments
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const result = await UserService.listUsers({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: "alice",
        status: UserStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });

      expect(User.aggregate).toHaveBeenCalled();

      expect(result.data[0]).toMatchObject({
        id: "user123",
        userId: 101,
        name: "Alice Brown",
        email: "alice@example.com",
        registrationDate: "2026-01-15T00:00:00.000Z",
        subscriptionStatus: "active",
        accountStatus: "active",
        profileImageUrl: "https://cdn.example.com/users/alice.png",
      });
      expect(result.pagination.totalCount).toBe(1);
      expect(result.counts).toEqual({
        totalUsers: 1,
        activeUsers: 1,
        inactiveUsers: 0,
      });
    });

    it("should handle empty search and empty results gracefully", async () => {
      User.aggregate.mockResolvedValue([
        { data: [], totalCount: [] },
      ]);
      User.countDocuments.mockResolvedValue(0);

      const result = await UserService.listUsers({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it("should apply account status filter correctly when accountStatus param is used", async () => {
      User.aggregate.mockResolvedValue([{ data: [], totalCount: [] }]);
      User.countDocuments.mockResolvedValue(0);

      await UserService.listUsers({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        accountStatus: UserStatus.INACTIVE,
      });

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              status: UserStatus.INACTIVE,
            }),
          }),
        ]),
      );
    });
  });

  describe("getUserById", () => {
    it("should throw when user id is invalid", async () => {
      await expect(UserService.getUserById("invalid-id")).rejects.toThrow(
        "error.invalidUserId",
      );
    });

    it("should throw when user is not found", async () => {
      const validId = new mongoose.Types.ObjectId().toHexString();
      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(UserService.getUserById(validId)).rejects.toThrow(
        "error.userNotFound",
      );
    });

    it("should return user profile with subscription, payment and device details", async () => {
      const validId = new mongoose.Types.ObjectId().toHexString();
      const userRecord = {
        _id: validId,
        email: "jane@example.com",
        fullName: "Jane Doe",
        profileImage: "profile/jane.png",
        countryCode: 91,
        mobile: "9876543211",
        status: "inactive",
        gender: "female",
        createdAt: "2026-02-02T00:00:00.000Z",
      };

      const selectMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(userRecord),
      });
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      const subscriptionQuery = { populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ planId: { name: "Silver" }, endDate: "2026-03-02T00:00:00.000Z" }) }) }) };
      (Subscription.findOne as jest.Mock).mockReturnValue(subscriptionQuery);
      (Subscription.find as jest.Mock).mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) });

      Payment.aggregate.mockResolvedValue([
        {
          totalPayments: 2,
          successfulPayments: 2,
          failedPayments: 0,
          totalPaidAmount: 150,
          lastPaymentDate: "2026-02-10T00:00:00.000Z",
        },
      ]);

      (Payment.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: "payment1", amount: 100, status: "completed" },
            ]),
          }),
        }),
      });

      (DeviceSession.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { deviceId: "device1", deviceName: "Chrome" },
          ]),
        }),
      });

      Watchlist.countDocuments.mockResolvedValue(0);
      WatchProgress.aggregate.mockResolvedValue([{ watchHours: 0 }]);
      WatchProgress.find.mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) });
      UserProfile.findOne.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });

      const result = await UserService.getUserById(validId);

      expect(result.profile.email).toBe("jane@example.com");
      expect(result.profile.profileImageUrl).toBe(
        "https://cdn.example.com/profile/jane.png",
      );
      expect(result.subscriptionInformation.currentPlan).toBe("Silver");
      expect(result.planExpiryDate).toBe("2026-03-02T00:00:00.000Z");
      expect(result.planExpiryDate).toBe("2026-03-02T00:00:00.000Z");
      expect(result.deviceCount).toBe(1);
    });
  });

  describe("updateUserStatus", () => {
    const validId = new mongoose.Types.ObjectId().toHexString();
    const userRecord = {
      _id: validId,
      fullName: "Bob Smith",
      status: "active",
    };

    it("should throw error for invalid status value", async () => {
      await expect(
        UserService.updateUserStatus(validId, "INVALID_STATUS" as any)
      ).rejects.toThrow("error.invalidStatusValue");
    });

    it("should throw error if user not found during status update", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(
        UserService.updateUserStatus(validId, UserStatus.ACTIVE)
      ).rejects.toThrow("error.userNotFound");
    });

    it("should successfully activate a user", async () => {
      const activatedUser = { ...userRecord, status: "active" };
      const selectMock = jest.fn().mockResolvedValue({
        toJSON: () => activatedUser,
      });
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await UserService.updateUserStatus(validId, UserStatus.ACTIVE);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        validId,
        { status: UserStatus.ACTIVE },
        { new: true }
      );
      expect(result.status).toBe("active");
    });

    it("should deactivate a user, clear tokens, and deactivate all DeviceSessions", async () => {
      const deactivatedUser = { ...userRecord, status: "inactive" };
      const selectMock = jest.fn().mockResolvedValue({
        ...deactivatedUser,
        toJSON: () => deactivatedUser,
      });
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });
      (DeviceSession.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });

      const result = await UserService.updateUserStatus(validId, UserStatus.INACTIVE);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        validId,
        {
          status: UserStatus.INACTIVE,
          refreshToken: null,
          deviceToken: null,
          deviceType: null,
        },
        { new: true }
      );
      expect(DeviceSession.deleteMany).toHaveBeenCalledWith(
        { userId: deactivatedUser._id }
      );
      expect(result.status).toBe("inactive");
    });
  });
});

