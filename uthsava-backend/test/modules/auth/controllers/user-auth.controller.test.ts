/// <reference types="jest" />
import { Request, Response } from "express";
import {
  userLogin,
  userRefreshToken,
  mobileLogin,
  verifyMobileOtp,
  resendMobileOtp,
  completeProfile,
  selectGenres,
  getActiveGenres,
  getMyGenres,
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
} from "../../../../src/modules/auth/controllers/user-auth.controller";
import { AuthService } from "../../../../src/modules/auth/services/auth.service";
import { TokenService } from "../../../../src/modules/auth/services/token.service";
import { User } from "../../../../src/models";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import mongoose from "mongoose";

jest.mock("i18n");
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock("../../../../src/modules/auth/services/auth.service");
jest.mock("../../../../src/modules/auth/services/token.service");
jest.mock("../../../../src/models", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  UserSession: {
    findOneAndUpdate: jest.fn(),
  },
  UserStatus: {
    ACTIVE: "active",
    INACTIVE: "inactive",
  },
  Role: {
    USER: "user",
    ADMIN: "admin",
    ADMIN_SUB_USER: "admin_sub_user",
    PRODUCER: "producer",
  },
}));
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (
  body: any = {},
  user: any = undefined,
  ip = "127.0.0.1",
  headers: any = {},
  query: any = {},
  cookies: any = {}
) => {
  return {
    body,
    user,
    cookies,
    ip,
    headers,
    query,
  } as unknown as Request;
};

