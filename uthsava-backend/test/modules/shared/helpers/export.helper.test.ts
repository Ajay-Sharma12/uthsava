import { S3, PutObjectCommand } from "@aws-sdk/client-s3";
import { Response } from "express";

// We mock S3 client similarly to s3.service.test.ts to avoid hoisting temporal dead zone issue
jest.mock("@aws-sdk/client-s3", () => {
  const sendFn = jest.fn().mockResolvedValue({});
  (global as any).mockExportS3Send = sendFn;
  return {
    S3: jest.fn().mockImplementation(() => ({
      send: sendFn,
    })),
    PutObjectCommand: jest.fn().mockImplementation((args) => args),
  };
});

import {
  uploadExportToS3,
  handleCsvExportResponse,
  handlePdfExportResponse,
} from "../../../../src/modules/shared/helpers/export.helper";

const mockSend = (global as any).mockExportS3Send;

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

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Export Helper Unit Tests", () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      attachment: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      headersSent: false,
    };
  });

  /* =========================================================================
   * uploadExportToS3 Tests
   * ========================================================================= */
  describe("uploadExportToS3", () => {
    it("[Positive] should successfully upload export file to S3 and return CloudFront URL", async () => {
      const buffer = Buffer.from("test-data");
      const url = await uploadExportToS3(buffer, {
        fileName: "Report (2026).csv",
        contentType: "text/csv",
        folder: "admin",
      });

      expect(mockSend).toHaveBeenCalled();
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "mock-bucket",
          Body: buffer,
          ContentType: "text/csv",
        })
      );
      // Key should have filename sanitized: "report--2026-.csv"
      expect(url).toMatch(/https:\/\/cloudfront\.net\/octal\/exports\/admin\/\d+-report--2026-\.csv/);
    });

    it("[Edge] should throw error when S3 send throws exception", async () => {
      mockSend.mockRejectedValueOnce(new Error("AWS Network error"));

      await expect(
        uploadExportToS3(Buffer.from(""), {
          fileName: "test.csv",
          contentType: "text/csv",
        })
      ).rejects.toThrow("Failed to upload export file to S3");
    });
  });

  /* =========================================================================
   * handleCsvExportResponse Tests
   * ========================================================================= */
  describe("handleCsvExportResponse", () => {
    it("[Positive] should return JSON with presigned URL when returnUrl is true", async () => {
      await handleCsvExportResponse(mockRes as Response, "col1,col2\nval1,val2", "export.csv", true);

      expect(mockSend).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          results: expect.objectContaining({
            fileName: "export.csv",
          }),
        })
      );
    });

    it("[Positive] should trigger direct file download when returnUrl is false", async () => {
      await handleCsvExportResponse(mockRes as Response, "col1,col2\nval1,val2", "export.csv", false);

      expect(mockSend).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(mockRes.attachment).toHaveBeenCalledWith("export.csv");
      expect(mockRes.send).toHaveBeenCalledWith("col1,col2\nval1,val2");
    });
  });

  /* =========================================================================
   * handlePdfExportResponse Tests
   * ========================================================================= */
  describe("handlePdfExportResponse", () => {
    let mockDoc: any;
    let registeredCallbacks: Record<string, Function>;

    beforeEach(() => {
      registeredCallbacks = {};
      mockDoc = {
        on: jest.fn().mockImplementation((event, cb) => {
          registeredCallbacks[event] = cb;
        }),
        end: jest.fn().mockImplementation(() => {
          if (registeredCallbacks["data"]) {
            registeredCallbacks["data"](Buffer.from("pdf-chunk-1"));
            registeredCallbacks["data"](Buffer.from("pdf-chunk-2"));
          }
          if (registeredCallbacks["end"]) {
            registeredCallbacks["end"]();
          }
        }),
        pipe: jest.fn(),
      };
    });

    it("[Positive] should upload collected buffer to S3 when returnUrl is true", async () => {
      await handlePdfExportResponse(mockRes as Response, mockDoc, "report.pdf", true);

      // Wait briefly for asynchronous callbacks inside doc.end mock implementation to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDoc.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(mockDoc.on).toHaveBeenCalledWith("end", expect.any(Function));
      expect(mockDoc.end).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          results: expect.objectContaining({
            fileName: "report.pdf",
          }),
        })
      );
    });

    it("[Positive] should stream PDF using doc.pipe when returnUrl is false", async () => {
      await handlePdfExportResponse(mockRes as Response, mockDoc, "report.pdf", false);

      expect(mockDoc.pipe).toHaveBeenCalledWith(mockRes);
      expect(mockDoc.end).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(mockRes.attachment).toHaveBeenCalledWith("report.pdf");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("[Negative] should return 500 when PDF S3 upload fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("Upload failed"));

      await handlePdfExportResponse(mockRes as Response, mockDoc, "report.pdf", true);

      // Wait briefly for asynchronous callbacks inside doc.end mock implementation to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Failed to upload export file",
        })
      );
    });
  });
});
