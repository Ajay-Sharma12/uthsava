import { Request } from "express";
import { config } from "../../../core/config";

/**
 * Dynamically determines the Admin Base URL based on incoming HTTP request headers or body.
 * Supports Localhost (e.g. http://localhost:8080), Staging (e.g. https://uthsava-admin-staging.vercel.app),
 * Production, or any custom domain without relying on static hardcoded configuration.
 *
 * @param req Express request object (optional)
 * @returns Base URL string without trailing slash (e.g. 'https://uthsava-admin-staging.vercel.app')
 */
export const getAdminBaseUrl = (req?: Request): string => {
  // 1. Check explicit client/admin URL from request body if provided by frontend
  if (req?.body?.adminUrl && typeof req.body.adminUrl === "string") {
    return req.body.adminUrl.trim().replace(/\/+$/, "");
  }
  if (req?.body?.origin && typeof req.body.origin === "string") {
    return req.body.origin.trim().replace(/\/+$/, "");
  }
  if (req?.body?.clientUrl && typeof req.body.clientUrl === "string") {
    return req.body.clientUrl.trim().replace(/\/+$/, "");
  }

  // 2. Extract domain dynamically from HTTP request headers (Origin or Referer)
  if (req?.headers) {
    const origin = req.headers["origin"] as string;
    if (origin && origin !== "null" && origin !== "undefined") {
      return origin.trim().replace(/\/+$/, "");
    }

    const referer = (req.headers["referer"] || req.headers["referrer"]) as string;
    if (referer && typeof referer === "string") {
      try {
        const parsedUrl = new URL(referer);
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
      } catch (err) {
        // Ignore invalid URL format in referer header and continue to fallbacks
      }
    }
  }

  // 3. Fallback to configured environment variables or default staging URL
  return (process.env.ADMIN_PANEL_URL || process.env.FRONTEND_URL || config.adminUrl || "https://uthsava-admin-staging.vercel.app")
    .trim()
    .replace(/\/+$/, "");
};

/**
 * Resolves a media key/path (S3 key or relative path) to a full CloudFront URL.
 * Handles null/undefined, empty strings, and absolute http:// or https:// URLs.
 *
 * @param key Relative path or key (e.g. 'octal/uthsava/image.png')
 * @returns Full URL string or null if key is empty/null
 */
export const resolveMediaUrl = (key?: string | null): string | null => {
  if (!key || typeof key !== "string" || key.trim() === "") return null;
  const trimmed = key.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const baseUrl = (config.aws?.cloudFrontUrl || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/${trimmed.replace(/^\/+/, "")}` : trimmed;
};
