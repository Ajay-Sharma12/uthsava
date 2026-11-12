import { randomInt } from "node:crypto";

export const generateOtp = (length: number = 6): string => {
  const safeLength = Number.isFinite(length) && length > 0 ? Math.floor(length) : 6;
  let otp = "";

  for (let i = 0; i < safeLength; i += 1) {
    otp += randomInt(10).toString();
  }

  return otp;
};

/**
 * Checks if the OTP record is invalid or does not match the provided OTP.
 */
export const isInvalidOtp = (otpRecord: any, providedOtp: string): boolean => {
  return !otpRecord || otpRecord.otp !== providedOtp;
};

/**
 * Checks if the OTP has expired.
 */
export const isOtpExpired = (expiresAt: Date): boolean => {
  return expiresAt.getTime() < Date.now();
};
