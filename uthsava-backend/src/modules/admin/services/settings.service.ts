import { Types } from 'mongoose';
import { PlatformSettings, IRevenueBracket } from '../../../models/settings.model';
import { logger } from '../../../core/constants/logger';

/**
 * PlatformSettings Service
 * Singleton pattern — there is always exactly one PlatformSettings document.
 */
export class SettingsService {
  // ─── Defaults ──────────────────────────────────────────────────────────────

  private static readonly DEFAULTS = {
    instagram: null,
    facebook: null,
    linkedin: null,
    appStore: null,
    googlePlayStore: null,
    email: null,
    phone: null,
    freePreviewEnabled: false,
    freePreviewDurationMinutes: 5,
    yearlySubscriptionDiscount: 0,
    revenueBrackets: [],
    payoutFrequencyDays: 90,
  };

  // ─── Get ───────────────────────────────────────────────────────────────────

  /**
   * Return the settings document, or defaults if none exists yet.
   */
  static async getSettings() {
    try {
      const settings = await PlatformSettings.findOne({});
      return settings ? settings.toJSON() : { ...SettingsService.DEFAULTS };
    } catch (error) {
      logger.error("Error getting settings:", error);
      throw error;
    }
  }

  // ─── Create or update (full upsert) ───────────────────────────────────────

  /**
   * Upsert the settings document.
   * Only fields present in `data` are written — others are left unchanged.
   */
  static async createOrUpdateSettings(
    data: Partial<{
      instagram: string;
      facebook: string;
      linkedin: string;
      appStore: string;
      googlePlayStore: string;
      email: string;
      phone: string;
      freePreviewEnabled: boolean;
      freePreviewDurationMinutes: number;
      yearlySubscriptionDiscount: number;
      revenueBrackets: IRevenueBracket[];
      payoutFrequencyDays: number;
    }>,
    userId?: string,
  ) {
    try {
      const existing = await PlatformSettings.findOne({});

      if (existing) {
        const update: Record<string, unknown> = { updatedBy: userId };

        const nullableStrings = [
          "instagram",
          "facebook",
          "linkedin",
          "appStore",
          "googlePlayStore",
          "email",
          "phone",
        ] as const;
        for (const field of nullableStrings) {
          if (data[field] !== undefined) update[field] = data[field] || null;
        }

        if (data.freePreviewEnabled !== undefined) update.freePreviewEnabled = data.freePreviewEnabled;
        if (data.freePreviewDurationMinutes !== undefined) update.freePreviewDurationMinutes = data.freePreviewDurationMinutes;
        if (data.yearlySubscriptionDiscount !== undefined) update.yearlySubscriptionDiscount = data.yearlySubscriptionDiscount;
        if (data.revenueBrackets !== undefined) update.revenueBrackets = data.revenueBrackets;
        if (data.payoutFrequencyDays !== undefined) update.payoutFrequencyDays = data.payoutFrequencyDays;

        const updated = await PlatformSettings.findByIdAndUpdate(existing._id, update, { new: true, runValidators: true });
        logger.info(`PlatformSettings updated: ${updated?._id}`);
        return updated?.toJSON();
      }

      // First-time creation
      const created = await PlatformSettings.create({
        ...SettingsService.DEFAULTS,
        ...data,
        createdBy: userId,
        updatedBy: userId,
      });
      logger.info(`PlatformSettings created: ${created._id}`);
      return created.toJSON();
    } catch (error) {
      logger.error("Error creating/updating settings:", error);
      throw error;
    }
  }

  // ─── Free Preview ──────────────────────────────────────────────────────────

  static async updateFreePreview(
    data: { freePreviewEnabled?: boolean; freePreviewDurationMinutes?: number },
    userId?: string,
  ) {
    return SettingsService.createOrUpdateSettings(data, userId);
  }

  // ─── Revenue Brackets ─────────────────────────────────────────────────────

  /**
   * Return all revenue brackets, sorted by fromViews ascending.
   */
  static async getRevenueBrackets(): Promise<IRevenueBracket[]> {
    const settings = await PlatformSettings.findOne({}).select('revenueBrackets');
    const brackets = settings?.revenueBrackets ?? [];
    return [...brackets].sort((a, b) => a.fromViews - b.fromViews);
  }