describe("User Auth Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe("userLogin", () => {
    it("should login user successfully", async () => {
      req = mockRequest({ email: "test@example.com", password: "password", type: "USER" });
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
        status: "active",
        save: jest.fn().mockResolvedValue(true),
      };
      
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateTokens as jest.Mock).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      await userLogin(req, res);

      expect(AuthService.setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ token: "access-token", email: "test@example.com" }),
        "auth.loginSuccess",
        "en"
      );
    });

    it("should return forbidden if user not found", async () => {
      req = mockRequest({ email: "test@example.com", password: "password", type: "USER" });
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await userLogin(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.loginFailed", "en", 400);
    });

    it("should return forbidden if password invalid", async () => {
      req = mockRequest({ email: "test@example.com", password: "wrong", type: "USER" });
      const mockUser = { email: "test@example.com" };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.validatePassword as jest.Mock).mockResolvedValue(false);

      await userLogin(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.loginFailed", "en", 400);
    });
  });

  describe("userRefreshToken", () => {
    it("[Positive] should refresh token when provided in request body (Mobile App)", async () => {
      req = mockRequest({ refreshToken: "valid-mobile-token" });
      const mockUser = { refreshToken: "valid-mobile-token", status: "active", role: "user" };
      (TokenService.refreshAccessToken as jest.Mock).mockResolvedValue("new-access-token");
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await userRefreshToken(req, res);

      expect(TokenService.refreshAccessToken).toHaveBeenCalledWith("valid-mobile-token");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { accessToken: "new-access-token", refreshToken: "valid-mobile-token", expiresIn: "15m" },
        "general.success",
        "en"
      );
    });

    it("[Positive] should refresh token when provided in cookies (Web App)", async () => {
      req = mockRequest({}, undefined, "127.0.0.1", {}, {}, { refreshToken: "valid-cookie-token" });
      const mockUser = { refreshToken: "valid-cookie-token", status: "active", role: "user" };
      (TokenService.refreshAccessToken as jest.Mock).mockResolvedValue("new-access-token");
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await userRefreshToken(req, res);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { accessToken: "new-access-token", refreshToken: "valid-cookie-token", expiresIn: "15m" },
        "general.success",
        "en"
      );
    });

    it("[Negative] should return 401 unauthorized if no refresh token is provided", async () => {
      req = mockRequest({});

      await userRefreshToken(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });
  });

  describe("mobileLogin", () => {
    it("should send OTP successfully", async () => {
      req = mockRequest({ mobile: "9876543210", countryCode: "+91" });
      (AuthService.mobileLoginHandler as jest.Mock).mockResolvedValue({
        otpId: "otp123",
        otp: "1234",
        message: "Otp sent successfully"
      });

      await mobileLogin(req, res);

      expect(AuthService.mobileLoginHandler).toHaveBeenCalledWith(req);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { otpId: "otp123", otp: "1234", message: "Otp sent successfully" },
        "auth.otpSent",
        "en"
      );
    });

    it("should handle error during mobile login", async () => {
      req = mockRequest({ mobile: "9876543210" });
      (AuthService.mobileLoginHandler as jest.Mock).mockRejectedValue(new Error("SMS failed"));

      await mobileLogin(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("verifyMobileOtp", () => {
    it("should verify OTP and return isNewUser true for new user", async () => {
      req = mockRequest({ mobile: "9876543210", otp: "1234" });
      (AuthService.verifyMobileOtpHandler as jest.Mock).mockResolvedValue({
        isNewUser: 1,
        registrationToken: "mocked-token",
      });

      await verifyMobileOtp(req, res);

      expect(AuthService.verifyMobileOtpHandler).toHaveBeenCalledWith(req, res);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { isNewUser: 1, registrationToken: "mocked-token" },
        "auth.loginSuccess",
        "en"
      );
    });

    it("should login user successfully if existing user", async () => {
      req = mockRequest({ mobile: "9876543210", otp: "1234" });
      (AuthService.verifyMobileOtpHandler as jest.Mock).mockResolvedValue({
        isNewUser: 0,
        token: "access-token",
        email: "test@example.com"
      });

      await verifyMobileOtp(req, res);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ isNewUser: 0, token: "access-token" }),
        "auth.loginSuccess",
        "en"
      );
    });

    it("should handle invalid OTP error", async () => {
      req = mockRequest({ mobile: "9876543210", otp: "0000" });
      (AuthService.verifyMobileOtpHandler as jest.Mock).mockRejectedValue(new Error("auth.otpInvalid"));

      await verifyMobileOtp(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.otpInvalid",
        "en",
        200,
        expect.any(Error)
      );
    });

    it("should handle account lock after 3 failed OTP attempts", async () => {
      req = mockRequest({ mobile: "9876543210", otp: "0000" });
      (AuthService.verifyMobileOtpHandler as jest.Mock).mockRejectedValue(new Error("auth.otpLocked:120"));

      await verifyMobileOtp(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.otpLocked:120",
        "en",
        200,
        expect.any(Error)
      );
    });
  });

  describe("resendMobileOtp", () => {
    it("should resend OTP successfully", async () => {
      req = mockRequest({ mobile: "9876543210" });
      (AuthService.resendMobileOtpHandler as jest.Mock).mockResolvedValue({
        otpId: "otp456",
        otp: "5678",
        message: "auth.otpSent"
      });

      await resendMobileOtp(req, res);

      expect(AuthService.resendMobileOtpHandler).toHaveBeenCalledWith(req);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { otpId: "otp456", otp: "5678", message: "auth.otpSent" },
        "auth.otpSent",
        "en"
      );
    });
  });

  describe("completeProfile", () => {
    it("should complete profile and return tokens", async () => {
      req = mockRequest({ registrationToken: "mocked-token", fullName: "Jane Doe" });
      (AuthService.completeProfileHandler as jest.Mock).mockResolvedValue({
        isNewUser: 0,
        token: "access-token"
      });

      await completeProfile(req, res);

      expect(AuthService.completeProfileHandler).toHaveBeenCalledWith(req, res);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { isNewUser: 0, token: "access-token" },
        "auth.profileCompleted",
        "en"
      );
    });

    it("should return error if email already exists", async () => {
      req = mockRequest({ registrationToken: "mocked-token", email: "test@example.com" });
      (AuthService.completeProfileHandler as jest.Mock).mockRejectedValue(new Error("Email already exists"));

      await completeProfile(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Email already exists",
        "en",
        200,
        expect.any(Error)
      );
    });
  });

  describe("selectGenres", () => {
    it("should update genres for authenticated user", async () => {
      req = mockRequest(
        { genres: ["64a7b9c3e4b0c2d3f4a5b6c7"] },
        { _id: "user123" }
      );
      (AuthService.selectGenresHandler as jest.Mock).mockResolvedValue({
        genres: ["64a7b9c3e4b0c2d3f4a5b6c7"]
      });

      await selectGenres(req, res);

      expect(AuthService.selectGenresHandler).toHaveBeenCalledWith(req);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { genres: ["64a7b9c3e4b0c2d3f4a5b6c7"] },
        "auth.selectGenresSuccess",
        "en"
      );
    });

    it("should return error if handler throws error", async () => {
      req = mockRequest();
      (AuthService.selectGenresHandler as jest.Mock).mockRejectedValue(new Error("auth.unauthorized"));

      await selectGenres(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        200,
        expect.any(Error)
      );
    });
  });

  describe("getActiveGenres", () => {
    it("[Positive] should return active genres listing", async () => {
      req = mockRequest({}, undefined, "127.0.0.1", {}, { page: "1", limit: "10" });
      const mockResult = { items: [{ _id: "g1", name: "Action" }], total: 1 };
      (AuthService.getActiveGenresHandler as jest.Mock).mockResolvedValue(mockResult);

      await getActiveGenres(req, res);

      expect(AuthService.getActiveGenresHandler).toHaveBeenCalledWith(1, 10);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "auth.genresRetrievedSuccess",
        "en"
      );
    });

    it("[Validation/Edge] should fallback to page 1 and limit 10 when invalid query params provided", async () => {
      req = mockRequest({}, undefined, "127.0.0.1", {}, { page: "invalid", limit: "-5" });
      (AuthService.getActiveGenresHandler as jest.Mock).mockResolvedValue({ items: [] });

      await getActiveGenres(req, res);

      expect(AuthService.getActiveGenresHandler).toHaveBeenCalledWith(1, 1);
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest();
      (AuthService.getActiveGenresHandler as jest.Mock).mockRejectedValue(new Error("Db error"));

      await getActiveGenres(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Db error", "en", 200, expect.any(Error));
    });
  });

  describe("getMyGenres", () => {
    it("[Positive] should return user selected genres for logged-in user", async () => {
      req = mockRequest({}, { _id: "user123" });
      const mockPayload = { total: 1, genres: [{ _id: "g1", name: "Action" }] };
      (AuthService.getMyGenresHandler as jest.Mock).mockResolvedValue(mockPayload);

      await getMyGenres(req, res);

      expect(AuthService.getMyGenresHandler).toHaveBeenCalledWith("user123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockPayload,
        "auth.genresRetrievedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest({}, { _id: "user123" });
      (AuthService.getMyGenresHandler as jest.Mock).mockRejectedValue(new Error("auth.userNotFound"));

      await getMyGenres(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.userNotFound", "en", 200, expect.any(Error));
    });
  });

  describe("getUserAccounts", () => {
    it("[Positive] should return user sub-profiles for authenticated user", async () => {
      req = mockRequest({}, { _id: "user123" });
      const mockAccounts = [{ _id: "p1", displayName: "Kanak" }];
      (AuthService.getUserAccountsHandler as jest.Mock).mockResolvedValue(mockAccounts);

      await getUserAccounts(req, res);

      expect(AuthService.getUserAccountsHandler).toHaveBeenCalledWith("user123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockAccounts,
        "auth.accountsRetrievedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest({}, { _id: "user123" });
      (AuthService.getUserAccountsHandler as jest.Mock).mockRejectedValue(new Error("Account error"));

      await getUserAccounts(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Account error", "en", 200, expect.any(Error));
    });
  });

  describe("createUserAccount", () => {
    it("[Positive] should create new user account sub-profile and return 201 status", async () => {
      req = mockRequest({ displayName: "Kids Profile", profileType: "KIDS" }, { _id: "user123" });
      const mockCreated = { _id: "p2", displayName: "Kids Profile", profileType: "KIDS" };
      (AuthService.createUserAccountHandler as jest.Mock).mockResolvedValue(mockCreated);

      await createUserAccount(req, res);

      expect(AuthService.createUserAccountHandler).toHaveBeenCalledWith("user123", req.body);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockCreated,
        "auth.accountCreatedSuccess",
        "en",
        201
      );
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest({}, { _id: "user123" });
      (AuthService.createUserAccountHandler as jest.Mock).mockRejectedValue(new Error("Creation error"));

      await createUserAccount(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Creation error", "en", 200, expect.any(Error));
    });
  });

  describe("getTermsAndConditions", () => {
    it("[Positive] should return active terms and conditions data", async () => {
      req = mockRequest();
      const mockTerms = { title: "Terms & Conditions", content: "..." };
      (AuthService.getTermsAndConditionsHandler as jest.Mock).mockResolvedValue(mockTerms);

      await getTermsAndConditions(req, res);

      expect(AuthService.getTermsAndConditionsHandler).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockTerms,
        "auth.termsRetrievedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest();
      (AuthService.getTermsAndConditionsHandler as jest.Mock).mockRejectedValue(new Error("Fetch error"));

      await getTermsAndConditions(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Fetch error", "en", 200, expect.any(Error));
    });
  });

  describe("getPrivacyPolicy", () => {
    it("[Positive] should return active privacy policy data", async () => {
      req = mockRequest();
      const mockPrivacy = { title: "Privacy Policy", content: "..." };
      (AuthService.getPrivacyPolicyHandler as jest.Mock).mockResolvedValue(mockPrivacy);

      await getPrivacyPolicy(req, res);

      expect(AuthService.getPrivacyPolicyHandler).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockPrivacy,
        "auth.privacyRetrievedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when handler throws error", async () => {
      req = mockRequest();
      (AuthService.getPrivacyPolicyHandler as jest.Mock).mockRejectedValue(new Error("Privacy error"));

      await getPrivacyPolicy(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Privacy error", "en", 200, expect.any(Error));
    });
  });

  describe("mobileLogout", () => {
    it("[Positive] should logout authenticated mobile user successfully", async () => {
      req = mockRequest({ deviceId: "device123" }, { _id: "user123" });
      (AuthService.mobileLogoutHandler as jest.Mock).mockResolvedValue({ message: "auth.logoutSuccess" });

      await mobileLogout(req, res);

      expect(AuthService.mobileLogoutHandler).toHaveBeenCalledWith("user123", res, "device123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "auth.logoutSuccess" },
        "auth.logoutSuccess",
        "en"
      );
    });

    it("[Negative] should return unauthorized if userId is missing", async () => {
      req = mockRequest();

      await mobileLogout(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });

    it("[Negative] should handle service errors during logout", async () => {
      req = mockRequest({}, { _id: "user123" });
      (AuthService.mobileLogoutHandler as jest.Mock).mockRejectedValue(new Error("Logout error"));

      await mobileLogout(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Logout error",
        "en",
        500,
        expect.any(Error)
      );
    });
  });

  describe("updateUserAccount", () => {
    it("[Positive] should update account and return 200 success", async () => {
      req = mockRequest({ name: "Updated Profile Name" }, { _id: "user123" });
      req.params = { accountId: "acc123" };
      const mockResult = { account: { _id: "acc123", displayName: "Updated Profile Name" } };
      (AuthService.updateUserAccountHandler as jest.Mock).mockResolvedValue(mockResult);

      await updateUserAccount(req, res);

      expect(AuthService.updateUserAccountHandler).toHaveBeenCalledWith("user123", "acc123", req.body);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "auth.accountUpdatedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when update handler throws error", async () => {
      req = mockRequest({}, { _id: "user123" });
      req.params = { accountId: "acc123" };
      (AuthService.updateUserAccountHandler as jest.Mock).mockRejectedValue(new Error("auth.accountNotFound"));

      await updateUserAccount(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.accountNotFound", "en", 200, expect.any(Error));
    });
  });

  describe("deleteUserAccount", () => {
    it("[Positive] should delete account and return success", async () => {
      req = mockRequest({}, { _id: "user123" });
      req.params = { accountId: "acc123" };
      const mockResult = { message: "auth.accountDeletedSuccess" };
      (AuthService.deleteUserAccountHandler as jest.Mock).mockResolvedValue(mockResult);

      await deleteUserAccount(req, res);

      expect(AuthService.deleteUserAccountHandler).toHaveBeenCalledWith("user123", "acc123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "auth.accountDeletedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when delete account handler throws error", async () => {
      req = mockRequest({}, { _id: "user123" });
      req.params = { accountId: "acc123" };
      (AuthService.deleteUserAccountHandler as jest.Mock).mockRejectedValue(new Error("auth.cannotDeleteLastAccount"));

      await deleteUserAccount(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.cannotDeleteLastAccount", "en", 200, expect.any(Error));
    });
  });

  describe("sendDeleteUserOtp", () => {
    it("[Positive] should send delete OTP and return success response", async () => {
      req = mockRequest({}, { _id: "user123" });
      const mockResult = { otpId: "otp123", message: "auth.otpSent" };
      (AuthService.sendDeleteUserOtpHandler as jest.Mock) = jest.fn().mockResolvedValue(mockResult);

      await sendDeleteUserOtp(req, res);

      expect(AuthService.sendDeleteUserOtpHandler).toHaveBeenCalledWith("user123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "auth.otpSent",
        "en"
      );
    });
  });

  describe("deleteUser", () => {
    it("[Positive] should delete primary user account and return success with OTP", async () => {
      req = mockRequest({ otp: "1234" }, { _id: "user123" });
      const mockResult = { message: "auth.userDeletedSuccess" };
      (AuthService.deleteUserHandler as jest.Mock) = jest.fn().mockResolvedValue(mockResult);

      await deleteUser(req, res);

      expect(AuthService.deleteUserHandler).toHaveBeenCalledWith("user123", "1234", res, req);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "auth.userDeletedSuccess",
        "en"
      );
    });

    it("[Negative] should return error response when delete user handler throws error", async () => {
      req = mockRequest({ otp: "1234" }, { _id: "user123" });
      (AuthService.deleteUserHandler as jest.Mock) = jest.fn().mockRejectedValue(new Error("auth.userNotFound"));

      await deleteUser(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "auth.userNotFound", "en", 200, expect.any(Error));
    });
  });
});
