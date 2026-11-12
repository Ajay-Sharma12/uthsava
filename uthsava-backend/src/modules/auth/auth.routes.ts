import { Router } from "express";
import { validateBody } from "../../core/middleware/validate.middleware";
import {
  userLogin,
  socialLogin,
  userRefreshToken,
  forgotPasswordOTP,
  verifyOTP,
  resetPassword,
  userLogout,
  mobileLogin,
  verifyMobileOtp,
  resendMobileOtp,
  completeProfile,
  selectGenres,
  getActiveGenres,
  getUserAccounts,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  sendDeleteUserOtp,
  deleteUser,
  getTermsAndConditions,
  getPrivacyPolicy,
} from "./controllers/user-auth.controller";
import {
  userLoginSchema,
  forgotPasswordOTPSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  mobileLoginSchema,
  verifyMobileOtpSchema,
  resendMobileOtpSchema,
  completeProfileSchema,
  selectGenreSchema,
  createAccountSchema,
  updateAccountSchema,
  deleteUserSchema,
} from "./validators/auth.validator";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
} from "../../core/middleware/rateLimiter.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";

const router = Router();

/**
 * Public User Authentication Routes
 * Base path: /api/v1/auth
 * Note: Admin authentication is handled in /api/v1/admin/login
 */
router.post(
  "/login",
  loginRateLimiter,
  validateBody(userLoginSchema),
  userLogin,
);
router.post("/social-login", loginRateLimiter, socialLogin);
router.post("/refresh-token", userRefreshToken);

/**
 * Mobile Login Routes
 */
router.post(
  "/mobile-login",
  loginRateLimiter,
  validateBody(mobileLoginSchema),
  mobileLogin,
);

router.post(
  "/verify-mobile-otp",
  validateBody(verifyMobileOtpSchema),
  verifyMobileOtp,
);

router.post(
  "/resend-mobile-otp",
  validateBody(resendMobileOtpSchema),
  resendMobileOtp,
);

router.post(
  "/complete-profile",
  validateBody(completeProfileSchema),
  completeProfile,
);

router.post(
  "/select-genres",
  authenticate,
  validateBody(selectGenreSchema),
  selectGenres,
);

/**
 * Mobile GET Information & Listing Endpoints
 * Base path: /api/v1/auth
 */
router.get("/genres", getActiveGenres);
router.get("/accounts", authenticate, getUserAccounts);
router.post(
  "/accounts",
  authenticate,
  validateBody(createAccountSchema),
  createUserAccount,
);
router.put(
  "/accounts/:accountId",
  authenticate,
  validateBody(updateAccountSchema),
  updateUserAccount,
);
router.delete(
  "/accounts/:accountId",
  authenticate,
  deleteUserAccount,
);
router.post(
  "/user/delete-otp",
  authenticate,
  sendDeleteUserOtp,
);
router.delete(
  "/user",
  authenticate,
  validateBody(deleteUserSchema),
  deleteUser,
);

router.get("/terms-and-conditions", getTermsAndConditions);
router.get("/privacy-policy", getPrivacyPolicy);

/**
 * User Logout Route
 * Clears device token, device type, device ID, refresh token, and invalidates active sessions
 */
router.post("/logout", authenticate, userLogout);

/**
 * Password Reset Routes with OTP
 */
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateBody(forgotPasswordOTPSchema),
  forgotPasswordOTP,
);

router.post("/verify-otp", validateBody(verifyOTPSchema), verifyOTP);

router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword,
);

export default router;
