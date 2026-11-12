import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { S3Service } from "../../shared/services/s3.service";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS, UPLOAD_CONFIG } from "../../../core/constants/app.constants";

/**
 * Generate Presigned URL for S3 Upload
 */
export const getPresignedUrl = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { fileName, fileType, fileSize, folder = "uploads" } = req.body;

    if (!fileName || !fileType) {
      return ResponseHandler.badRequest(res, "validation.requiredFields", lang);
    }

    if (fileSize && Number(fileSize) > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return ResponseHandler.badRequest(res, "validation.fileSizeExceedsLimit", lang);
    }

    const presignedData = await S3Service.generatePresignedUrl(
      fileName,
      fileType,
      folder,
    );

    return ResponseHandler.success(res, presignedData, "general.success", lang);
  } catch (error) {
    logger.error("Presigned URL generation error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Send Email Controller
 * Sends an email to specified recipients
 */
export const sendEmail = async (req: Request, res: Response) => {
  const lang = getLanguage(req);

  try {
    logger.info("Send email request:", { body: req.body });

    const { to, subject, html } = req.body;

    // Import mail service dynamically to avoid circular dependencies
    const { sendMail } = await import("../../shared/services/mail.service");

    await sendMail(to, subject, html);

    logger.info("Email sent successfully:", { to, subject });

    return ResponseHandler.success(
      res,
      { message: "Email sent successfully" },
      "email.sent",
      lang,
    );
  } catch (error: any) {
    logger.error("Error sending email:", error);

    return ResponseHandler.error(
      res,
      error.message || "Failed to send email",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Delete a file from S3 bucket
 */
export const deleteFile = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  try {
    const { key } = req.body;
    if (!key) {
      return ResponseHandler.badRequest(res, "validation.requiredFields", lang);
    }
    
    // Call S3Service to delete the object
    await S3Service.deleteFile(key);
    
    return ResponseHandler.success(
      res,
      { message: "File deleted successfully" },
      "general.success",
      lang
    );
  } catch (error: any) {
    logger.error("Error deleting file:", error);
    return ResponseHandler.error(
      res,
      error.message || "Failed to delete file",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export default {
  getPresignedUrl,
  sendEmail,
  deleteFile,
};
