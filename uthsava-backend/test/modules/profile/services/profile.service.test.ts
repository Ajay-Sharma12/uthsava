/// <reference types="jest" />
import { Types } from "mongoose";
import { ProfileService } from "../../../../src/modules/profile/services/profile.service";
import { User } from "../../../../src/models/user.model";
import { AuthService } from "../../../../src/modules/auth/services/auth.service";

// Mock dependencies
jest.mock("../../../../src/models/user.model");
jest.mock("../../../../src/modules/auth/services/auth.service");
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ProfileService Tests", () => {
  const mockUserId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * getProfileById Method Tests
   * ========================================================================= */
  describe("getProfileById", () => {
    it("[Positive] should successfully return user profile when user exists", async () => {
      const mockUser = {
        _id: mockUserId,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const selectMock = jest.fn().mockResolvedValue(mockUser);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await ProfileService.getProfileById(mockUserId);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(selectMock).toHaveBeenCalledWith("-password -refreshToken");
      expect(result).toEqual(mockUser);
    });

    it("[Negative] should return null when user does not exist", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await ProfileService.getProfileById(mockUserId);

      expect(result).toBeNull();
    });

    it("[Edge] should throw error when DB findById fails", async () => {
      const selectMock = jest.fn().mockRejectedValue(new Error("DB error"));
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(ProfileService.getProfileById(mockUserId)).rejects.toThrow("Failed to fetch user profile");
    });
  });

  /* =========================================================================
   * updateProfile Method Tests
   * ========================================================================= */
  describe("updateProfile", () => {
    it("[Positive] should update profile fields and auto-generate fullName if firstName/lastName changes", async () => {
      const mockExistingUser = {
        _id: mockUserId,
        firstName: "OldFirst",
        lastName: "OldLast",
      };

      const mockUpdatedUser = {
        _id: mockUserId,
        firstName: "NewFirst",
        lastName: "OldLast",
        fullName: "NewFirst OldLast",
      };

      (User.findById as jest.Mock).mockResolvedValue(mockExistingUser);
      const selectMock = jest.fn().mockResolvedValue(mockUpdatedUser);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      const updateData = { firstName: "NewFirst" };
      const result = await ProfileService.updateProfile(mockUserId, updateData);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $set: { firstName: "NewFirst", fullName: "NewFirst OldLast" } },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("[Negative] should throw error if user not found when retrieving existing profile for fullName generation", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ProfileService.updateProfile(mockUserId, { firstName: "John" })
      ).rejects.toThrow("User not found");
    });

    it("[Negative] should throw error if user not found during update profile execution", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(
        ProfileService.updateProfile(mockUserId, { location: "New York" })
      ).rejects.toThrow("User not found");
    });
  });

  /* =========================================================================
   * updateProfileImage Method Tests
   * ========================================================================= */
  describe("updateProfileImage", () => {
    it("[Positive] should successfully update user profile image key", async () => {
      const mockUpdatedUser = {
        _id: mockUserId,
        profileImage: "image-key.jpg",
      };

      const selectMock = jest.fn().mockResolvedValue(mockUpdatedUser);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await ProfileService.updateProfileImage(mockUserId, "image-key.jpg");

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $set: { profileImage: "image-key.jpg" } },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("[Negative] should throw error if user not found during image update", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(
        ProfileService.updateProfileImage(mockUserId, "image-key.jpg")
      ).rejects.toThrow("User not found");
    });
  });

  /* =========================================================================
   * changePassword Method Tests
   * ========================================================================= */
  describe("changePassword", () => {
    const mockUser = {
      _id: mockUserId,
      password: "hashedCurrentPassword",
    };

    it("[Positive] should successfully verify old and change password to new one", async () => {
      const selectMock = jest.fn().mockResolvedValue(mockUser);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      (AuthService.validatePassword as jest.Mock)
        .mockResolvedValueOnce(true) // Valid current password
        .mockResolvedValueOnce(false); // New password not same as current
      (AuthService.hashPassword as jest.Mock).mockResolvedValue("hashedNewPassword");
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await ProfileService.changePassword(mockUserId, "CurrentPass123!", "NewPass123!");

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(selectMock).toHaveBeenCalledWith("+password");
      expect(AuthService.validatePassword).toHaveBeenNthCalledWith(1, mockUser, "CurrentPass123!");
      expect(AuthService.validatePassword).toHaveBeenNthCalledWith(2, mockUser, "NewPass123!");
      expect(AuthService.hashPassword).toHaveBeenCalledWith("NewPass123!");
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        {
          $set: { password: "hashedNewPassword" },
          $unset: { refreshToken: "", deviceToken: "", deviceType: "", deviceId: "" },
        },
        { runValidators: false }
      );
      expect(result).toBe(true);
    });

    it("[Negative] should throw error if user not found", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      await expect(
        ProfileService.changePassword(mockUserId, "CurrentPass123!", "NewPass123!")
      ).rejects.toThrow("User not found");
    });

    it("[Negative] should throw error if current password validation fails", async () => {
      const selectMock = jest.fn().mockResolvedValue(mockUser);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      (AuthService.validatePassword as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        ProfileService.changePassword(mockUserId, "WrongPass123!", "NewPass123!")
      ).rejects.toThrow("Current password is incorrect");
    });

    it("[Negative] should throw error if new password is same as current password", async () => {
      const selectMock = jest.fn().mockResolvedValue(mockUser);
      (User.findById as jest.Mock).mockReturnValue({ select: selectMock });

      (AuthService.validatePassword as jest.Mock)
        .mockResolvedValueOnce(true) // Valid current password
        .mockResolvedValueOnce(true); // New password same as current

      await expect(
        ProfileService.changePassword(mockUserId, "CurrentPass123!", "CurrentPass123!")
      ).rejects.toThrow("New password cannot be the same as current password");
    });
  });

  /* =========================================================================
   * updateNotificationSettings Method Tests
   * ========================================================================= */
  describe("updateNotificationSettings", () => {
    it("[Positive] should successfully update notificationSettings status", async () => {
      const mockUpdatedUser = {
        _id: mockUserId,
        notificationEnabled: true,
        toJSON: jest.fn().mockReturnValue({ _id: mockUserId, notificationEnabled: true }),
      };

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await ProfileService.updateNotificationSettings(mockUserId, true);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $set: { notificationEnabled: true } },
        { new: true, runValidators: true }
      );
      expect(result).toEqual({ _id: mockUserId, notificationEnabled: true });
    });

    it("[Negative] should throw error if user not found", async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        ProfileService.updateNotificationSettings(mockUserId, true)
      ).rejects.toThrow("User not found");
    });
  });
});
