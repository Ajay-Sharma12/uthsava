import request from "supertest";
import express from "express";
import authRoutes from "../../../src/modules/auth/auth.routes";
import {
  userLogin,
  socialLogin,
  userRefreshToken,
  forgotPasswordOTP,
  verifyOTP,
  resetPassword,
  userLogout,
  mobileLogout,
  mobileLogin,
  verifyMobileOtp,
  resendMobileOtp,
  completeProfile,
  selectGenres,
  getActiveGenres,
  getMyGenres,
  getUserAccounts,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  sendDeleteUserOtp,
  deleteUser,
  getTermsAndConditions,
  getPrivacyPolicy,
} from "../../../src/modules/auth/controllers/user-auth.controller";

jest.mock("../../../src/modules/auth/controllers/user-auth.controller", () => ({
  userLogin: jest.fn((req, res) => res.status(200).json({ success: true })),
  socialLogin: jest.fn((req, res) => res.status(200).json({ success: true })),
  userRefreshToken: jest.fn((req, res) => res.status(200).json({ success: true })),
  forgotPasswordOTP: jest.fn((req, res) => res.status(200).json({ success: true })),
  verifyOTP: jest.fn((req, res) => res.status(200).json({ success: true })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  userLogout: jest.fn((req, res) => res.status(200).json({ success: true })),
  mobileLogout: jest.fn((req, res) => res.status(200).json({ success: true })),
  mobileLogin: jest.fn((req, res) => res.status(200).json({ success: true })),
  verifyMobileOtp: jest.fn((req, res) => res.status(200).json({ success: true })),
  resendMobileOtp: jest.fn((req, res) => res.status(200).json({ success: true })),
  completeProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  selectGenres: jest.fn((req, res) => res.status(200).json({ success: true })),
  getActiveGenres: jest.fn((req, res) => res.status(200).json({ success: true })),
  getMyGenres: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUserAccounts: jest.fn((req, res) => res.status(200).json({ success: true })),
  createUserAccount: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateUserAccount: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteUserAccount: jest.fn((req, res) => res.status(200).json({ success: true })),
  sendDeleteUserOtp: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteUser: jest.fn((req, res) => res.status(200).json({ success: true })),
  getTermsAndConditions: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPrivacyPolicy: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
}));

jest.mock("../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../src/core/middleware/rateLimiter.middleware", () => ({
  loginRateLimiter: jest.fn((req, res, next) => next()),
  forgotPasswordRateLimiter: jest.fn((req, res, next) => next()),
}));

describe("User Auth Routes Tests", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);
  });

  /* =========================================================================
   * ROUTING VERIFICATION
   * ========================================================================= */
  it("[Positive] POST /api/v1/auth/login routes to userLogin", async () => {
    await request(app).post("/api/v1/auth/login").send({});
    expect(userLogin).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/social-login routes to socialLogin", async () => {
    await request(app).post("/api/v1/auth/social-login").send({});
    expect(socialLogin).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/refresh-token routes to userRefreshToken", async () => {
    await request(app).post("/api/v1/auth/refresh-token").send({});
    expect(userRefreshToken).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/mobile-login routes to mobileLogin", async () => {
    await request(app).post("/api/v1/auth/mobile-login").send({});
    expect(mobileLogin).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/verify-mobile-otp routes to verifyMobileOtp", async () => {
    await request(app).post("/api/v1/auth/verify-mobile-otp").send({});
    expect(verifyMobileOtp).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/resend-mobile-otp routes to resendMobileOtp", async () => {
    await request(app).post("/api/v1/auth/resend-mobile-otp").send({});
    expect(resendMobileOtp).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/complete-profile routes to completeProfile", async () => {
    await request(app).post("/api/v1/auth/complete-profile").send({});
    expect(completeProfile).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/select-genres routes to selectGenres", async () => {
    await request(app).post("/api/v1/auth/select-genres").send({});
    expect(selectGenres).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/auth/genres routes to getActiveGenres", async () => {
    await request(app).get("/api/v1/auth/genres");
    expect(getActiveGenres).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/auth/accounts routes to getUserAccounts", async () => {
    await request(app).get("/api/v1/auth/accounts");
    expect(getUserAccounts).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/accounts routes to createUserAccount", async () => {
    await request(app).post("/api/v1/auth/accounts").send({ name: "Kanak Bansal" });
    expect(createUserAccount).toHaveBeenCalled();
  });

  it("[Positive] PUT /api/v1/auth/accounts/:accountId routes to updateUserAccount", async () => {
    await request(app).put("/api/v1/auth/accounts/64a7b9c3e4b0c2d3f4a5b6c7").send({ name: "Updated Name" });
    expect(updateUserAccount).toHaveBeenCalled();
  });

  it("[Positive] DELETE /api/v1/auth/accounts/:accountId routes to deleteUserAccount", async () => {
    await request(app).delete("/api/v1/auth/accounts/64a7b9c3e4b0c2d3f4a5b6c7");
    expect(deleteUserAccount).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/user/delete-otp routes to sendDeleteUserOtp", async () => {
    await request(app).post("/api/v1/auth/user/delete-otp");
    expect(sendDeleteUserOtp).toHaveBeenCalled();
  });

  it("[Positive] DELETE /api/v1/auth/user routes to deleteUser", async () => {
    await request(app).delete("/api/v1/auth/user").send({ otp: "1234" });
    expect(deleteUser).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/auth/terms-and-conditions routes to getTermsAndConditions", async () => {
    await request(app).get("/api/v1/auth/terms-and-conditions");
    expect(getTermsAndConditions).toHaveBeenCalled();
  });

  it("[Positive] GET /api/v1/auth/privacy-policy routes to getPrivacyPolicy", async () => {
    await request(app).get("/api/v1/auth/privacy-policy");
    expect(getPrivacyPolicy).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/logout routes to userLogout", async () => {
    await request(app).post("/api/v1/auth/logout").send({});
    expect(userLogout).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/forgot-password routes to forgotPasswordOTP", async () => {
    await request(app).post("/api/v1/auth/forgot-password").send({});
    expect(forgotPasswordOTP).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/verify-otp routes to verifyOTP", async () => {
    await request(app).post("/api/v1/auth/verify-otp").send({});
    expect(verifyOTP).toHaveBeenCalled();
  });

  it("[Positive] POST /api/v1/auth/reset-password routes to resetPassword", async () => {
    await request(app).post("/api/v1/auth/reset-password").send({});
    expect(resetPassword).toHaveBeenCalled();
  });
});
