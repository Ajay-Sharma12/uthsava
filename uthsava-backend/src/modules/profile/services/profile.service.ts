import { User, IUser } from "../../../models/user.model";
import { UserProfile, ProfileType, IUserProfile } from "../../../models/user-profile.model";
import { config } from "../../../core/config";
import { Types } from "mongoose";
import { logger } from "../../../core/constants/logger";
import { AuthService } from "../../auth/services/auth.service";
import { getDefaultUserProfileAvatarUrl } from "../../shared/helpers/avatar.helper";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  location?: string;
  profileImage?: string;
  countryCode?: number;
}

export class ProfileService {
  /**
   * Get user profile by user ID
   * @param userId - The ID of the user
   * @returns User profile data
   */
  static async getProfileById(
    userId: string | Types.ObjectId,
  ): Promise<IUser | null> {
    try {
      const user = await User.findById(userId).select(
        "-password -refreshToken",
      );
      return user;
    } catch (error) {
      logger.error("Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }

  /**
   * Update user profile
   * @param userId - The ID of the user
   * @param updateData - Data to update
   * @returns Updated user profile
   */
  static async updateProfile(
    userId: string | Types.ObjectId,
    updateData: UpdateProfileData,
  ): Promise<IUser | null> {
    try {
      // If firstName or lastName is provided, auto-generate fullName
      if (updateData.firstName || updateData.lastName) {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error("User not found");
        }

        const firstName = updateData.firstName || user.firstName || "";
        const lastName = updateData.lastName || user.lastName || "";
        updateData.fullName = `${firstName} ${lastName}`.trim();
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      ).select("-password -refreshToken");

      if (!updatedUser) {
        throw new Error("User not found");
      }

      logger.info(`Profile updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error("Error updating user profile:", error);
      throw error;
    }
  }

  /**
   * Update user profile image
   * @param userId - The ID of the user
   * @param profileImageKey - S3 key of the uploaded image
   * @returns Updated user profile
   */
  static async updateProfileImage(
    userId: string | Types.ObjectId,
    profileImageKey: string,
  ): Promise<IUser | null> {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { profileImage: profileImageKey } },
        { new: true, runValidators: true },
      ).select("-password -refreshToken");

      if (!updatedUser) {
        throw new Error("User not found");
      }

      logger.info(`Profile image updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error("Error updating profile image:", error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param userId - The ID of the user
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Success status
   */
  static async changePassword(
    userId: string | Types.ObjectId,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Fetch user with password included
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isPasswordValid = await AuthService.validatePassword(
        user,
        currentPassword,
      );

      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Check if new password is same as current password
      const isSamePassword = await AuthService.validatePassword(
        user,
        newPassword,
      );
      if (isSamePassword) {
        throw new Error("New password cannot be the same as current password");
      }

      // Hash new password
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // Update password and clear expiry flags
      await User.findByIdAndUpdate(
        userId,
        {
          $set: { password: hashedPassword },
          $unset: {
            refreshToken: "",
            deviceToken: "",
            deviceType: "",
            deviceId: "",
          },
        },
        { runValidators: false }, // Skip validators since we're updating password directly
      );

      logger.info(`Password changed successfully for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Update notification settings
   * @param userId - The ID of the user
   * @param notificationEnabled - Whether notifications are enabled
   * @returns Updated user
   */
  static async updateNotificationSettings(
    userId: string | Types.ObjectId,
    notificationEnabled: boolean,
  ): Promise<any> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { notificationEnabled } },
        { new: true, runValidators: true },
      );

      if (!user) {
        throw new Error("User not found");
      }

      logger.info(`Notification settings updated for user: ${userId}`);
      return user.toJSON();
    } catch (error) {
      logger.error("Error updating notification settings:", error);
      throw error;
    }
  }

  /**
   * Helper to resolve S3 key to CloudFront URL
   */
  static resolveMediaUrl(key?: string | null): string {
    if (!key || key.trim() === "") return "";
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    const baseUrl = config.aws?.cloudFrontUrl || "";
    return baseUrl ? `${baseUrl}/${key}` : key;
  }

  /**
   * Create a new sub-profile account under the user ("Create Profile" / "Add Account")
   *
   * @param userId - The authenticated parent user's ObjectId
   * @param input - Contains name, isKids (boolean), and optional avatar selection
   */
  static async createSubProfile(
    userId: string | Types.ObjectId,
    input: {
      name?: string;
      displayName?: string;
      isKids?: boolean;
      kids?: boolean;
      avatar?: string;
      avatarId?: string;
      profilePicture?: string;
    }
  ): Promise<IUserProfile> {
    try {
      const displayName = (input.name || input.displayName || "").trim();
      if (!displayName) {
        throw new Error("Profile name is required");
      }

      const isKidsFlag = input.isKids !== undefined ? input.isKids : (input.kids !== undefined ? input.kids : false);
      const profileType = isKidsFlag ? ProfileType.KIDS : ProfileType.STANDARD;

      const avatarValue = (input.avatar || input.profilePicture || "").trim();
      const avatarIdValue = (input.avatarId || "").trim();

      // Check existing profiles count for this user to determine default status
      const existingProfilesCount = await UserProfile.countDocuments({ userId });
      const isDefault = existingProfilesCount === 0;

      const newProfile = new UserProfile({
        userId: new Types.ObjectId(userId.toString()),
        displayName,
        profileType,
        profilePicture: avatarValue || null,
        avatarId: avatarIdValue || null,
        isDefault,
        notificationEnabled: true,
      });

      await newProfile.save();
      logger.info(`[ProfileService] Created sub-profile '${displayName}' for user ${userId}`);
      return newProfile;
    } catch (error) {
      logger.error("Error creating sub-profile:", error);
      throw error;
    }
  }

  /**
   * Fetch all sub-profiles for a given user account ("Who's watching?" screen)
   *
   * @param userId - The authenticated parent user's ObjectId
   */
  static async getUserSubProfiles(userId: string | Types.ObjectId): Promise<any[]> {
    try {
      const profiles = await UserProfile.find({ userId: new Types.ObjectId(userId.toString()) }).sort({ createdAt: 1 });
      const defaultUserProfileAvatar = await getDefaultUserProfileAvatarUrl();

      return profiles.map((p) => {
        const obj = p.toObject();
        const resolvedUrl = ProfileService.resolveMediaUrl(obj.profilePicture);
        const finalPictureUrl = resolvedUrl && resolvedUrl.trim() !== "" ? resolvedUrl : defaultUserProfileAvatar;

        return {
          ...obj,
          profilePictureUrl: finalPictureUrl,
          profilePicture: finalPictureUrl,
        };
      });
    } catch (error) {
      logger.error("Error fetching user sub-profiles:", error);
      throw error;
    }
  }
}

