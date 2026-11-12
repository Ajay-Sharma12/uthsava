/**
 * HTTP Status Codes
 * Centralized constants for consistent status code usage
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Token Expiry Times
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: "1d",
  REFRESH_TOKEN: "7d",
  REGISTRATION_TOKEN: "1h",
  ADMIN_SESSION: "60d",
  RESET_TOKEN: "10m",
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

/**
 * Password Configuration
 */
export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  MIN_BCRYPT_ROUNDS: 10,
  GENERATED_LENGTH: 12,
} as const;

/**
 * File Upload Configuration
 */
export const UPLOAD_CONFIG = {
  PRESIGNED_URL_EXPIRY: 300, // 5 minutes in seconds
  DEFAULT_FOLDER: "octal",
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;
