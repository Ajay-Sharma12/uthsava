import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || "",
  redisUrl: process.env.REDIS_URL || "",
  adminUrl: process.env.ADMIN_URL || "http://localhost:8080",
  websiteUrl: process.env.WEBSITE_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:2601",

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      "0ac74e6b68e2afa8d14b624575a123e96b275f3b4a461144db26f96849052561",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "f672a881a2b968785312e2dbffbceff05bdbc7bc3dcd780502717583828b9166",
    resetPasswordSecret: process.env.JWT_RESET_PASSWORD_SECRET || "",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    resetPasswordExpiresIn: process.env.JWT_RESET_PASSWORD_EXPIRES_IN || "10m",
  },
  otp: {
    resetPasswordExpiresInSeconds:
      Number(process.env.OTP_RESET_PASSWORD_EXPIRES_IN_SECONDS) || 60,
  },
  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "",
    cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL || "",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    email: process.env.SMTP_EMAIL || "",
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  },
  nodeEnv: process.env.NODE_ENV || "development",
  socialLogin: {
    google: "https://www.googleapis.com/oauth2/v3/userinfo",
    facebook:"https://graph.facebook.com/v13.0/me",
    apple:""
  },
};
