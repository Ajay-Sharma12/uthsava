/// <reference types="jest" />
import { UserProfile, ProfileType } from "../../src/models/user-profile.model";
import mongoose from "mongoose";

describe("UserProfile Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "JohnDoe",
    });

    const error = profile.validateSync();
    expect(error).toBeUndefined();
    expect(profile.profileType).toBe(ProfileType.STANDARD);
    expect(profile.notificationEnabled).toBe(true);
    expect(profile.isDefault).toBe(true);
  });

  it("[Positive] should validate with all optional fields", () => {
    const langId = new mongoose.Types.ObjectId();
    const genreId = new mongoose.Types.ObjectId();

    const profile = new UserProfile({
      userId: validUserId,
      displayName: "KidsProfile",
      profilePicture: "https://cdn.example.com/avatar.jpg",
      profileType: ProfileType.KIDS,
      preferredLanguageIds: [langId],
      favoriteGenreIds: [genreId],
      avatarId: "avatar_kids_1",
      notificationEnabled: false,
      isDefault: false,
    });

    const error = profile.validateSync();
    expect(error).toBeUndefined();
    expect(profile.profileType).toBe(ProfileType.KIDS);
    expect(profile.notificationEnabled).toBe(false);
  });

  it("[Positive] should default profileType to STANDARD", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "UserA12",
    });
    expect(profile.profileType).toBe(ProfileType.STANDARD);
  });

  it("[Positive] should default notificationEnabled to true", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "UserB12",
    });
    expect(profile.notificationEnabled).toBe(true);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const profile = new UserProfile({
      displayName: "JohnDoe",
    } as any);

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when displayName is missing", () => {
    const profile = new UserProfile({
      userId: validUserId,
    } as any);

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["displayName"]).toBeDefined();
  });

  it("[Negative] should fail when displayName is below minlength of 2", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "J",
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["displayName"]).toBeDefined();
  });

  it("[Negative] should fail when displayName exceeds maxlength of 40", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "A".repeat(41),
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["displayName"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid profileType enum value", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "ValidName",
      profileType: "ADULT" as any,
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["profileType"]).toBeDefined();
  });

  it("[Edge] should accept displayName at exactly minlength (2 chars)", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "Al",
    });
    const error = profile.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept displayName at exactly maxlength (40 chars)", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "A".repeat(40),
    });
    const error = profile.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept KIDS profileType", () => {
    const profile = new UserProfile({
      userId: validUserId,
      displayName: "KidUser",
      profileType: ProfileType.KIDS,
    });
    const error = profile.validateSync();
    expect(error).toBeUndefined();
    expect(profile.profileType).toBe(ProfileType.KIDS);
  });
});
