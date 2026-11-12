import { IUser, OTP, OTPType, Genre, GenreStatus, UserProfile, UserSession, CmsPage, PageStatus, ProfileType } from "../../../models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { config } from "../../../core/config";
import { Role } from "../../../common/types/auth.types";
import { Request, Response } from "express";
import {
  TOKEN_EXPIRY,
  PASSWORD_CONFIG,
} from "../../../core/constants/app.constants";
import { sendMail } from "../../shared/services/mail.service";
import { User, UserStatus } from "../../../models/user.model";
import { UserSubscription, SubscriptionStatus } from "../../../models/user-subscription.model";
import { AuditLogService } from "../../admin/services/audit-log.service";
import { AuditModule, AuditStatus } from "../../../models/audit-log.model";
import { EmailTemplate } from "../../../models/email-template.model";
import { logger } from "../../../core/constants/logger";
import { generateOtp } from "../../shared/helpers/otp.helper";
import { buildUserResponse } from "../../shared/helpers/buildUserResponse";
import { updateUserLoginInfo } from "../../shared/helpers/updateUserLoginInfo";
import { saveUserSession } from "../../shared/helpers/saveUserSession";
import { validateProfile } from "../../shared/helpers/validateProfile";
import { validateRegistrationToken } from "../../shared/helpers/validateRegistrationToken";
import { getDefaultUserProfileAvatarUrl } from "../../shared/helpers/avatar.helper";

