import { PipelineStage, Types } from "mongoose";
import {
  IUser,
  UserStatus,
  Gender,
  User,
  UserSubscription,
  SubscriptionStatus,
  UserSession,
  Watchlist,
  WatchProgress,
  UserProfile,
} from "../../../models";
import * as crypto from "node:crypto";
import { PASSWORD_CONFIG } from "../../../core/constants/app.constants";
import { logger } from "../../../core/constants/logger";
import { config } from "../../../core/config";
import {
  QueryBuilder,
  USER_SEARCH_FIELDS,
} from "../../shared/helpers/query-builder.helper";
import { Role } from "../../../common/types/auth.types";
import bcrypt from "bcryptjs";
import {
  sanitizeSubAdminPermissions,
  ALLOWED_SUBADMIN_PERMISSION_MODULES,
} from "../helpers/subadmin-permissions.helper";

/**
 * User Service
 * Handles business logic for user management
 */
export class UserService {
  /**
   * Extract first name and last name from full name
   */
  static extractNames(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const trimmedName = fullName.trim();
    const nameParts = trimmedName.split(/\s+/);

    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: "" };
    }

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    return { firstName, lastName };
  }

  /**
   * Generate a cryptographically secure random password
   * @returns A secure random password meeting complexity requirements
   */
  static generateSecurePassword(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";

    const allChars = uppercase + lowercase + numbers + symbols;
    const passwordLength = PASSWORD_CONFIG.GENERATED_LENGTH;
    let password = "";

    // Helper function to get cryptographically secure random character from a string
    const getSecureRandomChar = (chars: string): string => {
      const randomBytes = crypto.randomBytes(1);
      const randomIndex = randomBytes[0] % chars.length;
      return chars[randomIndex];
    };

    // Ensure at least one character from each set
    password += getSecureRandomChar(uppercase);
    password += getSecureRandomChar(lowercase);
    password += getSecureRandomChar(numbers);
    password += getSecureRandomChar(symbols);

    // Fill the rest with random characters
    for (let i = 4; i < passwordLength; i++) {
      password += getSecureRandomChar(allChars);
    }

    // Shuffle using Fisher-Yates algorithm with crypto.randomBytes
    const passwordArray = password.split("");
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const randomBytes = crypto.randomBytes(2);
      const j = randomBytes.readUInt16LE(0) % (i + 1);
      [passwordArray[i], passwordArray[j]] = [
        passwordArray[j],
        passwordArray[i],
      ];
    }

    return passwordArray.join("");
  }

  /**
   * List users for admin management with subscription and account filters.
   */
  static async listUsers(params: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    search?: string;
    status?: UserStatus;
    accountStatus?: UserStatus;
    subscriptionStatus?: SubscriptionStatus | "Inactive";
    subscriptionPlan?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = params;

      const skip = (page - 1) * limit;
      const sortDirection = sortOrder === "asc" ? 1 : -1;

      const matchQuery: Record<string, any> = {
        $or: [
          { role: { $in: [Role.USER, "user", "USER"] } },
          { role: { $exists: false } },
          { role: null },
          { role: "" },
        ],
        status: { $ne: UserStatus.DELETED },
      };

      // Account Status Filter
      const accountStatus = params.accountStatus || params.status;

      if (accountStatus && (accountStatus as string) !== "all") {
        matchQuery.status = { $regex: new RegExp(`^${accountStatus}$`, "i") };
      }

      // Search
      if (params.search && params.search.trim()) {
        const searchRegex = new RegExp(params.search.trim(), "i");

        matchQuery.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
        ];
      }

      // Date Filter
      if (params.startDate || params.endDate) {
        const dateFilter = QueryBuilder.buildDateRangeFilter(
          params.startDate,
          params.endDate,
          "createdAt",
        );
        if (dateFilter && dateFilter.$or) {
          if (matchQuery.$or) {
            const searchOr = matchQuery.$or;
            delete matchQuery.$or;
            matchQuery.$and = [
              { $or: searchOr },
              dateFilter,
            ];
          } else {
            Object.assign(matchQuery, dateFilter);
          }
        } else if (dateFilter) {
          Object.assign(matchQuery, dateFilter);
        }
      }

      // Safe Sorting
      const sortFieldMap: Record<string, string> = {
        name: "fullName",
        date: "createdAt",
        registrationDate: "createdAt",
        created: "createdAt",
        updated: "updatedAt",
        id: "userId",
        lastLoginDate: "lastLoginAt",
      };

      const sortableFields = new Set([
        "userId",
        "email",
        "fullName",
        "mobile",
        "status",
        "createdAt",
        "updatedAt",
        "lastLoginAt",
        "subscriptionStatus",
        "registrationDate",
      ]);

      const mappedSortBy = sortFieldMap[sortBy] || sortBy;

      const safeSortBy = sortableFields.has(mappedSortBy)
        ? mappedSortBy
        : "createdAt";

      const pipeline: PipelineStage[] = [
        {
          $match: matchQuery,
        },

        // Latest Subscription
        {
          $lookup: {
            from: "usersubscriptions",
            let: { userId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$userId", "$$userId"],
                  },
                },
              },
              {
                $sort: {
                  createdAt: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $lookup: {
                  from: "subscriptionplans",
                  localField: "planId",
                  foreignField: "_id",
                  as: "planDetails"
                }
              },
              {
                $unwind: {
                  path: "$planDetails",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $project: {
                  _id: 1,
                  planId: 1,
                  planName: "$planDetails.name",
                  planPrice: "$planDetails.monthlyPrice",
                  status: 1,
                  expiryDate: "$endDate",
                  autoRenew: "$autoRenewal",
                },
              },
            ],
            as: "latestSubscription",
          },
        },

        {
          $unwind: {
            path: "$latestSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $addFields: {
            registrationDate: "$createdAt",
            subscriptionStatus: {
              $ifNull: ["$latestSubscription.status", "$subscriptionStatus", "none"],
            },
          },
        },
      ];

      // Subscription Filter
      if (params.subscriptionStatus && (params.subscriptionStatus as string) !== "all") {
        pipeline.push({
          $match: {
            subscriptionStatus: params.subscriptionStatus,
          },
        });
      }

      if (params.subscriptionPlan) {
        pipeline.push({
          $match: {
            "latestSubscription.planName": { $regex: new RegExp(`^${params.subscriptionPlan}$`, "i") },
          },
        });
      }

      // Pagination + Count
      pipeline.push({
        $facet: {
          data: [
            {
              $sort: {
                [safeSortBy]: sortDirection,
                _id: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                password: 0,
                refreshToken: 0,
                permissions: 0,
                customPermissions: 0,
              },
            },
          ],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      });

      const result = await User.aggregate(pipeline);
      const users = result[0]?.data || [];

      const totalCount = result[0]?.totalCount?.[0]?.count || 0;

      const totalPages = Math.ceil(totalCount / limit);

      // Fetch status counts for the stats cards
      const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
        User.countDocuments({
          role: Role.USER,
          status: { $ne: UserStatus.DELETED },
        }),
        User.countDocuments({ role: Role.USER, status: UserStatus.ACTIVE }),
        User.countDocuments({ role: Role.USER, status: UserStatus.INACTIVE }),
      ]);

      return {

        data: users.map((user: any) => {

          return {
            id: user._id,
            userId: user.userId,

            name:
              user.fullName ||
              `${user.firstName || ""} ${user.lastName || ""}`.trim(),

            email: user.email,

            mobile: user.mobile || "",

            countryCode: user.countryCode || null,

            registrationDate: user.createdAt,

            subscriptionStatus: user.subscriptionStatus,

            activeSubscriptionPlan: user.latestSubscription || null,

            accountStatus: user.status,

            loginType: user.loginType || "Mobile",

            lastLoginDate: user.lastLoginAt || null,

            profileImageUrl: this.buildProfileImageUrl(user.profileImage),
          };
        }),

        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },

        counts: {
          totalUsers,
          activeUsers,
          inactiveUsers,
        },
      };
    } catch (error: any) {
      logger.error("LIST USERS ERROR:", error);
      throw new Error(error.message || "Failed to fetch users");
    }
  }

  /**
   * Get user by MongoDB _id
   */
  static async getUserById(id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error("error.invalidUserId");
      }

      const user = await User.findById(id)
        .select("-password -refreshToken")
        .lean();

      if (!user) {
        throw new Error("error.userNotFound");
      }

      const [
        activeSubscription,
        devices,
        watchlistCount,
        watchProgressStats,
        subscriptionHistory,
        continueWatching,
        watchHistory,
        userProfile,
      ] = await Promise.all([
        // 0. Active Subscription
        UserSubscription.findOne({
          userId: user._id,
          status: SubscriptionStatus.ACTIVE,
        })
          .populate("planId")
          .sort({ createdAt: -1 })
          .lean(),

        // 3. Devices
        UserSession.find({ userId: user._id })
          .sort({ lastActiveAt: -1 })
          .lean(),

        // 4. Watchlist Count
        Watchlist.countDocuments({ userId: user._id }),

        // 5. Watch Progress Stats (for Watch Hours)
        WatchProgress.aggregate([
          { $match: { userId: user._id } },
          {
            $group: {
              _id: null,
              totalSeconds: { $sum: "$watchedDuration" },
            },
          },
        ]),

        // 6. Subscription History
        UserSubscription.find({ userId: user._id })
          .populate("planId")
          .sort({ createdAt: -1 })
          .lean(),

        // 7. Continue Watching
        WatchProgress.find({ userId: user._id, isCompleted: false })
          .populate("contentId", "title thumbnail type")
          .sort({ lastWatchedAt: -1 })
          .limit(10)
          .lean(),

        // 8. Watch History
        WatchProgress.find({ userId: user._id, isCompleted: true })
          .populate("contentId", "title thumbnail type")
          .sort({ lastWatchedAt: -1 })
          .limit(20)
          .lean(),

        // 9. User Profile
        UserProfile.findOne({ userId: user._id, isDefault: true })
          .populate("preferredLanguageIds", "name")
          .lean(),
      ]);



      // Build devices list from UserSession collection
      let formattedDevices = devices.map((d: any) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName || d.deviceType,
        deviceType: d.deviceType,
        osVersion: d.osVersion || "Unknown",
        appVersion: d.appVersion || "Unknown",
        lastLoginDate: d.lastActiveAt || d.createdAt,
        activeSessionStatus: d.isActive !== false ? "Active" : "Inactive",
      }));

      // Fallback: If no UserSession document exists yet, populate from user profile / login fields
      if (formattedDevices.length === 0) {
        const fallbackDeviceType = user.deviceType || user.lastLoginDevice || user.loginType || "Mobile";
        const fallbackDeviceId = user.deviceId || `DEV-${user._id?.toString()?.slice(-6) || "9999"}`;
        const fallbackLastLoginDate = user.lastLoginAt || user.updatedAt || user.createdAt;

        formattedDevices = [
          {
            deviceId: fallbackDeviceId,
            deviceName: fallbackDeviceType,
            deviceType: fallbackDeviceType,
            osVersion: "Unknown",
            appVersion: "Unknown",
            lastLoginDate: fallbackLastLoginDate,
            activeSessionStatus: "Active",
          },
        ];
      }

      const primaryDevice = formattedDevices[0];
      const watchSeconds = watchProgressStats[0]?.totalSeconds || 0;
      const watchHours = parseFloat((watchSeconds / 3600).toFixed(2));

      return {
        profile: {
          ...user,
          deviceId: user.deviceId || primaryDevice.deviceId,
          deviceType: user.deviceType || primaryDevice.deviceType,
          deviceToken: user.deviceToken || null,
          lastLoginAt: user.lastLoginAt || primaryDevice.lastLoginDate,
          lastLoginIp: user.lastLoginIp || "Not Available",
          lastLoginDevice: user.lastLoginDevice || primaryDevice.deviceName,
          profileImageUrl: this.buildProfileImageUrl(user.profileImage),
          country: user.country || "Not Provided",
          dateOfBirth: user.age ? `Age: ${user.age}` : "Not Provided", // Using Age as DOB fallback
        },

        // Top Level Overview Metrics requested by Admin
        planExpiryDate: activeSubscription?.endDate || null,
        lastActiveDevice: primaryDevice.deviceName || primaryDevice.deviceType,
        deviceCount: formattedDevices.length,
        watchHours: watchHours,
        watchlistCount: watchlistCount,
        paymentStatus: activeSubscription ? "ACTIVE" : "NO_PAYMENTS",
        supportTickets: 0,

        // 1. Subscription Information
        subscriptionInformation: {
          currentPlan: activeSubscription ? (activeSubscription as any).planId?.name : "No Active Plan",
          planType: activeSubscription ? (activeSubscription as any).planId?.type : null,
          planStartDate: activeSubscription?.startDate || null,
          planExpiryDate: activeSubscription?.endDate || null,
          autoRenewalStatus: activeSubscription?.autoRenewal || false,
          subscriptionHistory: subscriptionHistory,
          previousPlans: subscriptionHistory.filter((sub: any) => sub._id.toString() !== activeSubscription?._id?.toString()),
        },

        // 2. Device Information
        deviceInformation: formattedDevices,

        // 3. Watch Activity
        watchActivity: {
          continueWatching: continueWatching,
          watchHistory: watchHistory,
          favouriteContent: [], // Note: Favourite content model not explicitly implemented, fallback to watchlist conceptually or empty
          watchlistCount: watchlistCount,
          viewingDurationHours: watchHours,
          preferredLanguage: userProfile && userProfile.preferredLanguageIds ? userProfile.preferredLanguageIds.map((l: any) => l.name).join(", ") : "Not Set",
        },

        // 4. Support History
        supportHistory: [],

        // 5. Security Details
        securityDetails: {
          lastPasswordReset: user.updatedAt, // Fallback since specific reset date isn't explicitly tracked separate from profile update
          failedLoginAttempts: user.loginAttempts || 0,
          activeSessionsCount: devices.filter((d: any) => d.isActive).length,
          suspiciousActivityFlags: [], // Fraud flag model not implemented yet
          accountLockStatus: user.loginLockUntil && new Date(user.loginLockUntil) > new Date() ? "Locked" : "Unlocked",
        },

      };
    } catch (error: any) {
      logger.error("GET USER ERROR:", error);
      throw new Error(error.message || "Failed to fetch user");
    }
  }
  /**
   * Update user status by MongoDB _id
   */
  static async updateUserStatus(id: string, status: UserStatus) {
    if (!Object.values(UserStatus).includes(status)) {
      throw new Error("error.invalidStatusValue");
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        status,
        ...(status === UserStatus.INACTIVE ||
          status === UserStatus.SUSPENDED ||
          status === UserStatus.DELETED
          ? { refreshToken: null, deviceToken: null, deviceType: null }
          : {}),
      },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      throw new Error("error.userNotFound");
    }

    if (
      status === UserStatus.INACTIVE ||
      status === UserStatus.SUSPENDED ||
      status === UserStatus.DELETED
    ) {
      await UserSession.deleteMany({ userId: user._id });
    }

    return user.toJSON();
  }

  /**
   * Validate email uniqueness
   */
  private static async validateEmailUniqueness(
    email: string | undefined,
    userId: string,
    currentUserEmail: string,
  ): Promise<void> {
    if (email && email.toLowerCase() !== currentUserEmail) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingEmail) {
        throw new Error("error.emailAlreadyExists");
      }
    }
  }

  /**
   * Validate mobile uniqueness
   */
  private static async validateMobileUniqueness(
    mobile: string | undefined,
    countryCode: number | undefined,
    userId: string,
    currentUserMobile: string,
    currentUserCountryCode: number,
  ): Promise<void> {
    if (
      (mobile || countryCode) &&
      (mobile !== currentUserMobile || countryCode !== currentUserCountryCode)
    ) {
      const mobileToCheck = mobile || currentUserMobile;
      const countryCodeToCheck = countryCode ?? currentUserCountryCode;

      const existingMobile = await User.findOne({
        countryCode: countryCodeToCheck,
        mobile: mobileToCheck,
        _id: { $ne: userId },
      });
      if (existingMobile) {
        throw new Error("error.mobileNumberAlreadyExistsWithThisCountryCode");
      }
    }
  }

  /**
   * Create a new user / subscriber
   */
  static async createUser(data: {
    fullName: string;
    email: string;
    countryCode: number;
    mobile: string;
    gender?: Gender;
    status?: UserStatus;
    profileImage?: string;
    password?: string;
    dateOfBirth?: string;
    state?: string;
    city?: string;
    country?: string;
  }) {
    if (!data.fullName || data.fullName.trim() === "") {
      throw new Error("error.fullNameIsRequired");
    }

    if (!data.email || data.email.trim() === "") {
      throw new Error("error.emailIsRequired");
    }

    // 1. Validate email uniqueness
    const existingEmail = await User.findOne({
      email: data.email.trim().toLowerCase(),
    });
    if (existingEmail) {
      throw new Error("error.emailAlreadyExists");
    }

    // 2. Validate mobile uniqueness
    if (data.mobile) {
      const existingMobile = await User.findOne({
        countryCode: data.countryCode || 91,
        mobile: data.mobile.trim(),
      });
      if (existingMobile) {
        throw new Error("error.mobileNumberAlreadyExistsWithThisCountryCode");
      }
    }

    const { firstName, lastName } = this.extractNames(data.fullName);
    const passwordToUse = data.password || this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    const newUser = new User({
      fullName: data.fullName.trim(),
      firstName,
      lastName,
      email: data.email.trim().toLowerCase(),
      countryCode: data.countryCode || 91,
      mobile: data.mobile.trim(),
      gender: data.gender || Gender.MALE,
      status: data.status || UserStatus.ACTIVE,
      role: Role.USER,
      profileImage: this.processProfileImage(data.profileImage || ""),
      password: hashedPassword,
      state: data.state || "",
      city: data.city || "",
      country: data.country || "India",
      dateOfBirth: data.dateOfBirth,
    });

    await newUser.save();

    // Create default UserProfile
    try {
      await UserProfile.create({
        userId: newUser._id,
        profileName: data.fullName.trim(),
        avatar: newUser.profileImage,
        isDefault: true,
        isKid: false,
      });
    } catch (e) {
      logger.warn("Could not create default UserProfile for new user:", e);
    }

    logger.info("User created successfully:", newUser.userId);
    return this.sanitizeUser(newUser);
  }

  /**
   * Build update data object
   */
  private static buildUpdateData(data: {
    fullName?: string;
    email?: string;
    countryCode?: number;
    mobile?: string;
    gender?: Gender;
    status?: UserStatus;
    profileImage?: string;
    country?: string;
    state?: string;
    city?: string;
    dateOfBirth?: string;
  }): Record<string, unknown> {
    const updateData: any = {};

    if (data.email !== undefined) {
      updateData.email = data.email.toLowerCase().trim();
    }

    if (data.fullName !== undefined) {
      const { firstName, lastName } = this.extractNames(data.fullName);
      updateData.fullName = data.fullName.trim();
      updateData.firstName = firstName;
      updateData.lastName = lastName;
    }

    if (data.countryCode !== undefined) {
      updateData.countryCode = data.countryCode;
    }

    if (data.mobile !== undefined) {
      updateData.mobile = data.mobile.trim();
    }

    if (data.gender !== undefined) {
      updateData.gender = data.gender;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.country !== undefined) {
      updateData.country = data.country;
    }

    if (data.state !== undefined) {
      updateData.state = data.state;
    }

    if (data.city !== undefined) {
      updateData.city = data.city;
    }

    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth;
    }

    if (data.profileImage !== undefined) {
      updateData.profileImage = this.processProfileImage(data.profileImage);
    }

    return updateData;
  }

  /**
   * Process profile image URL/key
   */
  private static processProfileImage(profileImage: string): string | undefined {
    if (!profileImage || profileImage.trim() === "") {
      return undefined;
    }

    if (profileImage.startsWith(config.aws.cloudFrontUrl)) {
      return profileImage.replace(`${config.aws.cloudFrontUrl}/`, "");
    }

    return profileImage;
  }

  private static buildProfileImageUrl(profileImage?: string): string {
    if (!profileImage || typeof profileImage !== "string") {
      return "";
    }

    if (
      profileImage.startsWith("http://") ||
      profileImage.startsWith("https://")
    ) {
      return profileImage;
    }

    return `${config.aws.cloudFrontUrl}/${profileImage}`;
  }

  /**
   * Update user information by MongoDB _id
   */
  static async updateUser(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      countryCode?: number;
      mobile?: string;
      gender?: Gender;
      status?: UserStatus;
      profileImage?: string;
      country?: string;
      state?: string;
      city?: string;
      dateOfBirth?: string;
      password?: string;
    },
  ) {
    // Find existing user
    const user = await User.findById(id);
    if (!user) {
      throw new Error("error.userNotFound");
    }

    // Validate email uniqueness
    await this.validateEmailUniqueness(data.email, id, user.email || "");

    // Validate mobile uniqueness
    await this.validateMobileUniqueness(
      data.mobile,
      data.countryCode,
      id,
      user.mobile || "",
      user.countryCode || 0,
    );

    // Build update data
    const updateData: any = this.buildUpdateData(data);

    if (data.password && data.password.trim() !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    logger.info(
      "Updating user with data:",
      JSON.stringify(updateData, null, 2),
    );

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).select("-password -refreshToken");

    if (!updatedUser) {
      throw new Error("error.userNotFound");
    }

    logger.info("User updated successfully:", updatedUser.userId);

    return updatedUser.toJSON();
  }

  /**
   * Delete user (soft delete - set status to deleted)
   */
  static async deleteUser(id: string) {
    return this.updateUserStatus(id, UserStatus.DELETED);
  }

  /**
   * Get user profile by MongoDB ID
   */
  static async getUserProfile(userId: string) {
    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      throw new Error("error.userNotFound");
    }
    const userJson = user.toJSON() as any;

    if (userJson.profileImage && !userJson.profileImage.startsWith("http")) {
      userJson.profileImage = `${config.aws.cloudFrontUrl}/${userJson.profileImage}`;
    }

    // Append role-based permissions for frontend navigation/widgets
    // Fetch permissions from Role model using roleId instead of role name
    if (user.roleId) {
      // User has a specific roleId, fetch permissions from Role document
      const { RoleModel } = require("../../../models/role.model");
      const dbRole = await RoleModel.findById(user.roleId);
      
      if (dbRole) {
        const rawPerms = dbRole.permissions || {};
        userJson.permissions = sanitizeSubAdminPermissions(rawPerms);
        userJson.customPermissions = sanitizeSubAdminPermissions(rawPerms);
      } else {
        // Fallback: Role not found, use empty permissions
        userJson.permissions = {};
        userJson.customPermissions = {};
      }
    }
      {
      // Fallback for users without roleId (backward compatibility)
      const userRole = String(user.role).toLowerCase();
      if (userRole === "admin") {
        const fullPerms = sanitizeSubAdminPermissions(
          ALLOWED_SUBADMIN_PERMISSION_MODULES.reduce((acc, module) => {
            acc[module] = { all: true };
            return acc;
          }, {} as any)
        );
        userJson.permissions = fullPerms;
        userJson.customPermissions = fullPerms;
      }
       else if (userRole === "producer") {
        // Fetch permissions dynamically from the database "producer" role
        const { RoleModel } = require("../../../models/role.model");
        const dbRole = await RoleModel.findOne({ name: { $regex: /^producer$/i } });
        const rawPerms = dbRole ? dbRole.permissions : {};
        userJson.permissions = sanitizeSubAdminPermissions(rawPerms);
        userJson.customPermissions = sanitizeSubAdminPermissions(rawPerms);
      } 
      else {
        // Fallback for custom roles or subadmins, fetch from their DB document
        userJson.perelsemissions = sanitizeSubAdminPermissions((user as any).permissions);
        userJson.customPermissions = sanitizeSubAdminPermissions((user as any).customPermissions);
      }
    }

    return userJson;
  }

  /**
   * Sanitize user object (remove sensitive fields)
   * @param user - User document or plain object
   * @returns Sanitized user object without password and refreshToken
   */
  static sanitizeUser(
    user: IUser | Record<string, unknown>,
  ): Omit<IUser, "password" | "refreshToken"> {
    const userObject =
      typeof (user as IUser).toJSON === "function"
        ? (user as IUser).toJSON()
        : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...sanitized } = userObject as IUser;
    return sanitized as Omit<IUser, "password" | "refreshToken">;
  }

  /**
   * Lightweight user lookup for notifications
   */
  static async listUserLookup(search?: string, limit: number = 500) {
    const MAX_LIMIT = 2000;
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

    const query = search
      ? QueryBuilder.buildSearchQuery(search, USER_SEARCH_FIELDS)
      : {};

    // Exclude main admin users
    const exclusionQuery = {
      ...query,
      role: { $ne: "admin" },
    };

    const users = await User.find(exclusionQuery)
      .select("firstName lastName fullName email profileImage")
      .limit(safeLimit)
      .sort({ fullName: 1 });

    return users.map((user) => {
      const json = user.toJSON();
      const fullName =
        json.fullName ||
        `${json.firstName || ""} ${json.lastName || ""}`.trim();

      return {
        id: json._id,
        fullName,
        email: json.email,
        profileImageUrl: this.buildProfileImageUrl(json.profileImage),
      };
    });
  }
}

export default UserService;
