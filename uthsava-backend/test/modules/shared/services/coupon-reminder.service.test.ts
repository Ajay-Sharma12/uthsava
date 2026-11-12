/// <reference types="jest" />
import { sendCouponExpiryReminders } from "../../../../src/modules/shared/services/coupon-reminder.service";
import { Coupon, CouponStatus, ApplicableUsers } from "../../../../src/models/coupon.model";
import { User, UserStatus } from "../../../../src/models/user.model";
import { NotificationService } from "../../../../src/modules/admin/services/notification.service";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/models/coupon.model", () => {
  return {
    Coupon: {
      find: jest.fn(),
    },
    CouponStatus: {
      ACTIVE: "ACTIVE",
      INACTIVE: "INACTIVE",
    },
    ApplicableUsers: {
      ALL: "ALL_USERS",
      SELECTED: "SELECTED_USERS",
    },
  };
});

jest.mock("../../../../src/models/user.model", () => {
  return {
    User: {
      find: jest.fn(),
    },
    UserStatus: {
      ACTIVE: "ACTIVE",
    },
  };
});

jest.mock("../../../../src/modules/admin/services/notification.service", () => ({
  NotificationService: {
    dispatchSystemNotification: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Coupon Reminder Service Unit Tests", () => {
  let mockUserSelect: any;
  let mockUserLean: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserLean = jest.fn().mockResolvedValue([]);
    mockUserSelect = jest.fn().mockReturnValue({ lean: mockUserLean });
    (User.find as jest.Mock).mockReturnValue({ select: mockUserSelect });
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully send expiring soon notifications to all active users", async () => {
    const mockCoupon = {
      code: "PROMO20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      applicableUserType: ApplicableUsers.ALL,
      remindersSent: [] as string[],
      save: jest.fn().mockResolvedValue(true),
    };

    const mockUsers = [{ _id: "user1", email: "user1@test.com" }];
    mockUserLean.mockResolvedValue(mockUsers);
    (Coupon.find as jest.Mock)
      .mockResolvedValueOnce([mockCoupon]) // Expiring coupons
      .mockResolvedValueOnce([]); // Expired coupons

    await sendCouponExpiryReminders();

    expect(Coupon.find).toHaveBeenCalledTimes(2);
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ status: UserStatus.ACTIVE, role: "USER" }));
    expect(NotificationService.dispatchSystemNotification).toHaveBeenCalledWith(
      "COUPON_EXPIRING_SOON",
      mockUsers,
      expect.objectContaining({ "Coupon Code": "PROMO20", Discount: "20%" })
    );
    expect(mockCoupon.remindersSent).toContain("EXPIRING_SOON");
    expect(mockCoupon.save).toHaveBeenCalled();
  });

  it("[Positive] should successfully process expired coupons, notify users and mark status as INACTIVE", async () => {
    const mockCoupon = {
      code: "EXPIRED50",
      discountType: "FIXED_AMOUNT",
      discountValue: 50,
      applicableUserType: ApplicableUsers.SELECTED,
      applicableUserIds: ["user2"],
      remindersSent: [] as string[],
      status: CouponStatus.ACTIVE,
      save: jest.fn().mockResolvedValue(true),
    };

    const mockUsers = [{ _id: "user2", email: "user2@test.com" }];
    mockUserLean.mockResolvedValue(mockUsers);
    (Coupon.find as jest.Mock)
      .mockResolvedValueOnce([]) // Expiring coupons
      .mockResolvedValueOnce([mockCoupon]); // Expired coupons

    await sendCouponExpiryReminders();

    expect(Coupon.find).toHaveBeenCalledTimes(2);
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: ["user2"] }, status: UserStatus.ACTIVE }));
    expect(NotificationService.dispatchSystemNotification).toHaveBeenCalledWith(
      "COUPON_EXPIRED",
      mockUsers,
      expect.objectContaining({ "Coupon Code": "EXPIRED50" })
    );
    expect(mockCoupon.remindersSent).toContain("EXPIRED");
    expect(mockCoupon.status).toBe(CouponStatus.INACTIVE);
    expect(mockCoupon.save).toHaveBeenCalled();
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  it("[Negative] should not dispatch notifications if no applicable users found", async () => {
    const mockCoupon = {
      code: "NOUSERS",
      applicableUserType: ApplicableUsers.ALL,
      remindersSent: [] as string[],
      save: jest.fn().mockResolvedValue(true),
    };

    mockUserLean.mockResolvedValue([]); // No active users
    (Coupon.find as jest.Mock)
      .mockResolvedValueOnce([mockCoupon])
      .mockResolvedValueOnce([]);

    await sendCouponExpiryReminders();

    expect(NotificationService.dispatchSystemNotification).not.toHaveBeenCalled();
    expect(mockCoupon.remindersSent).toContain("EXPIRING_SOON");
    expect(mockCoupon.save).toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should catch and log error if Coupon.find throws a database exception", async () => {
    const dbError = new Error("Connection failed");
    (Coupon.find as jest.Mock).mockRejectedValue(dbError);

    await sendCouponExpiryReminders();

    expect(logger.error).toHaveBeenCalledWith("[CouponReminder] Error processing expiry reminders:", dbError);
  });
});
