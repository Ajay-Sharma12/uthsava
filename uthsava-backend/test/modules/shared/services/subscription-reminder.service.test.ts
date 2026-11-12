/// <reference types="jest" />
import {
  sendSubscriptionExpiryReminders,
  sendSubscriptionConfirmation,
} from "../../../../src/modules/shared/services/subscription-reminder.service";
import { UserSubscription, SubscriptionStatus } from "../../../../src/models/user-subscription.model";
import { EmailTemplate } from "../../../../src/models/email-template.model";
import { sendMail } from "../../../../src/modules/shared/services/mail.service";
import { NotificationService } from "../../../../src/modules/admin/services/notification.service";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/models/user-subscription.model", () => ({
  UserSubscription: {
    find: jest.fn(),
  },
  SubscriptionStatus: {
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED",
  },
}));

jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn(),
}));

jest.mock("../../../../src/modules/admin/services/notification.service", () => ({
  NotificationService: {
    dispatchSystemNotification: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Subscription Reminder Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  describe("sendSubscriptionExpiryReminders", () => {
    it("[Positive] should successfully send reminders and set status to EXPIRED for day 0", async () => {
      const mockUser = { _id: "user123", status: "ACTIVE", fullName: "John Doe", email: "john@doe.com" };
      const mockSub7Days = {
        _id: "sub7",
        userId: mockUser,
        endDate: new Date(),
        remindersSent: [] as string[],
        status: SubscriptionStatus.ACTIVE,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockSubExpired = {
        _id: "sub0",
        userId: mockUser,
        endDate: new Date(),
        remindersSent: [] as string[],
        status: SubscriptionStatus.ACTIVE,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockPopulate = jest.fn().mockResolvedValue([mockSub7Days]);
      const mockPopulate0 = jest.fn().mockResolvedValue([mockSubExpired]);

      (UserSubscription.find as jest.Mock)
        .mockReturnValueOnce({ populate: mockPopulate }) // 7 days
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) }) // 3 days
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) }) // 1 day
        .mockReturnValueOnce({ populate: mockPopulate0 }); // 0 days (expired)

      await sendSubscriptionExpiryReminders();

      expect(UserSubscription.find).toHaveBeenCalledTimes(4);
      expect(NotificationService.dispatchSystemNotification).toHaveBeenCalledTimes(2);
      expect(mockSub7Days.remindersSent).toContain("7_DAYS");
      expect(mockSubExpired.remindersSent).toContain("EXPIRED");
      expect(mockSubExpired.status).toBe(SubscriptionStatus.EXPIRED);
      expect(mockSub7Days.save).toHaveBeenCalled();
      expect(mockSubExpired.save).toHaveBeenCalled();
    });

    it("[Edge] should skip subscription if userId is missing or user is not active", async () => {
      const mockSubNoUser = {
        _id: "sub1",
        userId: null,
        remindersSent: [] as string[],
        save: jest.fn(),
      };
      const mockSubInactiveUser = {
        _id: "sub2",
        userId: { status: "INACTIVE" },
        remindersSent: [] as string[],
        save: jest.fn(),
      };

      const mockPopulate = jest.fn().mockResolvedValue([mockSubNoUser, mockSubInactiveUser]);
      (UserSubscription.find as jest.Mock).mockReturnValue({ populate: mockPopulate });

      await sendSubscriptionExpiryReminders();

      expect(NotificationService.dispatchSystemNotification).not.toHaveBeenCalled();
      expect(mockSubNoUser.save).not.toHaveBeenCalled();
      expect(mockSubInactiveUser.save).not.toHaveBeenCalled();
    });

    it("[Edge] should log error if UserSubscription.find throws an error", async () => {
      const dbError = new Error("DB Error");
      (UserSubscription.find as jest.Mock).mockImplementation(() => {
        throw dbError;
      });

      await sendSubscriptionExpiryReminders();

      expect(logger.error).toHaveBeenCalledWith("[SubscriptionReminder] Error processing expiry reminders:", dbError);
    });
  });

  describe("sendSubscriptionConfirmation", () => {
    it("[Positive] should successfully fetch template, replace placeholders, and send email", async () => {
      const mockUser = { fullName: "Jane Doe", email: "jane@doe.com" };
      const mockSub = { planName: "Premium Pass", planPrice: 199, expiryDate: new Date() };
      const mockTemplate = {
        keyword: "SUBSCRIPTION_CONFIRMATION",
        subject: "Welcome to Uthsava!",
        description: "Hello {{User Name}}, you paid {{amount}} for {{planName}} expiring on {{expiryDate}}. Invoice: {{invoiceUrl}}",
      };

      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
      (sendMail as jest.Mock).mockResolvedValue({ messageId: "mail123" });

      await sendSubscriptionConfirmation(mockUser, mockSub, "http://invoice.link");

      expect(EmailTemplate.findOne).toHaveBeenCalledWith({ keyword: "SUBSCRIPTION_CONFIRMATION" });
      expect(sendMail).toHaveBeenCalledWith(
        "jane@doe.com",
        "Welcome to Uthsava!",
        expect.stringContaining("Hello Jane Doe, you paid 199 for Premium Pass")
      );
      expect(logger.info).toHaveBeenCalledWith("Subscription confirmation email sent to: jane@doe.com");
    });

    it("[Negative] should warn and exit if email template is not found", async () => {
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

      await sendSubscriptionConfirmation({}, {});

      expect(sendMail).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("Email template SUBSCRIPTION_CONFIRMATION not found.");
    });

    it("[Edge] should log error if process throws exception", async () => {
      const genericError = new Error("Mail error");
      (EmailTemplate.findOne as jest.Mock).mockRejectedValue(genericError);

      await sendSubscriptionConfirmation({}, {});

      expect(logger.error).toHaveBeenCalledWith("Failed to process SUBSCRIPTION_CONFIRMATION email:", genericError);
    });
  });
});
