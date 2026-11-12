/// <reference types="jest" />
import { OfflineDownload, DownloadStatus } from "../../src/models/offline-download.model";
import mongoose from "mongoose";

describe("OfflineDownload Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validProfileId = new mongoose.Types.ObjectId();
  const validContentId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      deviceId: "device-abc-123",
    });

    const error = download.validateSync();
    expect(error).toBeUndefined();
    expect(download.status).toBe(DownloadStatus.QUEUED);
  });

  it("[Positive] should validate with all fields including optional ones", () => {
    const seasonId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();

    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      seasonId,
      episodeId,
      deviceId: "device-xyz",
      status: DownloadStatus.COMPLETED,
      downloadedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const error = download.validateSync();
    expect(error).toBeUndefined();
    expect(download.status).toBe(DownloadStatus.COMPLETED);
    expect(download.seasonId).toBeDefined();
    expect(download.episodeId).toBeDefined();
  });

  it("[Positive] should default status to QUEUED", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      deviceId: "device-123",
    });
    expect(download.status).toBe(DownloadStatus.QUEUED);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const download = new OfflineDownload({
      profileId: validProfileId,
      contentId: validContentId,
      deviceId: "device-123",
    } as any);

    const error = download.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when profileId is missing", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      contentId: validContentId,
      deviceId: "device-123",
    } as any);

    const error = download.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["profileId"]).toBeDefined();
  });

  it("[Negative] should fail validation when contentId is missing", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      deviceId: "device-123",
    } as any);

    const error = download.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["contentId"]).toBeDefined();
  });

  it("[Negative] should fail validation when deviceId is missing", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
    } as any);

    const error = download.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["deviceId"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid status enum", () => {
    const download = new OfflineDownload({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      deviceId: "device-123",
      status: "IN_PROGRESS" as any,
    });

    const error = download.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should allow all valid DownloadStatus values", () => {
    const validStatuses = [
      DownloadStatus.QUEUED,
      DownloadStatus.DOWNLOADING,
      DownloadStatus.COMPLETED,
      DownloadStatus.FAILED,
      DownloadStatus.EXPIRED,
      DownloadStatus.DELETED,
    ];

    validStatuses.forEach((status) => {
      const download = new OfflineDownload({
        userId: validUserId,
        profileId: validProfileId,
        contentId: validContentId,
        deviceId: "device-123",
        status,
      });
      const error = download.validateSync();
      expect(error).toBeUndefined();
    });
  });
});
