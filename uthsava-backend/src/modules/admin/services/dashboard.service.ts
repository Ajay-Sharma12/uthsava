import {
  User,
  UserStatus,
  UserSubscription,
  SubscriptionStatus,
  Content,
  Coupon,
  CouponStatus,
  ContentApprovalStatus,
  UploadedByType,
  WatchProgress,
  UserSession,
  PaymentTransaction,
  PaymentStatus,
} from "../../../models";

import { Role } from "../../../common/types/auth.types";

export interface DashboardStats {
  activeCoupons: number;
  activeCouponsTrend: number;
  activeCouponsSparkline: number[];

  pendingProducerApprovals: number;
  pendingProducerApprovalsTrend: number;
  pendingProducerApprovalsSparkline: number[];

  users: {
    totalUsers: number;
    totalActiveUsers: number;
    totalInactiveUsers: number;
    trend: number;
    sparkline: number[];
    activeTrend: number;
    activeSparkline: number[];
    inactiveTrend: number;
    inactiveSparkline: number[];
  };

  subAdmins: {
    totalSubAdmins: number;
    totalActiveSubAdmins: number;
  };

  producers: {
    totalProducers: number;
    totalActiveProducers: number;
    trend: number;
    sparkline: number[];
  };

  subscriptions: {
    active: number;
    expired: number;
    activeTrend: number;
    activeSparkline: number[];
    expiredTrend: number;
    expiredSparkline: number[];
  };

  content: {
    movies: number;
    series: number;
    total: number;
    moviesTrend: number;
    moviesSparkline: number[];
    seriesTrend: number;
    seriesSparkline: number[];
    totalTrend: number;
    totalSparkline: number[];
  };

  watchHours: {
    total: number;
    trend: number;
    sparkline: number[];
  };

  streamingSessions: {
    total: number;
    trend: number;
    sparkline: number[];
  };

  recentActivities: {
    newUsers: any[];
    newContent: any[];
    newSubscriptions: any[];
  };

  graphs: {
    revenueOverview: { label: string; revenue: number }[];
    userGrowth: { date: string; count: number }[];
    userActivity: { date: string; count: number }[];
    userStatus: { status: string; count: number }[];
  };
  quickActions: { label: string; action: string; icon: string }[];
}

const calculateSparklineAndTrend = async (
  Model: any,
  query: any,
  dateField: string = "createdAt",
  sumField?: string
) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const pipeline = [
    { $match: { ...query, [dateField]: { $gte: sevenDaysAgo, $lte: today } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } },
        val: sumField ? { $sum: `$${sumField}` } : { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await Model.aggregate(pipeline);
  const dailyCounts: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    dailyCounts[dateStr] = 0;
  }

  results.forEach((r: any) => {
    dailyCounts[r._id] = r.val;
  });

  const sparkline = Object.values(dailyCounts);

  // Simple trend: comparing last 3 days vs previous 3 days
  const recent3 = sparkline.slice(4, 7).reduce((a, b) => a + b, 0);
  const previous3 = sparkline.slice(1, 4).reduce((a, b) => a + b, 0);
  let trend = 0;
  if (previous3 === 0 && recent3 > 0) trend = 100;
  else if (previous3 > 0) trend = ((recent3 - previous3) / previous3) * 100;

  return { sparkline, trend };
};

export class DashboardService {
  static async getDashboardStats(
    fromDate?: string,
    toDate?: string,
  ): Promise<DashboardStats> {
    const dateFilter: Record<string, unknown> = {};

    if (fromDate || toDate) {
      const createdAt: Record<string, Date> = {};
      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        createdAt.$gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        createdAt.$lte = endDate;
      }
      dateFilter.createdAt = createdAt;
    }

