import { Request, Response } from "express";
import { UserSession, User, UserStatus, IUser } from "../../../models";
import { AuthService } from "../services/auth.service";
import { TokenService } from "../services/token.service";
import { Role } from "../../../common/types/auth.types";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../../modules/shared/helpers/language.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { updateUserLoginInfo, buildUserResponse } from "../../shared/helpers/auth.helper";

const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

async function upsertUserSession(
  userId: unknown,
  refreshToken: string,
  deviceId: string,
  deviceType: string,
  deviceToken: string | undefined,
  req: Request,
) {
  await UserSession.findOneAndUpdate(
    { userId, deviceId },
    {
      $set: {
        refreshToken,
        deviceType,
        deviceName: deviceType,
        deviceToken: deviceToken ?? null,
        ipAddress: req.ip,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * Mobile / User Logout Controller
 * Handles logout for mobile authentication and user profile accounts.
 * Clears user device metadata, invalidates device sessions, and clears refresh token cookie.
 */
export const mobileLogout = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const deviceId = req.body?.deviceId || (req.query?.deviceId as string);

    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const payload = await AuthService.mobileLogoutHandler(userId, res, deviceId);
    return ResponseHandler.success(res, payload, "auth.logoutSuccess", lang);
  } catch (error) {
    logger.error("Mobile logout error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const userLogout = mobileLogout;
/**
 * User Login Controller
 * Handles regular user authentication
 */
export const userLogin = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { email, password, type, deviceId, deviceType, deviceToken } =
      req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return ResponseHandler.error(res, "auth.loginFailed", lang, 400);
    }

    // Validate password
    const isValidPassword = await AuthService.validatePassword(user, password);
    if (!isValidPassword) {
      return ResponseHandler.error(res, "auth.loginFailed", lang, 400);
    }

    // Check if user has USER role (producers, admins, subadmins cannot log in via user panel)
    if (user.role !== Role.USER) {
      return ResponseHandler.forbidden(res, "auth.onlyUserRoleAllowed", lang);
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      return ResponseHandler.forbidden(res, "auth.accountInactive", lang);
    }

    // Generate tokens
    const { accessToken, refreshToken } = AuthService.generateTokens(user);

    // Store refresh token and device information
    (user as any).refreshToken = refreshToken;
    const appUser = user as IUser & typeof user;

    await updateUserLoginInfo(appUser, req, { deviceId, deviceType, deviceToken });

    if (deviceId && deviceType) {
      await upsertUserSession(
        user._id,
        refreshToken,
        deviceId,
        deviceType,
        deviceToken,
        req,
      );
    }

    // Set refresh token in HTTP-only cookie
    AuthService.setRefreshTokenCookie(res, refreshToken);

    const responsePayload = buildUserResponse(appUser, { accessToken }, 0);

    // Return success response
    return ResponseHandler.success(
      res,
      responsePayload,
      "auth.loginSuccess",
      lang,
    );
  } catch (error) {
    logger.error("User login error:", error);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * User Social Login Controller
 * Handles Google and Facebook authentication
 */
export const socialLogin = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { loginType, accessToken, deviceId, deviceType, deviceToken } = req.body;

    if (!loginType || !accessToken) {
      return ResponseHandler.error(res, "Missing loginType or accessToken", lang, HTTP_STATUS.BAD_REQUEST);
    }

    let decodedToken: any = {};
    if (loginType === 'google') {
      decodedToken = await AuthService.getGoogleResponse(accessToken);
    } else if (loginType === 'facebook') {
      decodedToken = await AuthService.getFacebookDetails(accessToken);
    } else {
      return ResponseHandler.error(res, "Invalid loginType", lang, HTTP_STATUS.BAD_REQUEST);
    }

    if (!decodedToken || !decodedToken.email) {
      return ResponseHandler.error(res, "auth.invalidToken", lang, HTTP_STATUS.UNAUTHORIZED);
    }

    // Find user by email
    const user = await User.findOne({ email: decodedToken.email });
    if (!user) {
      return ResponseHandler.error(res, "auth.userNotFound", lang, HTTP_STATUS.NOT_FOUND);
    }

    // Ensure social login is restricted to regular users (Role.USER)
    if (user.role !== Role.USER) {
      return ResponseHandler.forbidden(res, "auth.onlyUserRoleAllowed", lang);
    }

    // Check if manually registered (assume 'Normal' means manual)
    if ((user as any).loginType === 'Normal') {
      return ResponseHandler.error(res, "auth.manuallyRegistered", lang, HTTP_STATUS.FORBIDDEN);
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      return ResponseHandler.forbidden(res, "auth.accountInactive", lang);
    }

    // Generate tokens
    const { accessToken: newAccessToken, refreshToken } = AuthService.generateTokens(user);

    // Store refresh token and device information
    (user as any).refreshToken = refreshToken;
    const appUser = user as IUser & typeof user;

    await updateUserLoginInfo(appUser, req, { deviceId, deviceType, deviceToken });

    if (deviceId && deviceType) {
      await upsertUserSession(
        user._id,
        refreshToken,
        deviceId,
        deviceType,
        deviceToken,
        req,
      );
    }

    // Set refresh token in HTTP-only cookie
    AuthService.setRefreshTokenCookie(res, refreshToken);

    const responsePayload = buildUserResponse(appUser, { accessToken: newAccessToken }, 0);

    // Return success response
    return ResponseHandler.success(
      res,
      responsePayload,
      "auth.loginSuccess",
      lang,
    );
  } catch (error) {
    logger.error("Social login error:", error);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * User Refresh Token Controller
 * Generates new access token using refresh token
 */
export const userRefreshToken = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const refreshToken =
      req.body?.refreshToken ||
      req.cookies?.refreshToken ||
      (req.headers["x-refresh-token"] as string) ||
      (req.headers["authorization"]?.startsWith("Bearer ")
        ? req.headers["authorization"].split(" ")[1]
        : undefined);

    if (!refreshToken) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    // Verify refresh token and generate new access token
    const accessToken = await TokenService.refreshAccessToken(refreshToken);

    // Verify the user exists and is a regular user
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return ResponseHandler.unauthorized(res, "auth.tokenExpired", lang);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return ResponseHandler.forbidden(res, "auth.accountInactive", lang);
    }

    if (!Object.values(Role).includes(user.role)) {
      return ResponseHandler.forbidden(res, "auth.accessDenied", lang);
    }

    // Refresh the cookie
    AuthService.setRefreshTokenCookie(res, refreshToken);

    return ResponseHandler.success(
      res,
      {
        accessToken,
        refreshToken,
        expiresIn: "15m",
      },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("User refresh token error:", error);
    return ResponseHandler.unauthorized(res, "auth.tokenExpired", lang);
  }
};

/**
 * Forgot Password OTP Controller
 * Sends OTP to user email for password reset
 */
export const forgotPasswordOTP = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { email } = req.body;

    const result = await AuthService.requestPasswordResetOTP(email);

    return ResponseHandler.success(
      res,
      {
        _id: result._id,
        otpId: result._id,
        message: "auth.otpSent",
      },
      "auth.otpSent",
      lang,
    );
  } catch (error) {
    logger.error("Forgot password OTP error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Verify OTP Controller
 * Verifies the OTP provided by user
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { email, otp, otpId } = req.body;

    await AuthService.verifyOTP(email, otp, otpId);

    return ResponseHandler.success(
      res,
      {
        message: "auth.otpVerified",
      },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("Verify OTP error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.BAD_REQUEST,
      error,
    );
  }
};

/**
 * Reset Password Controller
 * Resets user password after OTP verification
 */
export const resetPassword = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { email, password, otpId } = req.body;

    await AuthService.resetPassword(email, password, otpId);

    return ResponseHandler.success(
      res,
      {
        message: "auth.passwordResetSuccess",
      },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("Reset password error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * 1. Mobile Login API
 */
export const mobileLogin = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.mobileLoginHandler(req);
    return ResponseHandler.success(res, payload, "auth.otpSent", lang);
  } catch (error) {
    logger.error("Mobile login error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 2. Verify OTP API
 */
export const verifyMobileOtp = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.verifyMobileOtpHandler(req, res);
    return ResponseHandler.success(res, payload, "auth.loginSuccess", lang);
  } catch (error) {
    logger.error("Verify mobile OTP error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 3. Resend OTP API
 */
export const resendMobileOtp = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.resendMobileOtpHandler(req);
    return ResponseHandler.success(res, payload, "auth.otpSent", lang);
  } catch (error) {
    logger.error("Resend mobile OTP error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 4. Complete Profile API
 */
export const completeProfile = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.completeProfileHandler(req, res);
    return ResponseHandler.success(res, payload, "auth.profileCompleted", lang);
  } catch (error: any) {
    logger.error("Complete profile error:", error);

    const errorMessage = error instanceof Error ? error.message : "general.error";

    // Return 401 Unauthorized for expired or invalid registration tokens
    if (
      errorMessage === "auth.invalidRegistrationToken" ||
      errorMessage === "auth.registrationTokenRequired" ||
      errorMessage.includes("registration token")
    ) {
      return ResponseHandler.error(
        res,
        "auth.invalidRegistrationToken",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        error
      );
    }

    return ResponseHandler.error(
      res,
      errorMessage,
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 5. Select Genres API
 */
export const selectGenres = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.selectGenresHandler(req);
    return ResponseHandler.success(res, payload, "auth.selectGenresSuccess", lang);
  } catch (error) {
    logger.error("Select genres error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 6. Get Active Genres Listing API
 * Public API to fetch listing of active genres for mobile app
 */
export const getActiveGenres = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string) || 10));

    const payload = await AuthService.getActiveGenresHandler(page, limit);
    return ResponseHandler.success(res, payload, "auth.genresRetrievedSuccess", lang);
  } catch (error) {
    logger.error("Get active genres error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * Get User Selected Genres API ("My Genres")
 * GET /api/v1/auth/my-genres
 * Authenticated API to fetch genres selected by the logged-in user managed via JWT token
 */
export const getMyGenres = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const payload = await AuthService.getMyGenresHandler(userId);
    return ResponseHandler.success(res, payload, "auth.genresRetrievedSuccess", lang);
  } catch (error) {
    logger.error("Get my genres error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 7. Get User Accounts Listing API ("Who's watching?" / Sub-Profiles)
 * Authenticated API to fetch sub-profiles/accounts for the logged-in user
 */
export const getUserAccounts = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const payload = await AuthService.getUserAccountsHandler(userId);
    return ResponseHandler.success(res, payload, "auth.accountsRetrievedSuccess", lang);
  } catch (error) {
    logger.error("Get user accounts error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 8. Create User Account / Sub-Profile API ("Create Profile" screen)
 * Authenticated API to add a new account under the logged-in user
 */
export const createUserAccount = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const payload = await AuthService.createUserAccountHandler(userId, req.body);
    return ResponseHandler.success(res, payload, "auth.accountCreatedSuccess", lang, HTTP_STATUS.CREATED);
  } catch (error) {
    logger.error("Create user account error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 9. Get Terms & Conditions Page Data API
 * Public API to fetch active Terms & Conditions content for mobile display
 */
export const getTermsAndConditions = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.getTermsAndConditionsHandler();
    return ResponseHandler.success(res, payload, "auth.termsRetrievedSuccess", lang);
  } catch (error) {
    logger.error("Get terms and conditions error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 10. Get Privacy Policy Page Data API
 * Public API to fetch active Privacy Policy content for mobile display
 */
export const getPrivacyPolicy = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const payload = await AuthService.getPrivacyPolicyHandler();
    return ResponseHandler.success(res, payload, "auth.privacyRetrievedSuccess", lang);
  } catch (error) {
    logger.error("Get privacy policy error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 11. Update User Account / Sub-Profile API ("Edit Profile")
 * PUT /api/v1/auth/accounts/:accountId
 * Authenticated API to edit an existing sub-profile for the logged-in user
 */
export const updateUserAccount = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const { accountId } = req.params;
    const payload = await AuthService.updateUserAccountHandler(userId, accountId, req.body);
    return ResponseHandler.success(res, payload, "auth.accountUpdatedSuccess", lang);
  } catch (error) {
    logger.error("Update user account error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 12. Delete User Account / Sub-Profile API ("Delete Profile")
 * DELETE /api/v1/auth/accounts/:accountId
 * Authenticated API to delete a sub-profile under the logged-in user
 */
export const deleteUserAccount = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const { accountId } = req.params;
    const payload = await AuthService.deleteUserAccountHandler(userId, accountId);
    return ResponseHandler.success(res, payload, "auth.accountDeletedSuccess", lang);
  } catch (error) {
    logger.error("Delete user account error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 13. Send Delete User Account OTP API
 * POST /api/v1/auth/user/delete-otp
 * Authenticated API to generate and send an OTP to user's mobile number prior to account deletion
 */
export const sendDeleteUserOtp = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const payload = await AuthService.sendDeleteUserOtpHandler(userId);
    return ResponseHandler.success(res, payload, "auth.otpSent", lang);
  } catch (error) {
    logger.error("Send delete user OTP error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

/**
 * 14. Delete Main User Account API ("Delete Account")
 * DELETE /api/v1/auth/user
 * Authenticated API to delete/deactivate the logged-in user's primary account after OTP verification & purge session data
 */
export const deleteUser = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const userId = (req as any).user?._id;
    const { otp } = req.body || {};
    const payload = await AuthService.deleteUserHandler(userId, otp, res, req);
    return ResponseHandler.success(res, payload, "auth.userDeletedSuccess", lang);
  } catch (error) {
    logger.error("Delete user error:", error);
    return ResponseHandler.error(
      res,
      error instanceof Error ? error.message : "general.error",
      lang,
      HTTP_STATUS.OK,
      error
    );
  }
};

export default {
  userLogin,
  socialLogin,
  userRefreshToken,
  forgotPasswordOTP,
  verifyOTP,
  resetPassword,
  mobileLogin,
  verifyMobileOtp,
  resendMobileOtp,
  completeProfile,
  selectGenres,
  getActiveGenres,
  getUserAccounts,
  createUserAccount,
  getTermsAndConditions,
  getPrivacyPolicy,
  mobileLogout,
  userLogout,
  updateUserAccount,
  deleteUserAccount,
  sendDeleteUserOtp,
  deleteUser,
};