  /**
   * Add a new bracket. Validates no overlap with existing brackets.
   */
static async addRevenueBracket(
  bracket: IRevenueBracket,
  userId?: string,
) {
  const settings = await SettingsService._getOrCreate(userId);

  SettingsService._assertNoOverlap(settings.revenueBrackets, bracket);

  settings.revenueBrackets.push(bracket);

  await settings.save();

  return settings;
}
  /**
   * Update an existing bracket by its subdocument _id.
   */
  static async updateRevenueBracket(
    oldBracket: any,
    newBracket: any,
    userId?: string,
  ): Promise<IRevenueBracket[]> {
    const settings = await SettingsService._getOrCreate(userId);

    const bracket = (settings.revenueBrackets as any[]).find(
      (b) => b.fromViews === oldBracket.fromViews && b.toViews === oldBracket.toViews && b.amountPerView === oldBracket.amountPerView,
    );
    if (!bracket) throw new Error("error.revenueBracketNotFound");

    const merged = {
      fromViews: newBracket.fromViews ?? bracket.fromViews,
      toViews: newBracket.toViews ?? bracket.toViews,
      amountPerView: newBracket.amountPerView ?? bracket.amountPerView,
    };

    // Validate no overlap with other brackets
    const others = (settings.revenueBrackets as any[]).filter(
      (b) => b.fromViews !== oldBracket.fromViews || b.toViews !== oldBracket.toViews || b.amountPerView !== oldBracket.amountPerView,
    );
    SettingsService._assertNoOverlap(others, merged);

    Object.assign(bracket, merged);
    // settings.updatedBy = userId;
    await settings.save();

    logger.info(`Revenue bracket ${bracket} updated`);
    return [...settings.revenueBrackets].sort(
      (a, b) => a.fromViews - b.fromViews,
    );
  }

  /**
   * Delete a bracket by its subdocument _id.
   */
  static async deleteRevenueBracket(
    bracket: any,
    userId?: string,
  ): Promise<IRevenueBracket[]> {
    const settings = await SettingsService._getOrCreate(userId);

    const bracketIndex = (settings.revenueBrackets as any[]).findIndex(
      (b) => b.fromViews === bracket.fromViews && b.toViews === bracket.toViews && b.amountPerView === bracket.amountPerView,
    );
    if (bracketIndex === -1) throw new Error("error.revenueBracketNotFound");

    settings.revenueBrackets.splice(bracketIndex, 1);
    // settings.updatedBy = userId;
    await settings.save();

    logger.info(`Revenue bracket ${JSON.stringify(bracket)} deleted`);
    return [...settings.revenueBrackets].sort(
      (a, b) => a.fromViews - b.fromViews,
    );
  }

  // ─── Payout PlatformSettings ──────────────────────────────────────────────────────

  static async updatePayoutSettings(
    data: { payoutFrequencyDays: number },
    userId?: string,
  ) {
    return SettingsService.createOrUpdateSettings(data, userId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private static async _getOrCreate(userId?: string) {
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = await PlatformSettings.create({ ...SettingsService.DEFAULTS, createdBy: userId, updatedBy: userId });
    } else {
      if (settings.yearlySubscriptionDiscount === undefined) {
        settings.yearlySubscriptionDiscount = 0;
        await settings.save();
      }
    }
    return settings;
  }

  /**
   * Throw if the new bracket overlaps with any existing bracket.
   *
   * Overlap rule: two ranges [a, b] and [c, d] overlap only when a < d && c < b
   * (strict inequalities). This means touching boundaries are allowed:
   *   [0–1000] and [1000–2000] are NOT overlapping — 1000 is the shared boundary.
   *   [0–1000] and [500–1500] ARE overlapping — the range 500–1000 is covered twice.
   *
   * The error message names the conflicting bracket so the client can show it in the UI.
   */
  private static _assertNoOverlap(
    existing: IRevenueBracket[],
    incoming: IRevenueBracket,
  ) {
    for (const b of existing) {
      // Strict overlap: ranges share more than just a single boundary point
      const overlaps =
        incoming.fromViews < b.toViews && incoming.toViews > b.fromViews;
      if (overlaps) {
        throw new Error(
          `Range ${incoming.fromViews}–${incoming.toViews} overlaps with existing bracket ${b.fromViews}–${b.toViews}. Please use a non-overlapping range.`,
        );
      }
    }
  }
}