    const today = new Date();
    const fortyEightHoursAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);

    const userRoleCondition = {
      $or: [
        { role: { $in: [Role.USER, "user", "USER"] } },
        { role: { $exists: false } },
        { role: null },
        { role: "" },
      ],
    };

    const [
      totalUsers,
      totalActiveUsers,
      totalInactiveUsers,
      totalSubAdmins,
      totalActiveSubAdmins,
      totalProducers,
      totalActiveProducers,
      activeSubscriptions,
      expiredSubscriptions,
      totalMovies,
      totalSeries,
      activeCoupons,
      pendingProducerApprovals,
      recentUsers,
      recentContent,
      recentSubscriptions,
      userGrowthData,
      userActivityData,
      userStatusData,
      watchHoursAgg,
      streamingSessionsAgg,
      revenueOverviewData,
      
      // Sparklines & Trends
      totalUsersSpark,
      activeUsersSpark,
      inactiveUsersSpark,
      producersSpark,
      moviesSpark,
      seriesSpark,
      totalContentSpark,
      activeSubsSpark,
      expiredSubsSpark,
      activeCouponsSpark,
      pendingProducersSpark,
      watchHoursSpark,
      sessionsSpark,
    ] = await Promise.all([
      User.countDocuments({ ...userRoleCondition, status: { $ne: UserStatus.DELETED }, ...dateFilter }),
      User.countDocuments({ ...userRoleCondition, status: { $in: [UserStatus.ACTIVE, "ACTIVE", "active"] }, ...dateFilter }),
      User.countDocuments({ ...userRoleCondition, status: { $in: [UserStatus.INACTIVE, "INACTIVE", "inactive", UserStatus.SUSPENDED, "SUSPENDED", "suspended"] }, ...dateFilter }),
      User.countDocuments({ role: { $in: [Role.ADMIN_SUB_USER, "admin_sub_user", "ADMIN_SUB_USER", "SUB_ADMIN", "sub_admin"] }, status: { $ne: UserStatus.DELETED }, ...dateFilter }),
      User.countDocuments({ role: { $in: [Role.ADMIN_SUB_USER, "admin_sub_user", "ADMIN_SUB_USER", "SUB_ADMIN", "sub_admin"] }, status: { $in: [UserStatus.ACTIVE, "ACTIVE", "active"] }, ...dateFilter }),
      User.countDocuments({ role: { $in: [Role.PRODUCER, "producer", "PRODUCER"] }, status: { $ne: UserStatus.DELETED }, ...dateFilter }),
      User.countDocuments({ role: { $in: [Role.PRODUCER, "producer", "PRODUCER"] }, status: { $in: [UserStatus.ACTIVE, "ACTIVE", "active"] }, ...dateFilter }),
      UserSubscription.countDocuments({ status: { $in: [SubscriptionStatus.ACTIVE, "ACTIVE", "active"] }, ...dateFilter }),
      UserSubscription.countDocuments({ status: { $in: [SubscriptionStatus.EXPIRED, "EXPIRED", "expired"] }, ...dateFilter }),
      Content.countDocuments({ type: { $in: ["MOVIE", "Movie", "movie"] }, ...dateFilter }),
      Content.countDocuments({ type: { $in: ["SERIES", "Series", "series"] }, ...dateFilter }),
      Coupon.countDocuments({ status: { $in: [CouponStatus.ACTIVE, "ACTIVE", "active"] }, ...(Object.keys(dateFilter).length > 0 && dateFilter) }),
      Content.countDocuments({ approvalStatus: { $in: [ContentApprovalStatus.PENDING, "PENDING", "pending", "AWAITING", "awaiting", "SUBMITTED", "submitted"] }, ...(Object.keys(dateFilter).length > 0 && dateFilter) }),
      
      User.find({ ...userRoleCondition, createdAt: { $gte: fortyEightHoursAgo } }).sort({ createdAt: -1 }).limit(10).select('firstName lastName fullName email profileImage createdAt status'),
      Content.find({ createdAt: { $gte: fortyEightHoursAgo } }).sort({ createdAt: -1 }).limit(10).select('title type thumbnail approvalStatus status createdAt'),
      UserSubscription.find({ createdAt: { $gte: fortyEightHoursAgo } }).populate('userId', 'firstName lastName email').sort({ createdAt: -1 }).limit(10),

      User.aggregate([
        { $match: { ...userRoleCondition, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { ...userRoleCondition, lastLoginAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { ...userRoleCondition } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Total Watch Hours
      WatchProgress.aggregate([
        { $match: { ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter.createdAt }) } },
        { $group: { _id: null, totalSeconds: { $sum: "$watchedDuration" } } }
      ]),

      // Streaming Sessions
      UserSession.countDocuments({ ...dateFilter }),

      // Revenue Overview (Last 6 months)
      PaymentTransaction.aggregate([
        { 
          $match: { 
            status: { $in: [PaymentStatus.SUCCESS, "SUCCESS", "success", "COMPLETED", "completed"] }, 
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$finalAmount" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Sparklines
      calculateSparklineAndTrend(User, { ...userRoleCondition, status: { $ne: UserStatus.DELETED } }),
      calculateSparklineAndTrend(User, { ...userRoleCondition, status: { $in: [UserStatus.ACTIVE, "ACTIVE", "active"] } }),
      calculateSparklineAndTrend(User, { ...userRoleCondition, status: { $in: [UserStatus.INACTIVE, "INACTIVE", "inactive", UserStatus.SUSPENDED, "SUSPENDED", "suspended"] } }),
      calculateSparklineAndTrend(User, { role: { $in: [Role.PRODUCER, "producer", "PRODUCER"] }, status: { $ne: UserStatus.DELETED } }),
      calculateSparklineAndTrend(Content, { type: { $in: ["MOVIE", "Movie", "movie"] } }),
      calculateSparklineAndTrend(Content, { type: { $in: ["SERIES", "Series", "series"] } }),
      calculateSparklineAndTrend(Content, {}),
      calculateSparklineAndTrend(UserSubscription, { status: { $in: [SubscriptionStatus.ACTIVE, "ACTIVE", "active"] } }),
      calculateSparklineAndTrend(UserSubscription, { status: { $in: [SubscriptionStatus.EXPIRED, "EXPIRED", "expired"] } }),
      calculateSparklineAndTrend(Coupon, { status: { $in: [CouponStatus.ACTIVE, "ACTIVE", "active"] } }),
      calculateSparklineAndTrend(Content, { approvalStatus: { $in: [ContentApprovalStatus.PENDING, "PENDING", "pending", "AWAITING", "awaiting"] } }),
      calculateSparklineAndTrend(WatchProgress, {}, "updatedAt", "watchedDuration"),
      calculateSparklineAndTrend(UserSession, {}),
    ]);

    const formatGraphData = (data: any[], keyMap: { id: string, val: string }) => 
      data.map((item) => ({ [keyMap.id]: item._id, [keyMap.val]: item.count }));

    const totalWatchHours = watchHoursAgg.length > 0 ? parseFloat((watchHoursAgg[0].totalSeconds / 3600).toFixed(2)) : 0;
    
    // Formatting revenue overview labels (e.g., "2023-01" -> "Jan")
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedRevenue = revenueOverviewData.map((item: any) => {
      const parts = item._id.split("-");
      const monthIdx = parseInt(parts[1], 10) - 1;
      return { label: months[monthIdx], revenue: item.revenue };
    });

    return {
      activeCoupons,
      activeCouponsTrend: activeCouponsSpark.trend,
      activeCouponsSparkline: activeCouponsSpark.sparkline,

      pendingProducerApprovals,
      pendingProducerApprovalsTrend: pendingProducersSpark.trend,
      pendingProducerApprovalsSparkline: pendingProducersSpark.sparkline,

      users: {
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,
        trend: totalUsersSpark.trend,
        sparkline: totalUsersSpark.sparkline,
        activeTrend: activeUsersSpark.trend,
        activeSparkline: activeUsersSpark.sparkline,
        inactiveTrend: inactiveUsersSpark.trend,
        inactiveSparkline: inactiveUsersSpark.sparkline,
      },

      subAdmins: {
        totalSubAdmins,
        totalActiveSubAdmins,
      },

      producers: {
        totalProducers,
        totalActiveProducers,
        trend: producersSpark.trend,
        sparkline: producersSpark.sparkline,
      },

      subscriptions: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        activeTrend: activeSubsSpark.trend,
        activeSparkline: activeSubsSpark.sparkline,
        expiredTrend: expiredSubsSpark.trend,
        expiredSparkline: expiredSubsSpark.sparkline,
      },

      content: {
        movies: totalMovies,
        series: totalSeries,
        total: totalMovies + totalSeries,
        moviesTrend: moviesSpark.trend,
        moviesSparkline: moviesSpark.sparkline,
        seriesTrend: seriesSpark.trend,
        seriesSparkline: seriesSpark.sparkline,
        totalTrend: totalContentSpark.trend,
        totalSparkline: totalContentSpark.sparkline,
      },

      watchHours: {
        total: totalWatchHours,
        trend: watchHoursSpark.trend,
        sparkline: watchHoursSpark.sparkline.map(s => parseFloat((s / 3600).toFixed(2))), // convert seconds to hours
      },

      streamingSessions: {
        total: streamingSessionsAgg,
        trend: sessionsSpark.trend,
        sparkline: sessionsSpark.sparkline,
      },

      recentActivities: {
        newUsers: recentUsers,
        newContent: recentContent,
        newSubscriptions: recentSubscriptions,
      },

      graphs: {
        revenueOverview: formattedRevenue.length > 0 ? formattedRevenue : [{ label: "No Data", revenue: 0 }],
        userGrowth: formatGraphData(userGrowthData, { id: 'date', val: 'count' }) as { date: string, count: number }[],
        userActivity: formatGraphData(userActivityData, { id: 'date', val: 'count' }) as { date: string, count: number }[],
        userStatus: formatGraphData(userStatusData, { id: 'status', val: 'count' }) as { status: string, count: number }[],
      },

      quickActions: [
        { label: "Add New User", action: "/admin/users/create", icon: "user-plus" },
        { label: "Upload Content", action: "/admin/content/upload", icon: "upload-cloud" },
        { label: "View Reports", action: "/admin/reports", icon: "bar-chart" },
        { label: "Manage Roles", action: "/admin/roles", icon: "shield" },
      ]
    };
  }
}
