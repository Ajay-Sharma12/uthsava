import { Request, Response } from "express";
import { getPresignedUrl, sendEmail, deleteFile } from "../../../../src/modules/util/controllers/util.controller";
import { S3Service } from "../../../../src/modules/shared/services/s3.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { sendMail } from "../../../../src/modules/shared/services/mail.service";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

// Mock dependencies
jest.mock("../../../../src/modules/shared/services/s3.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn(),
}));
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
  return res as Response;
};

const mockRequest = (body: any = {}) => {
  return {
    body,
  } as unknown as Request;
};

describe("UtilController Tests", () => {
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  /* =========================================================================
   * getPresignedUrl Tests
   * ========================================================================= */
  describe("getPresignedUrl", () => {
    it("[Positive] should successfully generate presigned URL with valid inputs", async () => {
      const req = mockRequest({ fileName: "test.png", fileType: "image/png", folder: "avatars" });
      const mockResult = { url: "https://presigned.url", key: "avatars/test.png" };
      (S3Service.generatePresignedUrl as jest.Mock).mockResolvedValue(mockResult);

      await getPresignedUrl(req, res);

      expect(S3Service.generatePresignedUrl).toHaveBeenCalledWith("test.png", "image/png", "avatars");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });

    it("[Positive] should fallback to default 'uploads' folder if not specified", async () => {
      const req = mockRequest({ fileName: "test.png", fileType: "image/png" });
      await getPresignedUrl(req, res);

      expect(S3Service.generatePresignedUrl).toHaveBeenCalledWith("test.png", "image/png", "uploads");
    });

    it("[Validation] should return bad request error if fileName is missing", async () => {
      const req = mockRequest({ fileType: "image/png" });
      await getPresignedUrl(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "validation.requiredFields", "en");
    });

    it("[Validation] should return bad request error if fileType is missing", async () => {
      const req = mockRequest({ fileName: "test.png" });
      await getPresignedUrl(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "validation.requiredFields", "en");
    });

    it("[Edge] should return general error response if S3Service throws an exception", async () => {
      const req = mockRequest({ fileName: "test.png", fileType: "image/png" });
      const s3Error = new Error("S3 is down");
      (S3Service.generatePresignedUrl as jest.Mock).mockRejectedValue(s3Error);

      await getPresignedUrl(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        s3Error
      );
    });
  });

  /* =========================================================================
   * sendEmail Tests
   * ========================================================================= */
  describe("sendEmail", () => {
    it("[Positive] should send email successfully", async () => {
      const req = mockRequest({ to: "user@test.com", subject: "Hello", html: "<p>Hi</p>" });
      (sendMail as jest.Mock).mockResolvedValue(true);

      await sendEmail(req, res);

      expect(sendMail).toHaveBeenCalledWith("user@test.com", "Hello", "<p>Hi</p>");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "Email sent successfully" },
        "email.sent",
        "en"
      );
    });

    it("[Edge] should return error response when mail service throws", async () => {
      const req = mockRequest({ to: "user@test.com", subject: "Hello", html: "<p>Hi</p>" });
      const mailError = new Error("SMTP error");
      (sendMail as jest.Mock).mockRejectedValue(mailError);

      await sendEmail(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "SMTP error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    });
  });

  /* =========================================================================
   * deleteFile Tests
   * ========================================================================= */
  describe("deleteFile", () => {
    it("[Positive] should delete file successfully from S3 key", async () => {
      const req = mockRequest({ key: "uploads/test.png" });
      (S3Service.deleteFile as jest.Mock).mockResolvedValue(true);

      await deleteFile(req, res);

      expect(S3Service.deleteFile).toHaveBeenCalledWith("uploads/test.png");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "File deleted successfully" },
        "general.success",
        "en"
      );
    });

    it("[Validation] should return bad request error if S3 key is missing", async () => {
      const req = mockRequest({});
      await deleteFile(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "validation.requiredFields", "en");
    });

    it("[Edge] should return error response if file deletion fails", async () => {
      const req = mockRequest({ key: "uploads/test.png" });
      const s3Error = new Error("Access Denied");
      (S3Service.deleteFile as jest.Mock).mockRejectedValue(s3Error);

      await deleteFile(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Access Denied",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    });
  });
});
