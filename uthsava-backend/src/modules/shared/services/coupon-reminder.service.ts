import moment from "moment";
import { Coupon, CouponStatus, ApplicableUsers } from "../../../models/coupon.model";
import { User, UserStatus } from "../../../models/user.model";
import { NotificationType } from "../../../models/admin-sent-notification.model";
import { NotificationService } from "../../admin/services/notification.service";
import { logger } from "../../../core/constants/logger";

export const sendCouponExpiryReminders = async (): Promise<void> => {
  logger.info("[CouponReminder] Starting daily coupon expiry check...");

  try {
    const today = moment().startOf("day");
    const tomorrowStart = moment(today).add(1, "days").toDate();
    const tomorrowEnd = moment(today).add(1, "days").endOf("day").toDate();

    const yesterdayStart = moment(today).subtract(1, "days").toDate();
    const yesterdayEnd = moment(today).subtract(1, "days").endOf("day").toDate();

    // 1. Coupons Expiring Soon (1 day left)
    const expiringCoupons = await Coupon.find({
      status: CouponStatus.ACTIVE,
      expiryAt: {
        $gte: tomorrowStart,
        $lte: tomorrowEnd
      },
      remindersSent: { $ne: "EXPIRING_SOON" }
    });

    for (const coupon of expiringCoupons) {
      const targetUsers = await getApplicableUsers(coupon);
      if (targetUsers.length > 0) {
        await NotificationService.dispatchSystemNotification(
          NotificationType.COUPON_EXPIRING_SOON,
          targetUsers,
          {
            "Coupon Code": coupon.code,
            "Discount": `${coupon.discountValue}${coupon.discountType === "PERCENTAGE" ? "%" : " " + process.env.CURRENCY || ""}`,
          }
        );
      }

      coupon.remindersSent = [...(coupon.remindersSent || []), "EXPIRING_SOON"];
      await coupon.save();
    }

    // 2. Coupons Expired (yesterday)
    const expiredCoupons = await Coupon.find({
      status: CouponStatus.ACTIVE, // Keep active to catch them, we may deactivate later
      expiryAt: {
        $gte: yesterdayStart,
        $lte: yesterdayEnd
      },
      remindersSent: { $ne: "EXPIRED" }
    });

    for (const coupon of expiredCoupons) {
      const targetUsers = await getApplicableUsers(coupon);
      if (targetUsers.length > 0) {
        await NotificationService.dispatchSystemNotification(
          NotificationType.COUPON_EXPIRED,
          targetUsers,
          {
            "Coupon Code": coupon.code,
          }
        );
      }

      coupon.remindersSent = [...(coupon.remindersSent || []), "EXPIRED"];
      // Also automatically mark as INACTIVE since it's expired
      coupon.status = CouponStatus.INACTIVE;
      await coupon.save();
    }

    logger.info(`[CouponReminder] Finished checking. Expiring Soon: ${expiringCoupons.length}, Expired: ${expiredCoupons.length}.`);
  } catch (error) {
    logger.error("[CouponReminder] Error processing expiry reminders:", error);
  }
};

async function getApplicableUsers(coupon: any) {
  if (coupon.applicableUserType === ApplicableUsers.SELECTED) {
    return User.find({
      _id: { $in: coupon.applicableUserIds || [] },
      status: UserStatus.ACTIVE
    }).select("_id email mobile notificationEnabled deviceToken deviceType countryCode").lean();
  } else {
    return User.find({
      status: UserStatus.ACTIVE,
      role: "USER" // Assuming coupons are for normal users
    }).select("_id email mobile notificationEnabled deviceToken deviceType countryCode").lean();
  }
}
