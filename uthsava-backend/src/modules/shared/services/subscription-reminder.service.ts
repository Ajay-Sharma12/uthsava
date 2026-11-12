import moment from "moment";
import { UserSubscription, SubscriptionStatus } from "../../../models/user-subscription.model";
import { User } from "../../../models/user.model";
import { EmailTemplate } from "../../../models/email-template.model";
import { sendMail } from "./mail.service";
import { logger } from "../../../core/constants/logger";

import { NotificationType } from "../../../models/admin-sent-notification.model";
import { NotificationService } from "../../admin/services/notification.service";

export const sendSubscriptionExpiryReminders = async (): Promise<void> => {
  logger.info("[SubscriptionReminder] Starting subscription expiry check...");

  try {
    const today = moment().startOf("day");

    // Config: days -> NotificationType and reminder key
    const targets = [
      { days: 7, type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER_7_DAYS, key: "7_DAYS" },
      { days: 3, type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER_3_DAYS, key: "3_DAYS" },
      { days: 1, type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER_1_DAY, key: "1_DAY" },
      { days: 0, type: NotificationType.SUBSCRIPTION_EXPIRED, key: "EXPIRED" } // expired yesterday/today
    ];

    let processedCount = 0;

    for (const target of targets) {
      let startOfDay, endOfDay;

      if (target.days === 0) {
        // Expired (yesterday)
        startOfDay = moment(today).subtract(1, "days").toDate();
        endOfDay = moment(today).subtract(1, "days").endOf("day").toDate();
      } else {
        startOfDay = moment(today).add(target.days, "days").toDate();
        endOfDay = moment(today).add(target.days, "days").endOf("day").toDate();
      }

      // Find active subscriptions expiring on this specific day that haven't been reminded yet
      const expiringSubscriptions = await UserSubscription.find({
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        remindersSent: { $ne: target.key }
      }).populate("userId");

      for (const sub of expiringSubscriptions) {
        if (!sub.userId) continue;

        const user: any = sub.userId;
        if (user.status !== "ACTIVE") continue;

        const expiryDateStr = moment(sub.endDate).format("MMMM Do YYYY");
        const renewalLink = `${process.env.FRONTEND_URL || "https://uthsava.com"}/subscription/renew`;

        // We dispatch the system notification
        await NotificationService.dispatchSystemNotification(
          target.type,
          [user],
          {
            "User Name": user.fullName || user.firstName || "User",
            "Expiry Date": expiryDateStr,
            "Renewal Link": renewalLink,
            "Days Left": target.days.toString()
          }
        );

        sub.remindersSent = [...(sub.remindersSent || []), target.key];

        if (target.days === 0) {
          sub.status = SubscriptionStatus.EXPIRED;
        }

        await sub.save();
        processedCount++;
      }
    }

    logger.info(`[SubscriptionReminder] Finished checking. Dispatched ${processedCount} reminders/notices.`);
  } catch (error) {
    logger.error("[SubscriptionReminder] Error processing expiry reminders:", error);
  }
};

/**
 * Call this function whenever a user successfully purchases a subscription.
 * Since the payment gateway (Stripe/Razorpay) webhook isn't implemented yet, 
 * you can call this manually after saving the new Subscription document.
 */
export const sendSubscriptionConfirmation = async (user: any, subscription: any, invoiceUrl: string = ""): Promise<void> => {
  try {
    const emailTemplate = await EmailTemplate.findOne({ keyword: "SUBSCRIPTION_CONFIRMATION" });
    if (!emailTemplate) {
      logger.warn("Email template SUBSCRIPTION_CONFIRMATION not found.");
      return;
    }

    let emailBody = emailTemplate.description || "";
    emailBody = emailBody.replaceAll("{{Plan Name}}", subscription.planName);
    emailBody = emailBody.replaceAll("{{planName}}", subscription.planName);
    emailBody = emailBody.replaceAll("{{Amount Paid}}", `${subscription.planPrice}`);
    emailBody = emailBody.replaceAll("{{amountPaid}}", `${subscription.planPrice}`);
    emailBody = emailBody.replaceAll("{{amount}}", `${subscription.planPrice}`);
    emailBody = emailBody.replaceAll("{{Expiry Date}}", moment(subscription.expiryDate).format("MMMM Do YYYY"));
    emailBody = emailBody.replaceAll("{{expiryDate}}", moment(subscription.expiryDate).format("MMMM Do YYYY"));
    const finalInvoiceUrl = invoiceUrl || `${process.env.FRONTEND_URL || "https://uthsava.com"}/invoices`;
    emailBody = emailBody.replaceAll("{{Invoice Link}}", finalInvoiceUrl);
    emailBody = emailBody.replaceAll("{{invoiceLink}}", finalInvoiceUrl);
    emailBody = emailBody.replaceAll("{{invoiceUrl}}", finalInvoiceUrl);
    
    // User variables in case the template was customized to use them
    const userName = user.fullName || user.firstName || "User";
    emailBody = emailBody.replaceAll("{{userName}}", userName);
    emailBody = emailBody.replaceAll("{{User Name}}", userName);
    emailBody = emailBody.replaceAll("{{name}}", userName);
    emailBody = emailBody.replaceAll("{{userEmail}}", user.email || "");
    emailBody = emailBody.replaceAll("{{email}}", user.email || "");

    await sendMail(
      user.email,
      emailTemplate.subject || "Subscription Confirmation",
      emailBody
    );
    logger.info(`Subscription confirmation email sent to: ${user.email}`);
  } catch (error) {
    logger.error("Failed to process SUBSCRIPTION_CONFIRMATION email:", error);
  }
};
