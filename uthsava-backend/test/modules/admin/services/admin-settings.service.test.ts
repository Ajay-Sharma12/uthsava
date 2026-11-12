import { SettingsService } from "../../../../src/modules/admin/services/settings.service";
import { PlatformSettings } from "../../../../src/models/settings.model";

jest.mock("../../../../src/models/settings.model");

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Settings Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return settings if found", async () => {
      const mockSettings = { toJSON: jest.fn().mockReturnValue({ freePreviewEnabled: true }) };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const result = await SettingsService.getSettings();
      expect(result).toEqual({ freePreviewEnabled: true });
    });

    it("should return defaults if not found", async () => {
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(null);
      const result = await SettingsService.getSettings();
      expect(result).toHaveProperty("freePreviewEnabled", false);
    });

    it("should throw error", async () => {
      (PlatformSettings.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));
      await expect(SettingsService.getSettings()).rejects.toThrow("DB Error");
    });
  });

  describe("createOrUpdateSettings", () => {
    it("should update existing settings", async () => {
      const mockExisting = { _id: "123", toJSON: jest.fn().mockReturnValue({ freePreviewEnabled: true }) };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockExisting);
      (PlatformSettings.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "123",
        toJSON: jest.fn().mockReturnValue({ freePreviewEnabled: true }),
      });

      const result = await SettingsService.createOrUpdateSettings({ freePreviewEnabled: true }, "admin1");
      expect(PlatformSettings.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        expect.objectContaining({ updatedBy: "admin1", freePreviewEnabled: true }),
        { new: true, runValidators: true }
      );
      expect(result).toHaveProperty("freePreviewEnabled", true);
    });

    it("should create new settings if not existing", async () => {
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(null);
      (PlatformSettings.create as jest.Mock).mockResolvedValue({
        _id: "123",
        toJSON: jest.fn().mockReturnValue({ freePreviewEnabled: true }),
      });

      const result = await SettingsService.createOrUpdateSettings({ freePreviewEnabled: true }, "admin1");
      expect(PlatformSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: "admin1", updatedBy: "admin1", freePreviewEnabled: true })
      );
      expect(result).toHaveProperty("freePreviewEnabled", true);
    });

    it("should throw error", async () => {
      (PlatformSettings.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));
      await expect(SettingsService.createOrUpdateSettings({})).rejects.toThrow("DB Error");
    });
  });

  describe("updateFreePreview", () => {
    it("should call createOrUpdateSettings", async () => {
      const spy = jest.spyOn(SettingsService, "createOrUpdateSettings").mockResolvedValue({} as any);
      await SettingsService.updateFreePreview({ freePreviewEnabled: true }, "admin1");
      expect(spy).toHaveBeenCalledWith({ freePreviewEnabled: true }, "admin1");
      spy.mockRestore();
    });
  });

  describe("getRevenueBrackets", () => {
    it("should return sorted revenue brackets", async () => {
      const mockSettings = {
        revenueBrackets: [
          { fromViews: 100, toViews: 200 },
          { fromViews: 0, toViews: 50 },
        ],
      };
      (PlatformSettings.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSettings),
      });

      const result = await SettingsService.getRevenueBrackets();
      expect(result[0].fromViews).toBe(0);
      expect(result[1].fromViews).toBe(100);
    });
  });

  describe("addRevenueBracket", () => {
    it("should add bracket if no overlap", async () => {
      const mockSettings = {
        revenueBrackets: [{ fromViews: 0, toViews: 100 }],
        save: jest.fn().mockResolvedValue(true),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const newBracket = { fromViews: 100, toViews: 200, amountPerView: 0.1 } as any;
      const result = await SettingsService.addRevenueBracket(newBracket, "admin1");

      expect(mockSettings.revenueBrackets.length).toBe(2);
      expect(mockSettings.save).toHaveBeenCalled();
      expect(result).toBe(mockSettings);
    });

    it("should throw error if overlap", async () => {
      const mockSettings = {
        revenueBrackets: [{ fromViews: 0, toViews: 100 }],
        yearlySubscriptionDiscount: 0,
        save: jest.fn(),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const newBracket = { fromViews: 50, toViews: 200, amountPerView: 0.1 } as any;
      await expect(SettingsService.addRevenueBracket(newBracket, "admin1")).rejects.toThrow(/overlaps/);
      expect(mockSettings.save).not.toHaveBeenCalled();
    });
  });

  describe("updateRevenueBracket", () => {
    it("should update bracket if found and no overlap", async () => {
      const mockSettings = {
        revenueBrackets: [{ fromViews: 0, toViews: 100, amountPerView: 0.1 }],
        save: jest.fn().mockResolvedValue(true),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const oldBracket = { fromViews: 0, toViews: 100, amountPerView: 0.1 };
      const newBracket = { fromViews: 0, toViews: 150 };

      const result = await SettingsService.updateRevenueBracket(oldBracket, newBracket, "admin1");

      expect(mockSettings.revenueBrackets[0].toViews).toBe(150);
      expect(mockSettings.save).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });

    it("should throw error if not found", async () => {
      const mockSettings = {
        revenueBrackets: [],
        save: jest.fn(),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      await expect(SettingsService.updateRevenueBracket({ fromViews: 0, toViews: 100, amountPerView: 0.1 }, {})).rejects.toThrow("error.revenueBracketNotFound");
    });
  });

  describe("deleteRevenueBracket", () => {
    it("should delete bracket if found", async () => {
      const mockSettings = {
        revenueBrackets: [{ fromViews: 0, toViews: 100, amountPerView: 0.1 }],
        save: jest.fn().mockResolvedValue(true),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const result = await SettingsService.deleteRevenueBracket({ fromViews: 0, toViews: 100, amountPerView: 0.1 }, "admin1");

      expect(mockSettings.revenueBrackets.length).toBe(0);
      expect(mockSettings.save).toHaveBeenCalled();
      expect(result.length).toBe(0);
    });

    it("should throw error if not found", async () => {
      const mockSettings = {
        revenueBrackets: [],
        save: jest.fn(),
      };
      (PlatformSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      await expect(SettingsService.deleteRevenueBracket({ fromViews: 0, toViews: 100, amountPerView: 0.1 })).rejects.toThrow("error.revenueBracketNotFound");
    });
  });

  describe("updatePayoutSettings", () => {
    it("should call createOrUpdateSettings", async () => {
      const spy = jest.spyOn(SettingsService, "createOrUpdateSettings").mockResolvedValue({} as any);
      await SettingsService.updatePayoutSettings({ payoutFrequencyDays: 30 }, "admin1");
      expect(spy).toHaveBeenCalledWith({ payoutFrequencyDays: 30 }, "admin1");
      spy.mockRestore();
    });
  });
});