/**
 * Authentication Service
 * Handles user authentication, password validation, and token generation
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(
    email: string,
    password: string,
    role: Role = Role.USER,
  ): Promise<any> {
    const hashed = await bcrypt.hash(
      password,
      PASSWORD_CONFIG.MIN_BCRYPT_ROUNDS,
    );
    return { email, password: hashed, role };
  }

  /**
   * Validate user password
   */
  static async validatePassword(
    user: IUser,
    password: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, user.password || "");
  }

  /**
   * Generate access and refresh tokens
   */
  static generateTokens(user: IUser, sessionTimeoutDays: number = 30) {
    const payload = {
      _id: user._id,
      role: user.role,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    };

    const accessToken = jwt.sign(payload, String(config.jwt.accessSecret), {
      expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
    });

    const refreshToken = jwt.sign(payload, String(config.jwt.refreshSecret), {
      expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate a temporary registration token after OTP verification
   */
  static generateRegistrationToken(mobile: string, countryCode: string): string {
    const payload = { mobile, countryCode, purpose: "registration", verified: true };
    return jwt.sign(payload, String(config.jwt.accessSecret), {
      expiresIn: TOKEN_EXPIRY.REGISTRATION_TOKEN,
    });
  }

  /**
   * Verify registration token
   */
  static verifyRegistrationToken(token: string): any {
    try {
      const decoded = jwt.verify(token, String(config.jwt.accessSecret)) as any;
      if (decoded.purpose !== "registration") throw new Error("auth.invalidRegistrationToken");
      return decoded;
    } catch (error) {
      throw new Error("auth.invalidRegistrationToken");
    }
  }

  /**
   * Set refresh token in HTTP-only cookie
   * If rememberMe is false, sets session duration cookie; otherwise defaults to 7 days
   */
  static setRefreshTokenCookie(res: Response, token: string, rememberMe?: boolean): void {
    const cookieOptions: any = {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
    };
    if (rememberMe !== false) {
      cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
    }
    res.cookie("refreshToken", token, cookieOptions);
  }

  /**
   * Clear refresh token cookie
   */
  static clearRefreshTokenCookie(res: Response): void {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
    });
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_CONFIG.MIN_BCRYPT_ROUNDS);
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(
        token,
        String(config.jwt.refreshSecret || "default_refresh_secret"),
      );
    } catch (error) {
      throw new Error(
        `Invalid or expired refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Request password reset OTP
   */
  static async requestPasswordResetOTP(
    email: string,
  ): Promise<{ _id: string; message: string }> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("user.notFound");
    }

    // Ensure password reset on user routes is strictly for Role.USER
    if (user.role !== Role.USER) {
      throw new Error("auth.onlyUserRoleAllowed");
    }

    const resendTimerSeconds = 60;
    const lastOtp = await OTP.findOne({ email: email.toLowerCase(), type: OTPType.FORGOT_PASSWORD }).sort({ createdAt: -1 });
    if (lastOtp) {
      const timeSinceLastOtp = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
      if (timeSinceLastOtp < resendTimerSeconds) {
        throw new Error(`auth.otpWaitTimer:${Math.ceil(resendTimerSeconds - timeSinceLastOtp)}`);
      }
    }

    const otpExpiresInSeconds = Number(
      config.otp?.resetPasswordExpiresInSeconds || 60,
    );
    const otp = generateOtp(6);
    const expiresAt = new Date(Date.now() + otpExpiresInSeconds * 1000);
    const expiryText =
      otpExpiresInSeconds < 60
        ? `${otpExpiresInSeconds} seconds`
        : otpExpiresInSeconds === 60
          ? "60 seconds"
          : `${Math.ceil(otpExpiresInSeconds / 60)} minutes`;

    await OTP.deleteMany({
      email: email.toLowerCase(),
      type: OTPType.FORGOT_PASSWORD,
    });

    const otpRecord = await OTP.create({
      userId: user._id,
      email: email.toLowerCase(),
      otp,
      type: OTPType.FORGOT_PASSWORD,
      expiresAt,
    });

    EmailTemplate.findOne({
      keyword: "PASSWORD_RESET_OTP",
      status: "active",
    }).then((emailTemplate) => {
      if (emailTemplate) {
        let emailSubject = emailTemplate.subject || "Password Reset OTP";
        let emailBody = emailTemplate.description || "";
        const userName = user.firstName || user.fullName || "User";

        // Replace placeholders in subject
        emailSubject = emailSubject
          .replaceAll("{{Platform Name}}", "Uthsava")
          .replaceAll("{{platformName}}", "Uthsava")
          .replaceAll("{{Platform_Name}}", "Uthsava")
          .replaceAll("{{userName}}", userName)
          .replaceAll("{{User Name}}", userName)
          .replaceAll("{{name}}", userName);

        // Replace placeholders in body
        emailBody = emailBody.replaceAll("{{userName}}", userName);
        emailBody = emailBody.replaceAll("{{User Name}}", userName);
        emailBody = emailBody.replaceAll("{{name}}", userName);
        emailBody = emailBody.replaceAll("{{userEmail}}", email);
        emailBody = emailBody.replaceAll("{{email}}", email);
        emailBody = emailBody.replaceAll("{{Email}}", email);
        emailBody = emailBody.replaceAll("{{otp}}", otp);
        emailBody = emailBody.replaceAll("{{OTP Code}}", otp);
        emailBody = emailBody.replaceAll("{{expiryTime}}", expiryText);
        emailBody = emailBody.replaceAll("{{Expiry Duration}}", expiryText);

        sendMail(email, emailSubject, emailBody)
          .then(() => logger.info(`Password reset OTP sent to: ${email}`))
          .catch((emailError: any) => logger.error("Email send error:", emailError));
      } else {
        logger.warn("Email template PASSWORD_RESET_OTP not found or inactive", { emailTemplate });
      }
    }).catch((emailError: any) => {
      logger.error("Failed to fetch email template for OTP:", emailError);
    });

    return {
      _id: otpRecord._id.toString(),
      message: "OTP sent successfully",
    };
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(
    email: string,
    otp: string,
    otpId: string,
  ): Promise<boolean> {
    const otpRecord = await OTP.findOne({
      _id: otpId,
      email: email.toLowerCase(),
      type: OTPType.FORGOT_PASSWORD,
      isUsed: false,
    });

    if (!otpRecord) throw new Error("auth.otpInvalid");

    if (otpRecord.expiresAt < new Date()) throw new Error("auth.otpExpired");

    if (otpRecord.attempts >= 5) throw new Error("auth.otpLocked:60");

    if (otpRecord.otp !== otp) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      throw new Error("auth.otpInvalid");
    }

    await OTP.deleteOne({ _id: otpRecord._id });
    return true;
  }

  /**
   * Reset password using OTP
   */
  static async resetPassword(
    email: string,
    password: string,
    otpId: string,
  ): Promise<void> {
    const otpRecord = await OTP.findOne({
      _id: otpId,
      email: email.toLowerCase(),
      type: OTPType.FORGOT_PASSWORD,
      isUsed: false,
    });

    if (!otpRecord) throw new Error("auth.otpInvalidId");

    if (otpRecord.expiresAt < new Date()) throw new Error("auth.otpExpired");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("user.notFound");

    const hashedPassword = await this.hashPassword(password);
    user.password = hashedPassword;

    user.refreshToken = undefined;
    user.deviceToken = undefined;
    user.deviceType = undefined;
    user.deviceId = undefined;

    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    await OTP.deleteMany({
      userId: user._id,
      type: OTPType.FORGOT_PASSWORD,
    });
  }

  /**
   * Fetch Google User Info using Access Token
   */
  static async getGoogleResponse(accessToken: string): Promise<any> {
    const res = await fetch(`${config.socialLogin.google}=${accessToken}`);
    if (!res.ok) throw new Error(`Google API returned ${res.status}`);
    return res.json();
  }

  /**
   * Fetch Facebook User Info using Access Token
   */
  static async getFacebookDetails(accessToken: string): Promise<any> {
    const res = await fetch(`${config.socialLogin.facebook}?fields=id,name,email,picture&access_token=${accessToken}`);
    if (!res.ok) throw new Error(`Facebook API returned ${res.status}`);
    return res.json();
  }

  private static async processMobileOtpSend(mobile: string, countryCode: string, type: OTPType = OTPType.MOBILE_LOGIN) {
    const otpExpiresInSeconds = Number(config.otp?.resetPasswordExpiresInSeconds || 60);
    const blockDurationMs = 2 * 60 * 60 * 1000; // 2 hours

    let otpRecord = await OTP.findOne({ mobile, countryCode, type });

    if (otpRecord) {
      if (otpRecord.sendAttempts >= 5) {
        if (otpRecord.expiresAt > new Date()) {
          const remainingMinutes = Math.ceil((otpRecord.expiresAt.getTime() - Date.now()) / 60000);
          throw new Error(`auth.otpWaitTimer:${remainingMinutes}`);
        } else {
          otpRecord.sendAttempts = 0;
          otpRecord.attempts = 0;
        }
      }

      const newOtp = generateOtp(4);
      otpRecord.otp = newOtp;
      otpRecord.sendAttempts += 1;

      if (otpRecord.sendAttempts >= 5) {
        otpRecord.expiresAt = new Date(Date.now() + blockDurationMs);
      } else {
        otpRecord.expiresAt = new Date(Date.now() + otpExpiresInSeconds * 1000);
      }
      await otpRecord.save();
    } else {
      const newOtp = generateOtp(4);
      otpRecord = await OTP.create({
        mobile,
        countryCode,
        otp: newOtp,
        type,
        expiresAt: new Date(Date.now() + otpExpiresInSeconds * 1000),
        sendAttempts: 1,
        attempts: 0
      });
    }

    logger.info(`Sending SMS to ${countryCode}${mobile} with OTP: ${otpRecord.otp}`);

    return otpRecord;
  }

  /**
   * Mobile Login API Service
   * Initiates mobile authentication by generating and sending an OTP.
   * Enforces role validation: Only accounts with Role.USER can log in via the mobile application.
   */
  static async mobileLoginHandler(req: Request) {
    const { mobile, countryCode = "+91" } = req.body;

    // Check if an existing account with this mobile number has a non-USER role (e.g., Producer, Admin) or is inactive
    const existingUser = await User.findOne({ mobile, countryCode });
    if (existingUser) {
      if (existingUser.role !== Role.USER) {
        throw new Error("auth.onlyUserRoleAllowed");
      }
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new Error("auth.accountInactive");
      }
    }

    const otpRecord = await this.processMobileOtpSend(mobile, countryCode);

    return {
      otpId: otpRecord._id.toString(),
      otp: otpRecord.otp,
      message: "auth.otpSent",
    };
  }

  /**
   * Verify Mobile OTP API Service
   * Verifies the OTP provided by the mobile application.
   * Ensures that accounts with non-USER roles (e.g. Producer, Admin, Sub-Admin) cannot access the mobile user panel.
   */
  static async verifyMobileOtpHandler(req: Request, res: Response) {
    const { mobile, countryCode = "+91", otp, deviceId, deviceType, deviceToken } = req.body;

    const isTestEnvironment = config.nodeEnv !== "production" && process.env.NODE_ENV !== "production";
    const isTestOtp = isTestEnvironment && otp === "1234";

    const otpRecord = await OTP.findOne({
      mobile,
      countryCode,
      type: OTPType.MOBILE_LOGIN,
    });

    if (!otpRecord && !isTestOtp) throw new Error("auth.otpInvalid");

    if (otpRecord) {
      if (otpRecord.expiresAt < new Date() && !isTestOtp) throw new Error("auth.otpExpired");

      if (otpRecord.attempts >= 3 && !isTestOtp) {
        otpRecord.sendAttempts = 5;
        otpRecord.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await otpRecord.save();
        throw new Error("auth.otpLocked:120");
      }

      if (otpRecord.otp !== otp && !isTestOtp) {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
        if (otpRecord.attempts >= 3) {
          otpRecord.sendAttempts = 5;
          otpRecord.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
          await otpRecord.save();
          throw new Error("auth.otpLocked:120");
        }
        await otpRecord.save();
        throw new Error("auth.otpInvalid");
      }

      await OTP.deleteOne({ _id: otpRecord._id });
    }

    const user = await User.findOne({ mobile, countryCode });

    if (user) {
      // Reject login if the account role is not Role.USER (e.g., Producer, Admin, Sub-Admin)
      if (user.role !== Role.USER) {
        throw new Error("auth.onlyUserRoleAllowed");
      }

      // Reject login if account status is inactive
      if (user.status !== UserStatus.ACTIVE) {
        throw new Error("auth.accountInactive");
      }
    }

    const isNewUser = user ? 0 : 1;

    if (isNewUser) {
      return {
        isNewUser,
        registrationToken: this.generateRegistrationToken(mobile, countryCode),
      };
    }

    const tokens = this.generateTokens(user!);
    (user as any).refreshToken = tokens.refreshToken;
    const appUser = user as IUser & typeof user;

    await updateUserLoginInfo(appUser, req, { deviceId, deviceType, deviceToken });
    await saveUserSession(appUser, tokens, { deviceId, deviceType, deviceToken }, req);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return buildUserResponse(appUser, { accessToken: tokens.accessToken }, 0);
  }

  /**
   * Resend Mobile OTP API Service
   * Resends OTP to the user's mobile number, enforcing role restrictions.
   */
  static async resendMobileOtpHandler(req: Request) {
    const { mobile, countryCode = "+91" } = req.body;

    // Reject resend OTP if the account belongs to a non-USER role or is inactive
    const existingUser = await User.findOne({ mobile, countryCode });
    if (existingUser) {
      if (existingUser.role !== Role.USER) {
        throw new Error("auth.onlyUserRoleAllowed");
      }
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new Error("auth.accountInactive");
      }
    }

    const otpRecord = await this.processMobileOtpSend(mobile, countryCode);

    return {
      otpId: otpRecord._id.toString(),
      otp: otpRecord.otp,
      message: "auth.otpSent",
    };
  }

  /**
   * Complete Profile API Service
   * Registers a new user account upon mobile OTP verification.
   * Enforces Role.USER to ensure all accounts created via mobile flow are standard users.
   */
  static async completeProfileHandler(req: Request, res: Response) {
    const { mobile, countryCode = "+91", fullName, email, age, gender, acceptedTerms, deviceId, deviceType, deviceToken } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("auth.registrationTokenRequired");
    }
    const registrationToken = authHeader.split(" ")[1];

    const decodedToken = validateRegistrationToken(registrationToken, mobile, countryCode);

    const currentUserId = (req as any).user?._id?.toString();

    // Validate profile inputs & verify mobile/email duplicate rules for distinct users
    const { normalizedEmail, existingUser } = await validateProfile(
      email,
      mobile,
      countryCode,
      age,
      acceptedTerms,
      currentUserId
    );

    const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
    const lastName = lastNameParts.join(" ");

    let user;

    if (existingUser) {
      // If user already exists for this mobile number, update their profile fields instead of throwing an error
      existingUser.fullName = fullName;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.email = normalizedEmail;
      existingUser.age = age;
      existingUser.gender = gender;
      existingUser.acceptedTerms = acceptedTerms;
      existingUser.isMobileVerified = decodedToken.verified;
      existingUser.isProfileCompleted = true;

      user = await existingUser.save();
    } else {
      // Create a new user account strictly with Role.USER
      user = await User.create({
        mobile,
        countryCode,
        fullName,
        firstName,
        lastName,
        email: normalizedEmail,
        age,
        gender,
        acceptedTerms,
        isMobileVerified: decodedToken.verified,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        isProfileCompleted: true,
        loginType: "Normal",
      });
    }

    const tokens = this.generateTokens(user);
    (user as any).refreshToken = tokens.refreshToken;
    const appUser = user as IUser & typeof user;

    await updateUserLoginInfo(appUser, req, { deviceId, deviceType, deviceToken });
    await saveUserSession(appUser, tokens, { deviceId, deviceType, deviceToken }, req);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return buildUserResponse(appUser, { accessToken: tokens.accessToken }, 0);
  }

  /**
   * Select Genres API Service
   */
  static async selectGenresHandler(req: Request) {
    const userId = (req as any).user?._id;
    const { genres } = req.body;

    if (!Array.isArray(genres)) {
      throw new Error("auth.genresMustBeArray");
    }

    if (genres.length < 1 || genres.length > 5) {
      throw new Error(genres.length > 5 ? "auth.maxFiveGenresAllowed" : "auth.genresMustBeArray");
    }

    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    // Ensure genre IDs are unique for validation check
    const uniqueGenreIds = Array.from(new Set(genres));

    // 1. Verify that every provided genre ID exists in the database
    const existingGenres = await Genre.find({
      _id: { $in: uniqueGenreIds },
    });

    if (existingGenres.length !== uniqueGenreIds.length) {
      throw new Error(
        uniqueGenreIds.length === 1 ? "auth.genreNotFound" : "auth.genresNotFound"
      );
    }

    // 2. Verify that none of the selected genres are inactive
    const inactiveGenres = existingGenres.filter(
      (g) => g.status !== GenreStatus.ACTIVE
    );

    if (inactiveGenres.length > 0) {
      throw new Error(
        inactiveGenres.length === 1 ? "auth.genreInactive" : "auth.genresInactive"
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { genres: uniqueGenreIds } },
      { new: true }
    ).populate("genres", "_id name type icon description displayOrder status");

    if (!user) {
      throw new Error("auth.userNotFound");
    }

    const populatedGenres = (user.genres || []).map((g: any) => {
      if (typeof g === "object" && g._id) {
        return {
          _id: g._id,
          name: g.name,
          type: g.type,
          icon: g.icon || null,
          description: g.description || "",
          displayOrder: g.displayOrder || 0,
          status: g.status,
        };
      }
      return { _id: g };
    });

    return { genres: populatedGenres };
  }

  /**
   * Get Active Genres Listing API Service with pagination support.
   * Retrieves active items belonging exclusively to type 'genre' (excluding categories).
   */
  static async getActiveGenresHandler(page?: number, limit?: number) {
    const p = Math.max(1, page || 1);
    const l = Math.min(100, Math.max(1, limit || 10));
    const skip = (p - 1) * l;

    const query = {
      type: "genre",
      status: GenreStatus.ACTIVE,
    };

    let findQuery = Genre.find(query)
      .select("_id name type icon description displayOrder status")
      .sort({ displayOrder: 1, name: 1 });

    if (typeof (findQuery as any).skip === "function") {
      findQuery = (findQuery as any).skip(skip);
    }
    if (typeof (findQuery as any).limit === "function") {
      findQuery = (findQuery as any).limit(l);
    }

    const [genres, totalCount] = await Promise.all([
      findQuery,
      Genre.countDocuments ? Genre.countDocuments(query) : Promise.resolve(0),
    ]);

    const formattedGenres = genres.map((g) => {
      const iconUrl =
        g.icon && g.icon.trim() !== ""
          ? g.icon.startsWith("http")
            ? g.icon
            : `${config.aws.cloudFrontUrl}/${g.icon}`
          : null;

      return {
        _id: g._id,
        name: g.name,
        type: g.type,
        icon: iconUrl,
        description: g.description || "",
        displayOrder: g.displayOrder || 0,
        status: g.status,
      };
    });

    const totalPages = Math.ceil(totalCount / l) || 1;
    const totalCountVal = totalCount || formattedGenres.length;

    return {
      total: totalCountVal,
      totalCount: totalCountVal,
      genres: formattedGenres,
      pagination: {
        page: p,
        limit: l,
        totalCount: totalCountVal,
        totalPages: Math.ceil(totalCountVal / l) || 1,
        hasNextPage: p < totalCountVal,
        hasPrevPage: p > 1,
      },
    };
  }

  /**
   * Get User Selected Genres API Service ("My Genres")
   * Retrieves the genres selected by the authenticated user managed via JWT token.
   *
   * @param userId - Authenticated user's ObjectId
   */
  static async getMyGenresHandler(userId: string | Types.ObjectId) {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    const userObjectId = new Types.ObjectId(userId.toString());

    const user = await User.findById(userObjectId).populate({
      path: "genres",
      select: "_id name type icon description displayOrder status",
    });

    if (!user) {
      throw new Error("auth.userNotFound");
    }

    const formattedGenres = (user.genres || []).map((g: any) => {
      if (typeof g === "object" && g._id) {
        const iconUrl =
          g.icon && g.icon.trim() !== ""
            ? g.icon.startsWith("http")
              ? g.icon
              : `${config.aws.cloudFrontUrl}/${g.icon}`
            : null;

        return {
          _id: g._id,
          name: g.name,
          type: g.type,
          icon: iconUrl,
          description: g.description || "",
          displayOrder: g.displayOrder || 0,
          status: g.status,
        };
      }
      return { _id: g };
    });

    return {
      total: formattedGenres.length,
      genres: formattedGenres,
    };
  }

  /**
   * Get User Accounts / Sub-Profiles API Service ("Who's watching?" screen)
   * Retrieves all sub-profiles/accounts belonging to the authenticated logged-in user.
   *
   * @param userId - Authenticated user's ObjectId
   */
  static async getUserAccountsHandler(userId: string | Types.ObjectId) {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    const userObjectId = new Types.ObjectId(userId.toString());
    let profiles = await UserProfile.find({
      userId: userObjectId,
    }).sort({ createdAt: 1 });

    if (profiles.length === 0) {
      const user = await User.findById(userObjectId).lean();
      const displayName =
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        "User";

      const defaultProfile = new UserProfile({
        userId: userObjectId,
        displayName,
        profileType: ProfileType.STANDARD,
        isDefault: true,
        notificationEnabled: true,
      });
      await defaultProfile.save();
      profiles.push(defaultProfile);
    }

    const hasKidsProfile = profiles.some(
      (p) => p.displayName && p.displayName.trim().toLowerCase() === "kids"
    );

    if (!hasKidsProfile) {
      const kidsProfile = new UserProfile({
        userId: userObjectId,
        displayName: "Kids",
        profileType: ProfileType.KIDS,
        isDefault: false,
        notificationEnabled: true,
      });
      await kidsProfile.save();
      profiles.push(kidsProfile);
    }

    const defaultUserProfileAvatar = await getDefaultUserProfileAvatarUrl();

    return {
      total: profiles.length,
      accounts: profiles.map((p) => {
        const obj = p.toObject ? p.toObject() : p;
        const profilePictureUrl =
          obj.profilePicture && obj.profilePicture.trim() !== ""
            ? obj.profilePicture.startsWith("http")
              ? obj.profilePicture
              : `${config.aws.cloudFrontUrl}/${obj.profilePicture.replace(/^\/+/, "")}`
            : defaultUserProfileAvatar;

        return {
          _id: obj._id,
          displayName: obj.displayName,
          profilePicture: profilePictureUrl,
          profileType: obj.profileType,
          isKids: obj.profileType === ProfileType.KIDS,
          avatarId: obj.avatarId || null,
          isDefault: obj.isDefault ?? false,
          notificationEnabled: obj.notificationEnabled ?? true,
          favoriteGenreIds: obj.favoriteGenreIds || [],
          preferredLanguageIds: obj.preferredLanguageIds || [],
          createdAt: obj.createdAt,
          updatedAt: obj.updatedAt,
        };
      }),
    };
  }

  /**
   * Create User Account / Sub-Profile API Service
   * Allows logged-in user to add a new account ("Who's watching?" screen)
   *
   * @param userId - Authenticated user's ObjectId
   * @param body - Account creation details (name, isKids, avatarId, profilePicture, etc.)
   */
  static async createUserAccountHandler(
    userId: string | Types.ObjectId,
    body: {
      name?: string;
      displayName?: string;
      isKids?: boolean;
      kids?: boolean;
      avatarId?: string;
      avatar?: string;
      profilePicture?: string;
      favoriteGenreIds?: string[];
      preferredLanguageIds?: string[];
    }
  ) {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    const displayName = (body.name || body.displayName || "").trim();
    if (!displayName) {
      throw new Error("auth.accountNameRequired");
    }

    const userObjectId = new Types.ObjectId(userId.toString());

    // Check for duplicate account name for the same parent user
    const existingAccount = await UserProfile.findOne({
      userId: userObjectId,
      displayName: { $regex: new RegExp(`^${displayName}$`, "i") },
    });

    if (existingAccount) {
      throw new Error("auth.accountNameDuplicate");
    }

    const isKidsFlag = body.isKids !== undefined ? body.isKids : (body.kids !== undefined ? body.kids : false);
    const profileType = isKidsFlag ? ProfileType.KIDS : ProfileType.STANDARD;

    const avatarValue = (body.avatar || body.profilePicture || "").trim();
    const avatarIdValue = (body.avatarId || "").trim();

    // Determine default status: true if this is the user's first profile
    const existingProfilesCount = await UserProfile.countDocuments({ userId: userObjectId });
    const isDefault = existingProfilesCount === 0;

    const newProfile = new UserProfile({
      userId: userObjectId,
      displayName,
      profileType,
      profilePicture: avatarValue || null,
      avatarId: avatarIdValue || null,
      isDefault,
      notificationEnabled: true,
      favoriteGenreIds: (body.favoriteGenreIds || []).map((id) => new Types.ObjectId(id)),
      preferredLanguageIds: (body.preferredLanguageIds || []).map((id) => new Types.ObjectId(id)),
    });

    await newProfile.save();

    const defaultUserProfileAvatar = await getDefaultUserProfileAvatarUrl();

    const profilePictureUrl =
      newProfile.profilePicture && newProfile.profilePicture.trim() !== ""
        ? newProfile.profilePicture.startsWith("http")
          ? newProfile.profilePicture
          : `${config.aws.cloudFrontUrl}/${newProfile.profilePicture.replace(/^\/+/, "")}`
        : defaultUserProfileAvatar;

    return {
      account: {
        _id: newProfile._id,
        displayName: newProfile.displayName,
        profileType: newProfile.profileType,
        isKids: newProfile.profileType === ProfileType.KIDS,
        profilePicture: profilePictureUrl,
        avatarId: newProfile.avatarId || null,
        isDefault: newProfile.isDefault,
        notificationEnabled: newProfile.notificationEnabled,
        favoriteGenreIds: newProfile.favoriteGenreIds || [],
        preferredLanguageIds: newProfile.preferredLanguageIds || [],
        createdAt: newProfile.createdAt,
        updatedAt: newProfile.updatedAt,
      },
    };
  }

  /**
   * Get Terms & Conditions CMS Page API Service
   * Retrieves active Terms & Conditions content for mobile application display.
   */
  static async getTermsAndConditionsHandler() {
    const page = await CmsPage.findOne({
      slug: { $in: ["terms-and-conditions", "terms", "terms-conditions"] },
      status: PageStatus.ACTIVE,
    });

    if (!page) {
      throw new Error("auth.termsNotFound");
    }

    return {
      _id: page._id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      bannerImage: page.bannerImage || null,
      companyWebsiteUrl: page.companyWebsiteUrl || null,
      seoTitle: page.seoTitle || "",
      seoDescription: page.seoDescription || "",
      updatedAt: page.updatedAt,
    };
  }

  /**
   * Get Privacy Policy CMS Page API Service
   * Retrieves active Privacy Policy content for mobile application display.
   */
  static async getPrivacyPolicyHandler() {
    const page = await CmsPage.findOne({
      slug: { $in: ["privacy-policy", "privacy"] },
      status: PageStatus.ACTIVE,
    });

    if (!page) {
      throw new Error("auth.privacyNotFound");
    }

    return {
      _id: page._id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      bannerImage: page.bannerImage || null,
      companyWebsiteUrl: page.companyWebsiteUrl || null,
      seoTitle: page.seoTitle || "",
      seoDescription: page.seoDescription || "",
      updatedAt: page.updatedAt,
    };
  }

  /**
   * Mobile Logout API Service
   * Comprehensive logout handler for mobile application and user profiles.
   * Clears device tokens, device type, device ID, and refresh token on the user document,
   * invalidates user device sessions from UserSession, and clears HTTP-only refresh cookies.
   *
   * @param userId - Authenticated user's ObjectId or string ID
   * @param res - Express Response object to clear authentication cookies
   * @param deviceId - Optional device ID to target session invalidation
   * @returns Promise<{ message: string }> Standard logout success message
   */
  static async mobileLogoutHandler(
    userId: string | Types.ObjectId,
    res: Response,
    deviceId?: string,
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    const userObjectId = new Types.ObjectId(userId.toString());

    // 1. Reset user device metadata and refresh token in database
    await User.findByIdAndUpdate(userObjectId, {
      $set: {
        refreshToken: null,
        deviceToken: null,
        deviceType: null,
        deviceId: null,
      },
    });

    // 2. Clear device sessions in UserSession collection
    if (deviceId) {
      await UserSession.deleteMany({ userId: userObjectId, deviceId });
    } else {
      await UserSession.deleteMany({ userId: userObjectId });
    }

    // 3. Clear refresh token HTTP-only cookie
    this.clearRefreshTokenCookie(res);

    return { message: "auth.logoutSuccess" };
  }

  /**
   * Update User Account / Sub-Profile API Service
   * Allows logged-in user to update an existing account/sub-profile details.
   *
   * @param userId - Authenticated user's ObjectId or string
   * @param accountId - ObjectId string of the sub-profile to update
   * @param body - Account update details (name, displayName, isKids, avatarId, profilePicture, etc.)
   */
  static async updateUserAccountHandler(
    userId: string | Types.ObjectId,
    accountId: string | Types.ObjectId,
    body: {
      name?: string;
      displayName?: string;
      isKids?: boolean;
      kids?: boolean;
      avatarId?: string;
      avatar?: string;
      profilePicture?: string;
      favoriteGenreIds?: string[];
      preferredLanguageIds?: string[];
    }
  ) {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    if (!accountId) {
      throw new Error("auth.accountNotFound");
    }

    const userObjectId = new Types.ObjectId(userId.toString());
    const accountObjectId = new Types.ObjectId(accountId.toString());

    // Find the specific sub-profile belonging to this parent user
    const profile = await UserProfile.findOne({
      _id: accountObjectId,
      userId: userObjectId,
    });

    if (!profile) {
      throw new Error("auth.accountNotFound");
    }

    // Check for duplicate account name under the same user if name is being changed
    const newDisplayName = (body.name || body.displayName || "").trim();
    if (newDisplayName && newDisplayName.toLowerCase() !== profile.displayName.toLowerCase()) {
      const duplicateAccount = await UserProfile.findOne({
        userId: userObjectId,
        _id: { $ne: accountObjectId },
        displayName: { $regex: new RegExp(`^${newDisplayName}$`, "i") },
      });

      if (duplicateAccount) {
        throw new Error("auth.accountNameDuplicate");
      }

      profile.displayName = newDisplayName;
    }

    // Update profile type if isKids/kids is passed
    const isKidsFlag = body.isKids !== undefined ? body.isKids : (body.kids !== undefined ? body.kids : undefined);
    if (isKidsFlag !== undefined) {
      profile.profileType = isKidsFlag ? ProfileType.KIDS : ProfileType.STANDARD;
    }

    // Update avatar / picture if provided
    if (body.avatar !== undefined || body.profilePicture !== undefined) {
      profile.profilePicture = (body.avatar || body.profilePicture || "").trim() || undefined;
    }

    if (body.avatarId !== undefined) {
      profile.avatarId = body.avatarId.trim() || undefined;
    }

    if (body.favoriteGenreIds !== undefined) {
      profile.favoriteGenreIds = (body.favoriteGenreIds || []).map((id) => new Types.ObjectId(id));
    }

    if (body.preferredLanguageIds !== undefined) {
      profile.preferredLanguageIds = (body.preferredLanguageIds || []).map((id) => new Types.ObjectId(id));
    }

    await profile.save();

    const defaultUserProfileAvatar = await getDefaultUserProfileAvatarUrl();

    const profilePictureUrl =
      profile.profilePicture && profile.profilePicture.trim() !== ""
        ? profile.profilePicture.startsWith("http")
          ? profile.profilePicture
          : `${config.aws.cloudFrontUrl}/${profile.profilePicture.replace(/^\/+/, "")}`
        : defaultUserProfileAvatar;

    return {
      account: {
        _id: profile._id,
        displayName: profile.displayName,
        profileType: profile.profileType,
        isKids: profile.profileType === ProfileType.KIDS,
        profilePicture: profilePictureUrl,
        avatarId: profile.avatarId || null,
        isDefault: profile.isDefault,
        notificationEnabled: profile.notificationEnabled,
        favoriteGenreIds: profile.favoriteGenreIds || [],
        preferredLanguageIds: profile.preferredLanguageIds || [],
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  }

  /**
   * Delete User Account / Sub-Profile API Service
   * Allows logged-in user to delete a sub-profile account.
   *
   * @param userId - Authenticated user's ObjectId or string
   * @param accountId - ObjectId string of the sub-profile to delete
   */
  static async deleteUserAccountHandler(
    userId: string | Types.ObjectId,
    accountId: string | Types.ObjectId
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    if (!accountId) {
      throw new Error("auth.accountNotFound");
    }

    const userObjectId = new Types.ObjectId(userId.toString());
    const accountObjectId = new Types.ObjectId(accountId.toString());

    // Verify sub-profile exists and belongs to the user
    const profile = await UserProfile.findOne({
      _id: accountObjectId,
      userId: userObjectId,
    });

    if (!profile) {
      throw new Error("auth.accountNotFound");
    }

    // Check count of user profiles
    const totalProfiles = await UserProfile.countDocuments({ userId: userObjectId });
    if (totalProfiles <= 1) {
      throw new Error("auth.cannotDeleteLastAccount");
    }

    const wasDefault = profile.isDefault;

    // Delete sub-profile
    await UserProfile.deleteOne({ _id: accountObjectId });

    // If the deleted profile was default, promote the first remaining profile to default
    if (wasDefault) {
      const remainingProfile = await UserProfile.findOne({ userId: userObjectId }).sort({ createdAt: 1 });
      if (remainingProfile) {
        remainingProfile.isDefault = true;
        await remainingProfile.save();
      }
    }

    return { message: "auth.accountDeletedSuccess" };
  }

  /**
   * Send Delete User Account OTP API Service
   * Sends an OTP to the logged-in user's mobile number for identity verification prior to account deletion.
   * Checks if user has an active subscription; if so, blocks sending OTP and throws an error.
   *
   * @param userId - Authenticated user's ObjectId or string
   */
  static async sendDeleteUserOtpHandler(
    userId: string | Types.ObjectId
  ): Promise<{ otpId: string; otp?: string; message: string }> {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    const userObjectId = new Types.ObjectId(userId.toString());
    const user = await User.findById(userObjectId);

    if (!user) {
      throw new Error("auth.userNotFound");
    }

    // Subscription Validation: Check if user has an active subscription
    const activeSub = await UserSubscription.findOne({
      userId: userObjectId,
      status: SubscriptionStatus.ACTIVE,
      endDate: { $gt: new Date() },
    });

    if (activeSub) {
      throw new Error("auth.activeSubscriptionDeleteError");
    }

    const mobile = user.mobile;
    const countryCode = String(user.countryCode || "+91");

    if (!mobile) {
      throw new Error("auth.userNotFound");
    }

    const otpRecord = await this.processMobileOtpSend(mobile, countryCode, OTPType.DELETE_ACCOUNT);

    const isTestEnvironment = config.nodeEnv !== "production" && process.env.NODE_ENV !== "production";

    return {
      otpId: otpRecord._id.toString(),
      ...(isTestEnvironment ? { otp: otpRecord.otp } : {}),
      message: "auth.otpSent",
    };
  }

  /**
   * Delete Main User Account API Service
   * Verifies OTP, validates subscription status, soft-deletes account, purges sub-profiles & sessions, logs audit trail, and clears cookies.
   *
   * @param userId - Authenticated user's ObjectId or string
   * @param otp - OTP string submitted by user
   * @param res - Express Response object to clear cookies
   * @param req - Express Request object for audit logging (optional)
   */
  static async deleteUserHandler(
    userId: string | Types.ObjectId,
    otp: string,
    res: Response,
    req?: Request
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new Error("auth.unauthorized");
    }

    if (!otp || !otp.trim()) {
      throw new Error("validation.otpIsRequired");
    }

    const userObjectId = new Types.ObjectId(userId.toString());

    const user = await User.findById(userObjectId);
    if (!user) {
      throw new Error("auth.userNotFound");
    }

    // Subscription Validation: Check if user has an active subscription
    const activeSub = await UserSubscription.findOne({
      userId: userObjectId,
      status: SubscriptionStatus.ACTIVE,
      endDate: { $gt: new Date() },
    });

    if (activeSub) {
      throw new Error("auth.activeSubscriptionDeleteError");
    }

    const isTestEnvironment = config.nodeEnv !== "production" && process.env.NODE_ENV !== "production";
    const isTestOtp = isTestEnvironment && otp === "1234";

    const countryCode = String(user.countryCode || "+91");
    const otpRecord = await OTP.findOne({
      $or: [
        { userId: userObjectId },
        { mobile: user.mobile, countryCode },
      ],
      type: OTPType.DELETE_ACCOUNT,
    });

    if (!otpRecord && !isTestOtp) {
      throw new Error("auth.otpInvalid");
    }

    if (otpRecord) {
      if (otpRecord.expiresAt < new Date() && !isTestOtp) {
        throw new Error("auth.otpExpired");
      }

      if (otpRecord.attempts >= 3 && !isTestOtp) {
        otpRecord.sendAttempts = 5;
        otpRecord.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await otpRecord.save();
        throw new Error("auth.otpExpired");
      }

      if (otpRecord.otp !== otp && !isTestOtp) {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
        if (otpRecord.attempts >= 3) {
          otpRecord.sendAttempts = 5;
          otpRecord.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
          await otpRecord.save();
          throw new Error("auth.otpExpired");
        }
        await otpRecord.save();
        throw new Error("auth.otpInvalid");
      }

      await OTP.deleteOne({ _id: otpRecord._id });
    }

    const oldStatus = user.status;

    // Set user status to DELETED and clear active tokens
    user.status = UserStatus.DELETED;
    user.refreshToken = undefined;
    user.deviceToken = undefined;
    user.deviceType = undefined;
    user.deviceId = undefined;
    await user.save();

    // Delete all associated sub-profiles
    await UserProfile.deleteMany({ userId: userObjectId });

    // Delete all active user sessions across devices
    await UserSession.deleteMany({ userId: userObjectId });

    // Audit Logging
    await AuditLogService.logAction({
      adminId: user._id,
      module: AuditModule.USERS,
      action: "Delete User Account",
      entityId: user._id,
      oldData: { email: user.email, mobile: user.mobile, status: oldStatus },
      newData: { status: UserStatus.DELETED },
      req,
      status: AuditStatus.SUCCESS,
    });

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return { message: "auth.userDeletedSuccess" };
  }
}

export default AuthService;
