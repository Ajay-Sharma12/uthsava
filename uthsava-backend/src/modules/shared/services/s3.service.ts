import { S3, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../../../core/config";
import { UPLOAD_CONFIG } from "../../../core/constants/app.constants";

const s3 = new S3({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export class S3Service {
  /**
   * Sanitize filename by removing spaces and special characters
   */
  private static sanitizeFilename(fileName: string): string {
    // Get file extension
    const lastDotIndex = fileName.lastIndexOf(".");
    const name =
      lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";

    // Remove special characters and replace spaces with hyphens
    const sanitizedName = name
      .toLowerCase()
      .split(/\s+/)
      .join("-") // avoid replaceAll with +
      .replaceAll(/[^a-z0-9-]/g, "")
      .split("-")
      .filter(Boolean)
      .join("-");

    // Sanitize extension (remove special chars except dot)
    const sanitizedExtension = extension
      .toLowerCase()
      .replaceAll(/[^a-z0-9.]/g, "");

    return sanitizedName + sanitizedExtension;
  }

  /**
   * Generate presigned URL for uploading files to S3
   */
  static async generatePresignedUrl(
    fileName: string,
    fileType: string,
    folder: string,
  ) {
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFilename(fileName);
    const key = `${UPLOAD_CONFIG.DEFAULT_FOLDER}/${folder}/${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: UPLOAD_CONFIG.PRESIGNED_URL_EXPIRY,
    });

    return {
      uploadUrl: url,
      key: key,
      fileUrl: `${config.aws.cloudFrontUrl}/${key}`,
    };
  }

  /**
   * Generate presigned URL for downloading files from S3
   */
  static async getPresignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
    });
    return getSignedUrl(s3, command, {
      expiresIn: UPLOAD_CONFIG.PRESIGNED_URL_EXPIRY,
    });
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(key: string) {
    if (!key) return;
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });
      await s3.send(command);
    } catch (error) {
      console.error(`Error deleting file ${key} from S3:`, error);
    }
  }
}

// Legacy exports for backward compatibility
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
) => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, {
    expiresIn: UPLOAD_CONFIG.PRESIGNED_URL_EXPIRY,
  });
};
