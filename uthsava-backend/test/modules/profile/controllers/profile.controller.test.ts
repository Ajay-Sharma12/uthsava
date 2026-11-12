/// <reference types="jest" />
import { Request, Response } from "express";
import {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword,
  updateNotificationSettings,
} from "../../../../src/modules/profile/controllers/profile.controller";
import { ProfileService } from "../../../../src/modules/profile/services/profile.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

// Mock dependencies
jest.mock("../../../../src/modules/profile/services/profile.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userSub?: string, body: any = {}, params: any = {}) => {
  return {
    user: userSub ? { sub: userSub } : undefined,
    body,
    params,
  } as unknown as Request;
};

describe("ProfileController Tests", () => {
  let req: Request;
  let res: Response;
  const mockUserId = "user123";

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  /* =========================================================================
   * getProfile Tests
   * ========================================================================= */
  describe("getProfile", () => {
    it("[Positive] should successfully return user profile and disable caching", async () => {
      req = mockRequest(mockUserId);
      const mockProfile = {
        toJSON: () => ({ firstName: "John", lastName: "Doe" }),
      };
      (ProfileService.getProfileById as jest.Mock).mockResolvedValue(mockProfile);

      await getProfile(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
      expect(ProfileService.getProfileById).toHaveBeenCalledWith(mockUserId);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ firstName: "John", lastName: "Doe" }),
        "profile.fetchSuccess",
        "en"
      );
    });

    it("[Negative] should return unauthorized if req.user is undefined", async () => {
      req = mockRequest(undefined);

      await getProfile(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });

    it("[Negative] should return notFound if ProfileService returns null", async () => {
      req = mockRequest(mockUserId);
      (ProfileService.getProfileById as jest.Mock).mockResolvedValue(null);

      await getProfile(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "user.notFound", "en");
    });

    it("[Edge] should return error if ProfileService throws", async () => {
      req = mockRequest(mockUserId);
      (ProfileService.getProfileById as jest.Mock).mockRejectedValue(new Error("Service error"));

      await getProfile(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "profile.fetchError",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expect.any(Error)
      );
    });
  });

  /* =========================================================================
   * updateProfile Tests
   * ========================================================================= */
  describe("updateProfile", () => {
    const updateBody = { firstName: "Jane" };

    it("[Positive] should successfully update profile details", async () => {
      req = mockRequest(mockUserId, updateBody);
      const mockUpdatedProfile = {
        toJSON: () => ({ firstName: "Jane", lastName: "Doe" }),
      };
      (ProfileService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedProfile);

      await updateProfile(req, res);

      expect(ProfileService.updateProfile).toHaveBeenCalledWith(mockUserId, { firstName: "Jane" });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ firstName: "Jane" }),
        "profile.updateSuccess",
        "en"
      );
    });

    it("[Negative] should return unauthorized if req.user is undefined", async () => {
      req = mockRequest(undefined, updateBody);

      await updateProfile(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });

    it("[Negative] should return notFound if updateProfile throws 'User not found'", async () => {
      req = mockRequest(mockUserId, updateBody);
      (ProfileService.updateProfile as jest.Mock).mockRejectedValue(new Error("User not found"));

      await updateProfile(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "user.notFound", "en");
    });
  });

  /* =========================================================================
   * updateProfileImage Tests
   * ========================================================================= */
  describe("updateProfileImage", () => {
    it("[Positive] should successfully update profile image path", async () => {
      req = mockRequest(mockUserId, { profileImage: "image.jpg" });
      const mockUpdatedProfile = {
        toJSON: () => ({ profileImage: "image.jpg" }),
      };
      (ProfileService.updateProfileImage as jest.Mock).mockResolvedValue(mockUpdatedProfile);

      await updateProfileImage(req, res);

      expect(ProfileService.updateProfileImage).toHaveBeenCalledWith(mockUserId, "image.jpg");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ profileImage: "image.jpg" }),
        "profile.imageUpdateSuccess",
        "en"
      );
    });

    it("[Negative] should return badRequest if profileImage is missing from body", async () => {
      req = mockRequest(mockUserId, {});

      await updateProfileImage(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "validation.profileImageRequired", "en");
    });

    it("[Negative] should return unauthorized if req.user is undefined", async () => {
      req = mockRequest(undefined, { profileImage: "image.jpg" });

      await updateProfileImage(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });
  });

  /* =========================================================================
   * changePassword Tests
   * ========================================================================= */
  describe("changePassword", () => {
    const pwBody = { currentPassword: "OldPassword1!", newPassword: "NewPassword1!" };

    it("[Positive] should successfully change password", async () => {
      req = mockRequest(mockUserId, pwBody);
      (ProfileService.changePassword as jest.Mock).mockResolvedValue(true);

      await changePassword(req, res);

      expect(ProfileService.changePassword).toHaveBeenCalledWith(mockUserId, "OldPassword1!", "NewPassword1!");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, null, "profile.passwordChangeSuccess", "en");
    });

    it("[Negative] should return badRequest if current password is incorrect", async () => {
      req = mockRequest(mockUserId, pwBody);
      (ProfileService.changePassword as jest.Mock).mockRejectedValue(new Error("Current password is incorrect"));

      await changePassword(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "profile.incorrectPassword", "en");
    });

    it("[Negative] should return badRequest if new password is same as current", async () => {
      req = mockRequest(mockUserId, pwBody);
      (ProfileService.changePassword as jest.Mock).mockRejectedValue(new Error("New password cannot be the same as current password"));

      await changePassword(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "profile.samePassword", "en");
    });

    it("[Negative] should return unauthorized if req.user is undefined", async () => {
      req = mockRequest(undefined, pwBody);

      await changePassword(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });
  });

  /* =========================================================================
   * updateNotificationSettings Tests
   * ========================================================================= */
  describe("updateNotificationSettings", () => {
    it("[Positive] should successfully update notificationSettings status toggle", async () => {
      req = mockRequest(mockUserId, { notificationEnabled: true });
      (ProfileService.updateNotificationSettings as jest.Mock).mockResolvedValue({ notificationEnabled: true });

      await updateNotificationSettings(req, res);

      expect(ProfileService.updateNotificationSettings).toHaveBeenCalledWith(mockUserId, true);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ notificationEnabled: true }),
        "profile.notificationSettingsUpdated",
        "en"
      );
    });

    it("[Negative] should return unauthorized if req.user is undefined", async () => {
      req = mockRequest(undefined, { notificationEnabled: true });

      await updateNotificationSettings(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, "auth.unauthorized", "en");
    });
  });
});
