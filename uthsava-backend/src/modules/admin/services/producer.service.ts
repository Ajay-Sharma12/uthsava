import { FilterQuery, Types } from "mongoose";
import { User, IUser, UserStatus, Content, ProducerProfile } from "../../../models";
import { Role } from "../../../common/types/auth.types";
import { PaginationParams, PaginationHelper } from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import { AuthService } from "../../auth/services/auth.service";
import { PasswordHelper } from "../../shared/helpers/password.helper";
import { EmailTemplate } from "../../../models/email-template.model";
import { sendMail } from "../../shared/services/mail.service";
import { Request } from "express";
import { getAdminBaseUrl } from "../../shared/helpers/url.helper";
import { config } from "../../../core/config";

export const PRODUCER_SORT_FIELDS = [
  "email",
  "fullName",
  "firstName",
  "lastName",
  "mobile",
  "companyName",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const PRODUCER_SEARCH_FIELDS = [
  "email",
  "fullName",
  "firstName",
  "lastName",
  "mobile",
  "companyName",
] as const;

export const ERROR_MESSAGES = {
  PRODUCER_NOT_FOUND: "producer.not_found",
  EMAIL_EXISTS: "auth.email_exists",
} as const;

/**
 * Producer Service
 * Handles business logic for producer account management
 */
export class ProducerService {
  // ─── List ────────────────────────────────────────────────────────────────────

  static async listProducers(
    pagination: PaginationParams,
    query: FilterQuery<IUser> = {},
  ) {
    try {
      const baseQuery: FilterQuery<IUser> = {
        ...query,
        role: Role.PRODUCER,
        status: { $ne: UserStatus.DELETED },
      };

      // If an explicit status filter was passed, honour it (overrides the $ne guard)
      if (query.status) {
        baseQuery.status = query.status;
      }

      const parsedParams = PaginationHelper.parseParams(pagination, [
        ...PRODUCER_SORT_FIELDS,
      ]);
      const result = await PaginationHelper.paginate(
        User,
        baseQuery,
        parsedParams,
        undefined,
        [
          { path: "createdBy", select: "firstName lastName fullName email" },
          { path: "lastModifiedBy", select: "firstName lastName fullName email" }
        ]
      );

      const [total, active, inactive] = await Promise.all([
        User.countDocuments({
          role: Role.PRODUCER,
          status: { $ne: UserStatus.DELETED },
        }),
        User.countDocuments({ role: Role.PRODUCER, status: UserStatus.ACTIVE }),
        User.countDocuments({
          role: Role.PRODUCER,
          status: UserStatus.INACTIVE,
        }),
      ]);

      // Fetch content counts for all producers on this page in a single aggregation
      const producerIds = result.data.map(
        (p: any) => new Types.ObjectId(p._id),
      );
      const contentCountsAgg = await Content.aggregate([
        { $match: { uploadedBy: { $in: producerIds } } },
        { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
      ]);

      // Build a lookup map: producerId (string) → count
      const contentCountMap = new Map<string, number>(
        contentCountsAgg.map(({ _id, count }) => [_id.toString(), count]),
      );

      return {
        data: result.data.map((p: any) => ({
          ...ProducerService.sanitizeProducer(p),
          contentCount: contentCountMap.get(p._id.toString()) ?? 0,
        })),
        pagination: result.pagination,
        counts: { total, active, inactive },
      };
    } catch (error: any) {
      logger.error("List producers error:", error);
      throw error;
    }
  }

  // ─── Get by ID ───────────────────────────────────────────────────────────────

  static async getProducerById(id: string): Promise<IUser | null> {
    try {
      return await User.findOne({ _id: id, role: Role.PRODUCER })
        .populate("createdBy", "firstName lastName fullName email")
        .populate("lastModifiedBy", "firstName lastName fullName email");
    } catch (error: any) {
      logger.error("Get producer by ID error:", error);
      throw error;
    }
  }

  // ─── Get detail view (with content count + total earnings) ───────────────────

  static async getProducerDetail(id: string) {
  const producer = await User.findOne({ _id: id, role: Role.PRODUCER })
    .populate("createdBy", "firstName lastName fullName email")
    .populate("lastModifiedBy", "firstName lastName fullName email");

  if (!producer) throw new Error(ERROR_MESSAGES.PRODUCER_NOT_FOUND);

  const objectId = new Types.ObjectId(id);

  const profile = await ProducerProfile.findOne({
    userId: objectId,
  });

  const profileData = profile
    ? profile.toObject()
    : {
        userId: producer._id,
        companyName: (producer as any).companyName || "",
        description: null,
        gstNumber: null,
        logo: null,
        verificationDocuments: [],
        signedContract: null,
        bankAccountHolderName: null,
        bankName: null,
        accountNumber: null,
        ifscCode: null,
        payoutFrequency: "monthly",
        revenueShare: 50,
        website: null,
        country: producer.country ?? null,
        state: producer.state ?? null,
        city: producer.city ?? null,
        address: null,
      };

  const totalUploadedContent = await Content.countDocuments({
    uploadedBy: objectId,
  });

  return {
    producer: ProducerService.sanitizeProducer(producer),
    profile: profileData,
    totalUploadedContent,
    totalEarnings: 0,
  };
}
  // ─── Create ──────────────────────────────────────────────────────────────────

  static async createProducer(
data: Partial<IUser> & {
  companyName?: string;
  website?: string | null;
  description?: string | null;
  gstNumber?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  categories?: string[];
  genres?: string[];
},
    req?: Request,
  ): Promise<IUser> {
    try {
const existing = await User.findOne({
  email: (data.email || "").toLowerCase(),
  status: { $ne: UserStatus.DELETED },
});

if (existing) {
  throw new Error(ERROR_MESSAGES.EMAIL_EXISTS);
}

      if (data.mobile) {
        const query: any = {
          mobile: data.mobile,
          status: { $ne: UserStatus.DELETED },
        };
        if (data.countryCode) {
          query.countryCode = data.countryCode;
        }
        const existingMobile = await User.findOne(query);
        if (existingMobile) throw new Error("MOBILE_EXISTS");
      }

      const temporaryPassword = PasswordHelper.generateAlphanumericPassword(8);
      const hashedPassword = await AuthService.hashPassword(temporaryPassword);

      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();

      // Set password expiry to 10 days from now
      const passwordExpiryDate = new Date();
      passwordExpiryDate.setDate(passwordExpiryDate.getDate() + 10);

      // Fetch the producer role from the database
      const { RoleModel } = require("../../../models/role.model");
      const producerRole = await RoleModel.findOne({ name: { $regex: /^producer$/i } });
      const roleId = producerRole ? producerRole._id : null;

      const producer = await User.create({
        ...data,
        email: (data.email || "").toLowerCase(),
        password: hashedPassword,
        fullName,
        role: Role.PRODUCER,
        roleId: roleId,
        status: data.status || UserStatus.ACTIVE,
        passwordExpiryDate,
        passwordExpiryDays: 10,
        isPasswordExpired: false,
        categories: data.categories || [],
      });

if (
  data.companyName !== undefined ||
  data.website !== undefined ||
  data.description !== undefined ||
  data.gstNumber !== undefined ||
  data.country !== undefined ||
  data.state !== undefined ||
  data.city !== undefined ||
  data.address !== undefined
) {
  await ProducerProfile.create({
    userId: producer._id,
    companyName: data.companyName || "",
    website: data.website ?? null,
    description: data.description ?? null,
    gstNumber: data.gstNumber ?? null,
    country: data.country ?? null,
    state: data.state ?? null,
    city: data.city ?? null,
    address: data.address ?? null,
  });
}

      // Producer Credentials Email
      try {
        const tpl = await EmailTemplate.findOne({
          keyword: "PRODUCER_CREDENTIALS",
          status: "active",
        });

        if (tpl) {
          const producerName = `${producer.firstName || ""} ${producer.lastName || ""}`.trim();
          const adminBaseUrl = getAdminBaseUrl(req);

          let subject = (tpl.subject || "Your Producer Account Credentials")
            .replaceAll("{{Platform Name}}", "Uthsava")
            .replaceAll("{{Producer Name}}", producerName)
            .replaceAll("{{name}}", producerName);

          let body = (tpl.description || "")
            .replaceAll("{{Producer Name}}", producerName)
            .replaceAll("{{name}}", producerName)
            .replaceAll("{{Email ID}}", producer.email || "")
            .replaceAll("{{email}}", producer.email || "")
            .replaceAll("{{Auto-generated Password}}", temporaryPassword)
            .replaceAll("{{password}}", temporaryPassword)
            .replaceAll("{{Login URL}}", adminBaseUrl)
            .replaceAll("{{login_url}}", adminBaseUrl);

          await sendMail(producer.email || "admin@example.com", subject, body);
          logger.info(`Producer credentials email sent to: ${producer.email}`);
        }
      } catch (err: any) {
        logger.error("Failed to process PRODUCER_CREDENTIALS email:", err);
      }

      return producer;
    } catch (error: any) {
      logger.error("Create producer error:", error);
      throw error;
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  static async updateProducer(
    id: string,
    updateData: Partial<IUser> & {
      companyName?: string;
      website?: string | null;
      description?: string | null;
      gstNumber?: string | null;
      country?: string | null;
      state?: string | null;
      city?: string | null;
      address?: string | null;
    },
  ): Promise<IUser> {
    let producer = await User.findOne({ _id: id, role: Role.PRODUCER });
    if (!producer && Types.ObjectId.isValid(id)) {
      const profile = await ProducerProfile.findById(id);
      if (profile && profile.userId) {
        producer = await User.findOne({ _id: profile.userId, role: Role.PRODUCER });
      }
    }
    if (!producer) throw new Error(ERROR_MESSAGES.PRODUCER_NOT_FOUND);

    // Email uniqueness check
    if (updateData.email && updateData.email.toLowerCase() !== (producer.email || "").toLowerCase()) {
      const dup = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: producer._id },
        status: { $ne: UserStatus.DELETED },
      });
      if (dup) throw new Error(ERROR_MESSAGES.EMAIL_EXISTS);
      updateData.email = updateData.email.toLowerCase();
    }

    // Mobile uniqueness check
    if (updateData.mobile) {
      const query: any = {
        mobile: updateData.mobile,
        _id: { $ne: producer._id },
        status: { $ne: UserStatus.DELETED },
      };
      if (updateData.countryCode || producer.countryCode) {
        query.countryCode = updateData.countryCode || producer.countryCode;
      }
      const existingMobile = await User.findOne(query);
      if (existingMobile) throw new Error("MOBILE_EXISTS");
    }

    // Rebuild fullName if names changed
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined
    ) {
      updateData.fullName =
        `${updateData.firstName ?? producer.firstName ?? ""} ${updateData.lastName ?? producer.lastName ?? ""}`.trim();
    }

    // Invalidate session on deactivation
    if (updateData.status === UserStatus.INACTIVE) {
      (producer as any).refreshToken = undefined;
    }

const profileUpdate: Record<string, any> = {};

if (updateData.companyName !== undefined) {
  profileUpdate.companyName = updateData.companyName;
}

if (updateData.website !== undefined) {
  profileUpdate.website = updateData.website;
}

if (updateData.description !== undefined) {
  profileUpdate.description = updateData.description;
}

if (updateData.gstNumber !== undefined) {
  profileUpdate.gstNumber = updateData.gstNumber;
}

if (updateData.country !== undefined) {
  profileUpdate.country = updateData.country;
}

if (updateData.state !== undefined) {
  profileUpdate.state = updateData.state;
}

if (updateData.city !== undefined) {
  profileUpdate.city = updateData.city;
}

if (updateData.address !== undefined) {
  profileUpdate.address = updateData.address;
}

if (Object.keys(profileUpdate).length > 0) {
  await ProducerProfile.findOneAndUpdate(
    { userId: producer._id },
    {
      $set: profileUpdate,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

const {
  companyName,
  website,
  description,
  gstNumber,
  country,
  state,
  city,
  address,
  ...userUpdateData
} = updateData;

Object.assign(producer, userUpdateData);

return producer.save();
  }

  // ─── Delete (soft) ───────────────────────────────────────────────────────────

static async deleteProducer(id: string): Promise<void> {
  const producer = await User.findOne({
    _id: id,
    role: Role.PRODUCER,
  });

  if (!producer) {
    throw new Error(ERROR_MESSAGES.PRODUCER_NOT_FOUND);
  }

  // Delete producer profile if it exists
  await ProducerProfile.deleteOne({
    userId: producer._id,
  });

  // Permanently delete producer
  await User.deleteOne({
    _id: producer._id,
    role: Role.PRODUCER,
  });
}

  // ─── Sanitize ────────────────────────────────────────────────────────────────

  static sanitizeProducer(user: any): any {
    if (!user) return null;
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.refreshToken;
    delete obj.__v;
    delete obj.subAdminPermissions;

    // Build profile image URL
    if (obj.profileImage && !obj.profileImage.startsWith("http")) {
      obj.profileImageUrl = `${config.aws.cloudFrontUrl}/${obj.profileImage}`;
    } else {
      obj.profileImageUrl = obj.profileImage || "";
    }

    return obj;
  }
}
