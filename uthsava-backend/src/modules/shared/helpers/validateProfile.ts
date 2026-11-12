import { User } from "../../../models/user.model";


/**
 * Validates profile parameters and checks for conflicting users.
 * Allows the current/existing user (matched by mobile number or currentUserId) to update their own profile.
 * Only throws "user.exists" if the mobile number belongs to ANOTHER user.
 */
export const validateProfile = async (
  email: string,
  mobile: string,
  countryCode: string,
  age: number,
  acceptedTerms: boolean,
  currentUserId?: string
) => {
  if (!acceptedTerms) {
    throw new Error("auth.termsRequired");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.toLowerCase())) {
    throw new Error("validation.emailInvalid");
  }

  if (age < 13 || age > 120) {
    throw new Error("validation.ageInvalid");
  }

  const normalizedEmail = email.toLowerCase();
  const [existingUserByMobile, existingUserByEmail] = await Promise.all([
    User.findOne({ mobile, countryCode }),
    User.findOne({ email: normalizedEmail }),
  ]);

  // Reject if the mobile number belongs to a DIFFERENT user
  if (
    existingUserByMobile &&
    currentUserId &&
    existingUserByMobile._id.toString() !== currentUserId.toString()
  ) {
    throw new Error("user.exists");
  }

  // Determine target user ID (currentUserId or user found by mobile number)
  const targetUserId = currentUserId || existingUserByMobile?._id?.toString();

  // Reject if the email address belongs to a DIFFERENT user
  if (
    existingUserByEmail &&
    (!targetUserId || existingUserByEmail._id.toString() !== targetUserId.toString())
  ) {
    throw new Error("validation.email.exists");
  }

  return { normalizedEmail, existingUser: existingUserByMobile };
};
