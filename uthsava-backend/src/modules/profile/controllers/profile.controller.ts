import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { ProfileService } from "../services/profile.service";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";

/**
 * Get Current User Profile
 * GET /api/v1/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Disable caching for profile data
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const profile = await ProfileService.getProfileById(userId);

    if (!profile) {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    const profileJson = profile.toJSON() as Record<string, unknown>;

    const profileData = {
      ...profileJson,
      isEmailEditable: false,
      isMobileEditable: false,
    };

    return ResponseHandler.success(
      res,
      profileData,
      "profile.fetchSuccess",
      lang,
    );
  } catch (error) {
    logger.error("Get profile error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "profile.fetchError",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update Current User Profile
 * PUT /api/v1/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Disable caching
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const {
      firstName,
      lastName,
      fullName,
      location,
      countryCode,
      profileImage,
      mobile,
    } = req.body;

    // Prevent updating email and mobile through this endpoint
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (location !== undefined) updateData.location = location;
    if (countryCode !== undefined) updateData.countryCode = countryCode;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (mobile !== undefined) updateData.mobile = mobile;

    const updatedProfile = await ProfileService.updateProfile(
      userId,
      updateData,
    );

    if (!updatedProfile) {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.success(
      res,
      updatedProfile.toJSON(),
      "profile.updateSuccess",
      lang,
    );
  } catch (error: any) {
    logger.error("Update profile error:", error);
    const lang = getLanguage(req);

    // Handle specific errors
    if (error.message === "User not found") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "profile.updateError",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update Profile Image
 * PUT /api/v1/profile/image
 */
export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;
    // Disable caching
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const { profileImage } = req.body;

    if (!profileImage) {
      return ResponseHandler.badRequest(
        res,
        "validation.profileImageRequired",
        lang,
      );
    }

    const updatedProfile = await ProfileService.updateProfileImage(
      userId,
      profileImage,
    );

    if (!updatedProfile) {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.success(
      res,
      updatedProfile.toJSON(),
      "profile.imageUpdateSuccess",
      lang,
    );
  } catch (error: any) {
    logger.error("Update profile image error:", error);
    const lang = getLanguage(req);

    if (error.message === "User not found") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "profile.imageUpdateError",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Change Password
 * PUT /api/v1/profile/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const { currentPassword, newPassword } = req.body;

    await ProfileService.changePassword(userId, currentPassword, newPassword);

    return ResponseHandler.success(
      res,
      null,
      "profile.passwordChangeSuccess",
      lang,
    );
  } catch (error: any) {
    logger.error("Change password error:", error);
    const lang = getLanguage(req);

    // Handle specific errors
    if (error.message === "User not found") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    if (error.message === "Current password is incorrect") {
      return ResponseHandler.badRequest(res, "profile.incorrectPassword", lang);
    }

    if (
      error.message === "New password cannot be the same as current password"
    ) {
      return ResponseHandler.badRequest(res, "profile.samePassword", lang);
    }

    return ResponseHandler.error(
      res,
      "profile.passwordChangeError",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update Notification Settings
 * PUT /api/v1/profile/notification-settings
 */
export const updateNotificationSettings = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const { notificationEnabled } = req.body;

    const updatedProfile = await ProfileService.updateNotificationSettings(
      userId,
      notificationEnabled,
    );

    return ResponseHandler.success(
      res,
      updatedProfile,
      "profile.notificationSettingsUpdated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update notification settings error:", error);
    const lang = getLanguage(req);

    if (error.message === "User not found") {
      return ResponseHandler.notFound(res, "user.notFound", lang);
    }

    return ResponseHandler.error(
      res,
      "profile.notificationSettingsError",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Create Sub-Profile Account ("Create Profile" / "Add Account")
 * POST /api/v1/profile/sub-profiles
 *
 * Body parameters:
 *  - name / displayName (string, required): Profile name e.g., "Kanak Bansal"
 *  - isKids / kids (boolean, optional): true if this is a Kids profile, false for standard
 *  - avatar / avatarId / profilePicture (string, optional): Avatar image URL or ID
 */
export const createSubProfile = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const { name, displayName, isKids, kids, avatar, avatarId, profilePicture } = req.body;

    const newProfile = await ProfileService.createSubProfile(userId, {
      name,
      displayName,
      isKids,
      kids,
      avatar,
      avatarId,
      profilePicture,
    });

    const responseData = {
      ...newProfile.toObject(),
      profilePictureUrl: ProfileService.resolveMediaUrl(newProfile.profilePicture),
    };

    return ResponseHandler.success(
      res,
      responseData,
      "general.success",
      lang,
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    logger.error("Create sub-profile error:", error);
    const lang = getLanguage(req);

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * Get All Sub-Profile Accounts ("Who's watching?" screen)
 * GET /api/v1/profile/sub-profiles
 */
export const getSubProfiles = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const profiles = await ProfileService.getUserSubProfiles(userId);

    return ResponseHandler.success(res, profiles, "general.success", lang);
  } catch (error: any) {
    logger.error("Get sub-profiles error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

export default {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  updateNotificationSettings,
  createSubProfile,
  getSubProfiles,
};

