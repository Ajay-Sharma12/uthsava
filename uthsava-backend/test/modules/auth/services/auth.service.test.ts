/// <reference types="jest" />
import { AuthService } from "../../../../src/modules/auth/services/auth.service";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, UserStatus } from "../../../../src/models/user.model";
import { OTP, OTPType, Genre, UserProfile } from "../../../../src/models";
import { EmailTemplate } from "../../../../src/models/email-template.model";
import { sendMail } from "../../../../src/modules/shared/services/mail.service";
import { generateOtp } from "../../../../src/modules/shared/helpers/otp.helper";
import { buildUserResponse } from "../../../../src/modules/shared/helpers/buildUserResponse";
import { updateUserLoginInfo } from "../../../../src/modules/shared/helpers/updateUserLoginInfo";
import { saveUserSession } from "../../../../src/modules/shared/helpers/saveUserSession";
import { validateProfile } from "../../../../src/modules/shared/helpers/validateProfile";
import { validateRegistrationToken } from "../../../../src/modules/shared/helpers/validateRegistrationToken";
import { Request, Response } from "express";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../../../../src/models/user.model", () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
  UserStatus: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended",
    DELETED: "deleted",
  },
}));
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn(),
  },
}));
jest.mock("../../../../src/models", () => {
  const UserProfileMock: any = jest.fn().mockImplementation((data) => ({
    _id: "profile_123",
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnValue({ _id: "profile_123", ...data }),
    save: jest.fn().mockResolvedValue({ _id: "profile_123", ...data }),
    ...data,
  }));
  UserProfileMock.find = jest.fn();
  UserProfileMock.findOne = jest.fn();
  UserProfileMock.countDocuments = jest.fn();

  return {
    OTP: {
      findOne: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    },
    OTPType: {
      FORGOT_PASSWORD: "forgot_password",
      MOBILE_LOGIN: "mobile_login",
    },
    Genre: {
      find: jest.fn(),
    },
    GenreStatus: {
      ACTIVE: "active",
    },
    UserProfile: UserProfileMock,
    CmsPage: {
      findOne: jest.fn(),
    },
    PageStatus: {
      ACTIVE: "active",
    },
    ProfileType: {
      STANDARD: "STANDARD",
      KIDS: "KIDS",
    },
    UserSession: {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    },
  };
});
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../../../src/modules/shared/helpers/avatar.helper", () => ({
  getDefaultUserProfileAvatarUrl: jest.fn().mockResolvedValue("http://example.com/default-avatar.png"),
}));
jest.mock("../../../../src/modules/shared/helpers/otp.helper");
jest.mock("../../../../src/modules/shared/helpers/buildUserResponse");
jest.mock("../../../../src/modules/shared/helpers/updateUserLoginInfo");
jest.mock("../../../../src/modules/shared/helpers/saveUserSession");
jest.mock("../../../../src/modules/shared/helpers/validateProfile");
jest.mock("../../../../src/modules/shared/helpers/validateRegistrationToken");

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("AuthService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * register & validatePassword & hashPassword Method Tests
   * ========================================================================= */
  describe("Basic Auth Helpers", () => {
    it("[Positive] should register a new user with hashed password", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_pass");
      const result = await AuthService.register("user@test.com", "pass123");
      expect(result.email).toBe("user@test.com");
      expect(result.password).toBe("hashed_pass");
    });

    it("[Positive] should validate password correctly", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await AuthService.validatePassword({ password: "hashed" } as any, "password");
      expect(result).toBe(true);
    });

    it("[Positive] should hash password", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      const result = await AuthService.hashPassword("password");
      expect(result).toBe("hashed");
    });
  });

  /* =========================================================================
   * Token Handling Tests
   * ========================================================================= */
  describe("Token Handling", () => {
    it("[Positive] should generate access and refresh tokens correctly", () => {
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce("accessToken123")
        .mockReturnValueOnce("refreshToken123");

      const tokens = AuthService.generateTokens({ _id: "user123", role: "USER" } as any);
      expect(tokens).toEqual({
        accessToken: "accessToken123",
        refreshToken: "refreshToken123",
      });
    });

    it("[Positive] should generate registration token correctly", () => {
      (jwt.sign as jest.Mock).mockReturnValue("regToken123");
      const token = AuthService.generateRegistrationToken("9876543210", "+91");
      expect(token).toBe("regToken123");
    });

    it("[Positive] should verify registration token successfully", () => {
      const decodedPayload = { mobile: "9876543210", purpose: "registration" };
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      const result = AuthService.verifyRegistrationToken("validToken");
      expect(result).toEqual(decodedPayload);
    });

    it("[Negative] should throw if verification fails or purpose is invalid", () => {
      (jwt.verify as jest.Mock).mockReturnValue({ purpose: "other" });
      expect(() => AuthService.verifyRegistrationToken("invalidToken")).toThrow(/Invalid or expired registration token|auth\.invalidRegistrationToken/);
    });

    it("[Positive] should verify refresh token successfully", () => {
      (jwt.verify as jest.Mock).mockReturnValue({ sub: "user123" });
      const result = AuthService.verifyRefreshToken("refToken");
      expect(result).toEqual({ sub: "user123" });
    });

    it("[Edge] should throw if refresh token is invalid", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("expired");
      });
      expect(() => AuthService.verifyRefreshToken("invalid")).toThrow("Invalid or expired refresh token");
    });
  });

  /* =========================================================================
   * Cookie Management Tests
   * ========================================================================= */
  describe("Cookie Management", () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      };
    });

    it("[Positive] should set refresh token cookie correctly", () => {
      AuthService.setRefreshTokenCookie(mockRes as Response, "token123", true);
      expect(mockRes.cookie).toHaveBeenCalledWith("refreshToken", "token123", expect.objectContaining({
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }));
    });

    it("[Positive] should clear refresh token cookie correctly", () => {
      AuthService.clearRefreshTokenCookie(mockRes as Response);
      expect(mockRes.clearCookie).toHaveBeenCalledWith("refreshToken", expect.objectContaining({
        httpOnly: true,
      }));
    });
  });

  /* =========================================================================
   * requestPasswordResetOTP Tests
   * ========================================================================= */
  describe("requestPasswordResetOTP", () => {
    it("[Positive] should send reset OTP successfully if user exists and wait timer is cleared", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ _id: "user123", email: "user@test.com", role: "user" });
      (OTP.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      (generateOtp as jest.Mock).mockReturnValue("123456");
      (OTP.create as jest.Mock).mockResolvedValue({ _id: "otpRecordId" });
      (EmailTemplate.findOne as jest.Mock).mockReturnValue({
        then: jest.fn().mockImplementation((callback) => {
          callback({ subject: "Reset OTP", description: "Your code is {{otp}}" });
          return { catch: jest.fn() };
        }),
      });

      const result = await AuthService.requestPasswordResetOTP("user@test.com");
      expect(result).toEqual({
        _id: "otpRecordId",
        message: "OTP sent successfully",
      });
    });

    it("[Negative] should throw if user not found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      await expect(AuthService.requestPasswordResetOTP("missing@test.com")).rejects.toThrow("user.notFound");
    });

    it("[Validation] should throw timer exception if OTP resend wait time has not elapsed", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ _id: "user123", email: "user@test.com", role: "user" });
      const recentOtp = { createdAt: new Date(Date.now() - 30 * 1000) }; // 30 seconds ago (wait is 60s)
      (OTP.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(recentOtp),
      });

      await expect(AuthService.requestPasswordResetOTP("user@test.com")).rejects.toThrow(/auth.otpWaitTimer/);
    });
  });

  /* =========================================================================
   * verifyOTP Tests
   * ========================================================================= */
  describe("verifyOTP", () => {
    it("[Positive] should verify valid OTP successfully and delete record", async () => {
      const mockRecord = { _id: "record123", otp: "123456", expiresAt: new Date(Date.now() + 60000), attempts: 0 };
      (OTP.findOne as jest.Mock).mockResolvedValue(mockRecord);

      const result = await AuthService.verifyOTP("user@test.com", "123456", "record123");
      expect(result).toBe(true);
      expect(OTP.deleteOne).toHaveBeenCalledWith({ _id: "record123" });
    });

    it("[Negative] should throw on invalid OTP id", async () => {
      (OTP.findOne as jest.Mock).mockResolvedValue(null);
      await expect(AuthService.verifyOTP("user@test.com", "123456", "invalidId")).rejects.toThrow("auth.otpInvalid");
    });

    it("[Validation] should throw and increment attempts on mismatching OTP value", async () => {
      const mockRecord = {
        _id: "record123",
        otp: "123456",
        expiresAt: new Date(Date.now() + 60000),
        attempts: 1,
        save: jest.fn(),
      };
      (OTP.findOne as jest.Mock).mockResolvedValue(mockRecord);

      await expect(AuthService.verifyOTP("user@test.com", "wrong", "record123")).rejects.toThrow("auth.otpInvalid");
      expect(mockRecord.attempts).toBe(2);
      expect(mockRecord.save).toHaveBeenCalled();
    });

    it("[Edge] should lock OTP if too many failed attempts", async () => {
      const mockRecord = { _id: "record123", otp: "123456", expiresAt: new Date(Date.now() + 60000), attempts: 5 };
      (OTP.findOne as jest.Mock).mockResolvedValue(mockRecord);

      await expect(AuthService.verifyOTP("user@test.com", "123456", "record123")).rejects.toThrow("auth.otpLocked:60");
    });
  });
  /* =========================================================================
   * verifyMobileOtpHandler Tests
   * ========================================================================= */
  describe("verifyMobileOtpHandler", () => {
    it("[Positive] should accept static test OTP '1234' in non-production environment", async () => {
      (OTP.findOne as jest.Mock).mockResolvedValue(null);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const req = { body: { mobile: "9878790875", countryCode: "+91", otp: "1234" } } as any;
      const res = {} as any;

      const result = await AuthService.verifyMobileOtpHandler(req, res) as { isNewUser: number; registrationToken: string };
      expect(result.isNewUser).toBe(1);
      expect(result.registrationToken).toBeDefined();
    });
    it("[Negative] should reject login if existing user has a producer role", async () => {
      (OTP.findOne as jest.Mock).mockResolvedValue({ _id: "otp1", otp: "1234", expiresAt: new Date(Date.now() + 60000), attempts: 0 });
      (User.findOne as jest.Mock).mockResolvedValue({ _id: "prod123", role: "producer", status: "active" });

      const req = { body: { mobile: "9878790875", countryCode: "+91", otp: "1234" } } as any;
      const res = {} as any;

      await expect(AuthService.verifyMobileOtpHandler(req, res)).rejects.toThrow("auth.onlyUserRoleAllowed");
    });

    it("[Negative] should reject mobile login trigger if user has producer role", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ _id: "prod123", role: "producer" });
      const req = { body: { mobile: "9878790875", countryCode: "+91" } } as any;

      await expect(AuthService.mobileLoginHandler(req)).rejects.toThrow("auth.onlyUserRoleAllowed");
    });
  });



  /* =========================================================================
   * selectGenresHandler Tests
   * ========================================================================= */
  describe("selectGenresHandler", () => {
    it("[Positive] should select genres successfully", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: ["action", "comedy"] },
      } as any;

      (Genre.find as jest.Mock).mockResolvedValue([
        { _id: "action", status: "active" },
        { _id: "comedy", status: "active" },
      ]);

      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "user123",
          genres: ["action", "comedy"],
        }),
      });

      const result = await AuthService.selectGenresHandler(req);
      expect(result).toEqual({ genres: [{ _id: "action" }, { _id: "comedy" }] });
    });

    it("[Validation] should throw auth.genreNotFound if single selected genre ID does not exist", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: ["invalid_id_1"] },
      } as any;

      (Genre.find as jest.Mock).mockResolvedValue([]);

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.genreNotFound");
    });

    it("[Validation] should throw auth.genresNotFound if multiple selected genre IDs do not exist", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: ["invalid_id_1", "invalid_id_2"] },
      } as any;

      (Genre.find as jest.Mock).mockResolvedValue([]);

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.genresNotFound");
    });

    it("[Validation] should throw auth.genreInactive if selected genre exists but is inactive", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: ["inactive_id_1"] },
      } as any;

      (Genre.find as jest.Mock).mockResolvedValue([
        { _id: "inactive_id_1", status: "inactive" },
      ]);

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.genreInactive");
    });

    it("[Validation] should throw if genres payload is not an array", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: "action" },
      } as any;

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.genresMustBeArray");
    });

    it("[Validation] should throw if genres payload has more than 5 elements", async () => {
      const req = {
        user: { _id: "user123" },
        body: { genres: ["1", "2", "3", "4", "5", "6"] },
      } as any;

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.maxFiveGenresAllowed");
    });

    it("[Negative] should throw if user is not authorized (no sub)", async () => {
      const req = {
        body: { genres: ["action"] },
      } as any;

      await expect(AuthService.selectGenresHandler(req)).rejects.toThrow("auth.unauthorized");
    });
  });

  /* =========================================================================
   * getActiveGenresHandler Tests
   * ========================================================================= */
  describe("getActiveGenresHandler", () => {
    it("[Positive] should return only active genre items with type 'genre'", async () => {
      const mockGenres = [
        {
          _id: "g1",
          name: "Horror",
          type: "genre",
          icon: "icon.png",
          description: "Horror genre",
          displayOrder: 1,
          status: "active",
        },
      ];

      (Genre.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockGenres),
        }),
      });

      const result = await AuthService.getActiveGenresHandler();
      expect(Genre.find).toHaveBeenCalledWith({
        type: "genre",
        status: "active",
      });
      expect(result.total).toBe(1);
      expect(result.genres[0].name).toBe("Horror");
      expect(result.genres[0].type).toBe("genre");
    });
  });

  /* =========================================================================
   * getUserAccountsHandler Tests
   * ========================================================================= */
  describe("getUserAccountsHandler", () => {
    it("[Positive] should return accounts for valid userId", async () => {
      const mockProfileDoc = {
        toObject: () => ({
          _id: "p1",
          displayName: "Profile 1",
          profilePicture: "http://example.com/pic.jpg",
          profileType: "STANDARD",
          isDefault: true,
        }),
      };
      (UserProfile.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockProfileDoc]),
      });

      const result = await AuthService.getUserAccountsHandler("507f1f77bcf86cd799439011");
      expect(result.total).toBe(1);
      expect(result.accounts[0].displayName).toBe("Profile 1");
    });

    it("[Negative/Validation] should throw auth.unauthorized if userId is falsy", async () => {
      await expect(AuthService.getUserAccountsHandler("")).rejects.toThrow("auth.unauthorized");
    });
  });

  /* =========================================================================
   * createUserAccountHandler Tests
   * ========================================================================= */
  describe("createUserAccountHandler", () => {
    it("[Positive] should create new user account sub-profile successfully", async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);
      (UserProfile.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await AuthService.createUserAccountHandler("507f1f77bcf86cd799439011", {
        name: "Kids Account",
        isKids: true,
      });

      expect(result.account).toBeDefined();
      expect(result.account.displayName).toBe("Kids Account");
      expect(result.account.isKids).toBe(true);
    });

    it("[Validation/Negative] should throw auth.accountNameRequired if name is missing or empty", async () => {
      await expect(
        AuthService.createUserAccountHandler("507f1f77bcf86cd799439011", { name: "   " })
      ).rejects.toThrow("auth.accountNameRequired");
    });

    it("[Negative] should throw auth.accountNameDuplicate if profile with same name exists", async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue({ _id: "existing_id" });

      await expect(
        AuthService.createUserAccountHandler("507f1f77bcf86cd799439011", { name: "Existing Name" })
      ).rejects.toThrow("auth.accountNameDuplicate");
    });

    it("[Negative/Validation] should throw auth.unauthorized if userId is missing", async () => {
      await expect(
        AuthService.createUserAccountHandler("", { name: "Test" })
      ).rejects.toThrow("auth.unauthorized");
    });
  });

  /* =========================================================================
   * getMyGenresHandler Tests
   * ========================================================================= */
  describe("getMyGenresHandler", () => {
    it("[Positive] should return user selected genres with CloudFront icon URL", async () => {
      const mockGenre = {
        _id: "507f1f77bcf86cd799439011",
        name: "Action",
        type: "genre",
        icon: "genres/action.jpg",
        description: "Action movies",
        displayOrder: 1,
        status: "ACTIVE",
      };

      const mockUser = {
        _id: "507f1f77bcf86cd799439010",
        genres: [mockGenre],
      };

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await AuthService.getMyGenresHandler("507f1f77bcf86cd799439010");
      expect(result.total).toBe(1);
      expect(result.genres[0]._id).toBe("507f1f77bcf86cd799439011");
      expect(result.genres[0].name).toBe("Action");
    });

    it("[Negative] should throw auth.unauthorized when userId is missing", async () => {
      await expect(AuthService.getMyGenresHandler("")).rejects.toThrow("auth.unauthorized");
    });

    it("[Negative] should throw auth.userNotFound when user does not exist", async () => {
      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(AuthService.getMyGenresHandler("507f1f77bcf86cd799439010")).rejects.toThrow("auth.userNotFound");
    });
  });

  /* =========================================================================
   * getTermsAndConditionsHandler Tests
   * ========================================================================= */
  describe("getTermsAndConditionsHandler", () => {
    it("[Positive] should return active terms and conditions CMS page data", async () => {
      const mockPage = {
        _id: "terms_id",
        title: "Terms and Conditions",
        slug: "terms-and-conditions",
        content: "<p>Terms content</p>",
        updatedAt: new Date(),
      };
      const { CmsPage } = require("../../../../src/models");
      (CmsPage.findOne as jest.Mock).mockResolvedValue(mockPage);

      const result = await AuthService.getTermsAndConditionsHandler();
      expect(result.title).toBe("Terms and Conditions");
      expect(result.content).toBe("<p>Terms content</p>");
    });

    it("[Negative] should throw auth.termsNotFound if terms page is not found", async () => {
      const { CmsPage } = require("../../../../src/models");
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.getTermsAndConditionsHandler()).rejects.toThrow("auth.termsNotFound");
    });
  });

  /* =========================================================================
   * getPrivacyPolicyHandler Tests
   * ========================================================================= */
  describe("getPrivacyPolicyHandler", () => {
    it("[Positive] should return active privacy policy CMS page data", async () => {
      const mockPage = {
        _id: "privacy_id",
        title: "Privacy Policy",
        slug: "privacy-policy",
        content: "<p>Privacy content</p>",
        updatedAt: new Date(),
      };
      const { CmsPage } = require("../../../../src/models");
      (CmsPage.findOne as jest.Mock).mockResolvedValue(mockPage);

      const result = await AuthService.getPrivacyPolicyHandler();
      expect(result.title).toBe("Privacy Policy");
      expect(result.content).toBe("<p>Privacy content</p>");
    });

    it("[Negative] should throw auth.privacyNotFound if privacy page is not found", async () => {
      const { CmsPage } = require("../../../../src/models");
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.getPrivacyPolicyHandler()).rejects.toThrow("auth.privacyNotFound");
    });
  });

  /* =========================================================================
   * mobileLogoutHandler Tests
   * ========================================================================= */
  describe("mobileLogoutHandler", () => {
    it("[Positive] should clear user device metadata, UserSessions, and refresh token cookie", async () => {
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      const { UserSession } = require("../../../../src/models");

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });

      const result = await AuthService.mobileLogoutHandler("507f1f77bcf86cd799439011", mockRes);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        {
          $set: {
            refreshToken: null,
            deviceToken: null,
            deviceType: null,
            deviceId: null,
          },
        }
      );
      expect(UserSession.deleteMany).toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith("refreshToken", expect.anything());
      expect(result).toEqual({ message: "auth.logoutSuccess" });
    });

    it("[Positive] should clear specific device session when deviceId is provided", async () => {
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      const { UserSession } = require("../../../../src/models");

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });

      const result = await AuthService.mobileLogoutHandler("507f1f77bcf86cd799439011", mockRes, "device123");

      expect(UserSession.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: "device123" })
      );
      expect(result).toEqual({ message: "auth.logoutSuccess" });
    });

    it("[Negative] should throw auth.unauthorized if userId is missing", async () => {
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      await expect(AuthService.mobileLogoutHandler("", mockRes)).rejects.toThrow("auth.unauthorized");
    });
  });

  /* =========================================================================
   * updateUserAccountHandler Tests
   * ========================================================================= */
  describe("updateUserAccountHandler", () => {
    it("[Positive] should update sub-profile account details successfully", async () => {
      const mockProfile = {
        _id: "507f1f77bcf86cd799439012",
        displayName: "Old Name",
        profileType: "STANDARD",
        save: jest.fn().mockResolvedValue(true),
      };

      (UserProfile.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(null);

      const result = await AuthService.updateUserAccountHandler(
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439012",
        { name: "New Name", isKids: true }
      );

      expect(mockProfile.displayName).toBe("New Name");
      expect(mockProfile.profileType).toBe("KIDS");
      expect(mockProfile.save).toHaveBeenCalled();
      expect(result.account).toBeDefined();
    });

    it("[Negative] should throw auth.accountNotFound if account does not exist or belong to user", async () => {
      (UserProfile.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.updateUserAccountHandler("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", { name: "Test" })
      ).rejects.toThrow("auth.accountNotFound");
    });

    it("[Negative] should throw auth.accountNameDuplicate if duplicate name exists under same user", async () => {
      const mockProfile = {
        _id: "507f1f77bcf86cd799439012",
        displayName: "Old Name",
      };

      (UserProfile.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProfile) // for account check
        .mockResolvedValueOnce({ _id: "other_id" }); // for duplicate check

      await expect(
        AuthService.updateUserAccountHandler("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", { name: "Existing Name" })
      ).rejects.toThrow("auth.accountNameDuplicate");
    });
  });

  /* =========================================================================
   * deleteUserAccountHandler Tests
   * ========================================================================= */
  describe("deleteUserAccountHandler", () => {
    it("[Positive] should delete sub-profile account successfully", async () => {
      const mockProfile = { _id: "507f1f77bcf86cd799439012", isDefault: false };
      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);
      (UserProfile.countDocuments as jest.Mock).mockResolvedValue(2);
      (UserProfile.deleteOne as jest.Mock) = jest.fn().mockResolvedValue({ deletedCount: 1 });

      const result = await AuthService.deleteUserAccountHandler("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012");

      expect(UserProfile.deleteOne).toHaveBeenCalledWith({ _id: expect.anything() });
      expect(result).toEqual({ message: "auth.accountDeletedSuccess" });
    });

    it("[Negative] should throw auth.cannotDeleteLastAccount if user only has 1 sub-profile", async () => {
      const mockProfile = { _id: "507f1f77bcf86cd799439012" };
      (UserProfile.findOne as jest.Mock).mockResolvedValue(mockProfile);
      (UserProfile.countDocuments as jest.Mock).mockResolvedValue(1);

      await expect(
        AuthService.deleteUserAccountHandler("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012")
      ).rejects.toThrow("auth.cannotDeleteLastAccount");
    });
  });

  /* =========================================================================
   * sendDeleteUserOtpHandler & deleteUserHandler Tests
   * ========================================================================= */
  describe("sendDeleteUserOtpHandler", () => {
    it("[Positive] should send delete account OTP when user has no active subscription", async () => {
      const mockUser = { _id: "507f1f77bcf86cd799439011", mobile: "9876543210", countryCode: "+91" };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      const { UserSubscription } = require("../../../../src/models/user-subscription.model");
      (UserSubscription.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (OTP.findOne as jest.Mock).mockResolvedValue(null);
      (OTP.create as jest.Mock).mockResolvedValue({ _id: "otp123", otp: "1234" });

      const result = await AuthService.sendDeleteUserOtpHandler("507f1f77bcf86cd799439011");
      expect(result).toHaveProperty("message", "auth.otpSent");
    });

    it("[Negative] should throw auth.activeSubscriptionDeleteError if active subscription exists", async () => {
      const mockUser = { _id: "507f1f77bcf86cd799439011", mobile: "9876543210" };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      const { UserSubscription } = require("../../../../src/models/user-subscription.model");
      (UserSubscription.findOne as jest.Mock) = jest.fn().mockResolvedValue({ _id: "sub123", status: "ACTIVE" });

      await expect(AuthService.sendDeleteUserOtpHandler("507f1f77bcf86cd799439011")).rejects.toThrow("auth.activeSubscriptionDeleteError");
    });
  });

  describe("deleteUserHandler", () => {
    it("[Positive] should soft-delete user account, purge profiles & sessions, and clear cookies with valid OTP", async () => {
      const mockUser = { _id: "507f1f77bcf86cd799439011", status: "active", save: jest.fn().mockResolvedValue(true) };
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      const { UserSession } = require("../../../../src/models");
      const { UserSubscription } = require("../../../../src/models/user-subscription.model");

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserSubscription.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (OTP.findOne as jest.Mock).mockResolvedValue({ _id: "otp123", otp: "1234", expiresAt: new Date(Date.now() + 60000), attempts: 0 });
      (OTP.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (UserProfile.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });
      (UserSession.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const result = await AuthService.deleteUserHandler("507f1f77bcf86cd799439011", "1234", mockRes);

      expect(mockUser.status).toBe("deleted");
      expect(mockUser.save).toHaveBeenCalled();
      expect(UserProfile.deleteMany).toHaveBeenCalled();
      expect(UserSession.deleteMany).toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(result).toEqual({ message: "auth.userDeletedSuccess" });
    });

    it("[Negative] should throw validation.otpIsRequired if OTP is empty", async () => {
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      await expect(AuthService.deleteUserHandler("507f1f77bcf86cd799439011", "", mockRes)).rejects.toThrow("validation.otpIsRequired");
    });

    it("[Negative] should throw auth.userNotFound if user does not exist", async () => {
      const mockRes = { clearCookie: jest.fn() } as unknown as Response;
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.deleteUserHandler("507f1f77bcf86cd799439011", "1234", mockRes)).rejects.toThrow("auth.userNotFound");
    });
  });
});
