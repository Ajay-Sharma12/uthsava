import { Response } from "express";
import { S3, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../../../core/config";
import { UPLOAD_CONFIG } from "../../../core/constants/app.constants";
import { logger } from "../../../core/constants/logger";
import type PDFDocument from "pdfkit";

const s3 = new S3({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

interface ExportOptions {
  fileName: string;
  contentType: "application/pdf" | "text/csv";
  folder?: string;
}

/**
 * Uploads a file buffer to S3 and returns a presigned URL
 * @param buffer - File buffer to upload
 * @param options - Export options (fileName, contentType, folder)
 * @returns Presigned download URL
 */
export async function uploadExportToS3(
  buffer: Buffer,
  options: ExportOptions,
): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = options.fileName
      .replaceAll(/[^a-z0-9.-]/gi, "-")
      .toLowerCase();
    const key = `${UPLOAD_CONFIG.DEFAULT_FOLDER}/exports/${options.folder || "general"}/${timestamp}-${sanitizedFileName}`;

    const putCommand = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
    });

    await s3.send(putCommand);

    // Use CloudFront URL for downloads (consistent with S3Service pattern)
    // Presigned S3 URLs fail due to IAM GetObject restrictions
    const downloadUrl = `${config.aws.cloudFrontUrl}/${key}`;

    logger.info(`File uploaded to S3 successfully: ${key}`);
    return downloadUrl;
  } catch (error) {
    logger.error("Error uploading export to S3:", error);
    throw new Error("Failed to upload export file to S3");
  }
}

/**
 * Handles CSV export response - either direct download (web) or URL response (mobile)
 * @param res - Express response object
 * @param csvData - CSV string data
 * @param fileName - Name of the file
 * @param returnUrl - If true, returns JSON with URL instead of direct download
 * @param folder - Optional S3 folder name (role-based)
 */
export async function handleCsvExportResponse(
  res: Response,
  csvData: string,
  fileName: string,
  returnUrl: boolean = false,
  folder: string = "general",
): Promise<void> {
  try {
    const buffer = Buffer.from(csvData, "utf-8");

    if (returnUrl) {
      // Mobile: Upload to S3 and return URL
      const downloadUrl = await uploadExportToS3(buffer, {
        fileName,
        contentType: "text/csv",
        folder,
      });
      res.json({
        success: true,
        message: "Export file generated successfully",
        results: {
          downloadUrl,
          fileName,
          expiresIn: 3600, // seconds
        },
      });
    } else {
      // Web: Direct download
      res.setHeader("Content-Type", "text/csv");
      res.attachment(fileName);
      res.send(csvData);
    }
  } catch (error: any) {
    logger.error("Error handling CSV export response:", error);
    throw error;
  }
}

/**
 * Handles PDF export response - either direct download (web) or URL response (mobile)
 * Collects PDF stream into buffer before deciding response type
 * @param res - Express response object
 * @param doc - PDFKit document instance
 * @param fileName - Name of the file
 * @param returnUrl - If true, returns JSON with URL instead of direct download
 * @param folder - Optional S3 folder name (role-based)
 */
export async function handlePdfExportResponse(
  res: Response,
  doc: typeof PDFDocument.prototype,
  fileName: string,
  returnUrl: boolean = false,
  folder: string = "general",
): Promise<void> {
  try {
    if (returnUrl) {
      // Mobile: Collect PDF into buffer, upload to S3, and return URL
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const downloadUrl = await uploadExportToS3(buffer, {
            fileName,
            contentType: "application/pdf",
            folder,
          });
          res.json({
            success: true,
            message: "Export file generated successfully",
            results: {
              downloadUrl,
              fileName,
              expiresIn: 3600, // seconds
            },
          });
        } catch (error: any) {
          logger.error("Error uploading PDF to S3:", error);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "Failed to upload export file",
            });
          }
        }
      });

      doc.end();
    } else {
      // Web: Direct download - stream PDF to response
      res.setHeader("Content-Type", "application/pdf");
      res.attachment(fileName);
      doc.pipe(res);
      doc.end();
    }
  } catch (error: any) {
    logger.error("Error handling PDF export response:", error);
    throw error;
  }
}
