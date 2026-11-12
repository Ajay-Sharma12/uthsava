import { apiPost } from "@/lib/api";

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  fileUrl: string;
  url?: string;
}

export const getPresignedUrl = async (
  payload: PresignedUrlRequest | string,
  fileTypeParam?: string,
): Promise<PresignedUrlResponse> => {
  const reqPayload =
    typeof payload === "string"
      ? { fileName: payload, fileType: fileTypeParam || "application/octet-stream" }
      : payload;

  const sanitizedPayload = {
    ...reqPayload,
    fileName: (reqPayload.fileName || "file").replace(/\s+/g, "_"),
  };
  const response = await apiPost("/admin/utils/presigned-url", sanitizedPayload);

  const res = response?.results || response?.data || response;
  const url = res?.fileUrl || res?.url || res?.uploadUrl || "";
  const uploadUrl = res?.uploadUrl || res?.url || "";
  const key = res?.key || res?.fileKey || "";

  return {
    uploadUrl,
    key,
    fileUrl: url,
    url,
  };
};

export { uploadToPresignedUrl } from "@/lib/api";
