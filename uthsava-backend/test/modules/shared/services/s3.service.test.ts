import { S3, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

jest.mock("@aws-sdk/client-s3", () => {
  const sendFn = jest.fn().mockResolvedValue({});
  (global as any).mockS3Send = sendFn;
  return {
    S3: jest.fn().mockImplementation(() => ({
      send: sendFn,
    })),
    PutObjectCommand: jest.fn().mockImplementation((args) => args),
    GetObjectCommand: jest.fn().mockImplementation((args) => args),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
  };
});

import { S3Service, getPresignedUploadUrl } from "../../../../src/modules/shared/services/s3.service";

const mockSend = (global as any).mockS3Send;

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.com"),
}));

jest.mock("../../../../src/core/config", () => ({
  config: {
    aws: {
      region: "us-east-1",
      accessKeyId: "mockAccessKeyId",
      secretAccessKey: "mockSecretAccessKey",
      s3Bucket: "mock-bucket",
      cloudFrontUrl: "https://cloudfront.net",
    },
  },
}));

describe("S3 Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  describe("generatePresignedUrl", () => {
    it("[Positive] should successfully generate presigned upload url and sanitize filename", async () => {
      const result = await S3Service.generatePresignedUrl("Hello World!.png", "image/png", "avatars");

      expect(result.uploadUrl).toBe("https://signed-url.com");
      expect(result.key).toMatch(/octal\/avatars\/\d+-hello-world.png/);
      expect(result.fileUrl).toContain("https://cloudfront.net/");
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "mock-bucket",
          ContentType: "image/png",
        })
      );
    });
  });

  describe("getPresignedDownloadUrl", () => {
    it("[Positive] should successfully generate presigned download url", async () => {
      const result = await S3Service.getPresignedDownloadUrl("avatars/user1.png");

      expect(result).toBe("https://signed-url.com");
      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "mock-bucket",
          Key: "avatars/user1.png",
        })
      );
    });
  });

  describe("deleteFile", () => {
    it("[Positive] should successfully delete file from s3 bucket", async () => {
      await S3Service.deleteFile("avatars/user1.png");

      expect(DeleteObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "mock-bucket",
          Key: "avatars/user1.png",
        })
      );
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("getPresignedUploadUrl (Legacy)", () => {
    it("[Positive] should successfully generate presigned upload url using legacy exporter", async () => {
      const result = await getPresignedUploadUrl("avatars/user1.png", "image/png");

      expect(result).toBe("https://signed-url.com");
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "mock-bucket",
          Key: "avatars/user1.png",
          ContentType: "image/png",
        })
      );
    });
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  describe("deleteFile Validation", () => {
    it("[Negative] should return early without calling s3 if key is empty", async () => {
      await S3Service.deleteFile("");

      expect(DeleteObjectCommand).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  describe("deleteFile Edge Cases", () => {
    it("[Edge] should catch and log error if s3Instance.send throws an exception", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const s3Error = new Error("S3 deletion failed");
      mockSend.mockRejectedValueOnce(s3Error);

      await S3Service.deleteFile("avatars/user1.png");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error deleting file avatars/user1.png from S3:", s3Error);
      consoleErrorSpy.mockRestore();
    });
  });
});
