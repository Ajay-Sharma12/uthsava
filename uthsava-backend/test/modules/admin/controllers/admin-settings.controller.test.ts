import { Request, Response } from "express";
import {
  getSettings,
  updateSettings,
  updateFreePreview,
  getRevenueBrackets,
  addRevenueBracket,
  updateRevenueBracket,
  deleteRevenueBracket,
  updatePayoutSettings,
} from "../../../../src/modules/admin/controllers/settings.controller";
import { SettingsService } from "../../../../src/modules/admin/services/settings.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

jest.mock("../../../../src/modules/admin/services/settings.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (body: any = {}) => {
  return {
    body,
    user: { sub: "admin123" },
  } as unknown as Request;
};

describe("Admin Settings Controller", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("getSettings", () => {
    it("should return settings successfully", async () => {
      req = mockRequest();
      const mockSettings = { freePreviewEnabled: true };
      (SettingsService.getSettings as jest.Mock).mockResolvedValue(mockSettings);

      await getSettings(req, res);

      expect(SettingsService.getSettings).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockSettings,
        "settings.retrieved",
        "en"
      );
    });

    it("should handle errors", async () => {
      req = mockRequest();
      (SettingsService.getSettings as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getSettings(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expect.any(Error)
      );
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully", async () => {
      req = mockRequest({ platformName: "Test Platform" });
      const mockSettings = { platformName: "Test Platform" };
      (SettingsService.createOrUpdateSettings as jest.Mock).mockResolvedValue(mockSettings);

      await updateSettings(req as any, res);

      expect(SettingsService.createOrUpdateSettings).toHaveBeenCalledWith(
        { platformName: "Test Platform" },
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockSettings,
        "settings.updated",
        "en"
      );
    });

    it("should handle freePreviewDuration alias", async () => {
      req = mockRequest({ freePreviewDuration: 15 });
      (SettingsService.createOrUpdateSettings as jest.Mock).mockResolvedValue({});

      await updateSettings(req as any, res);

      expect(SettingsService.createOrUpdateSettings).toHaveBeenCalledWith(
        { freePreviewDurationMinutes: 15 },
        "admin123"
      );
    });

    it("should handle errors", async () => {
      req = mockRequest({ platformName: "Test Platform" });
      (SettingsService.createOrUpdateSettings as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updateSettings(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateFreePreview", () => {
    it("should update free preview successfully", async () => {
      req = mockRequest({ freePreviewEnabled: true, freePreviewDurationMinutes: 10 });
      const mockSettings = { freePreviewEnabled: true };
      (SettingsService.updateFreePreview as jest.Mock).mockResolvedValue(mockSettings);

      await updateFreePreview(req as any, res);

      expect(SettingsService.updateFreePreview).toHaveBeenCalledWith(
        { freePreviewEnabled: true, freePreviewDurationMinutes: 10 },
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      req = mockRequest({});
      (SettingsService.updateFreePreview as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updateFreePreview(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getRevenueBrackets", () => {
    it("should get revenue brackets", async () => {
      req = mockRequest();
      const mockBrackets = [{ fromViews: 0 }];
      (SettingsService.getRevenueBrackets as jest.Mock).mockResolvedValue(mockBrackets);

      await getRevenueBrackets(req, res);

      expect(SettingsService.getRevenueBrackets).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { brackets: mockBrackets },
        "general.success",
        "en"
      );
    });

    it("should handle errors", async () => {
      req = mockRequest();
      (SettingsService.getRevenueBrackets as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getRevenueBrackets(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("addRevenueBracket", () => {
    it("should add bracket successfully", async () => {
      req = mockRequest({ fromViews: 0, toViews: 100, amountPerView: 0.1 });
      const mockSettings = { revenueBrackets: [] };
      (SettingsService.addRevenueBracket as jest.Mock).mockResolvedValue(mockSettings);

      await addRevenueBracket(req as any, res);

      expect(SettingsService.addRevenueBracket).toHaveBeenCalledWith(
        req.body,
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle overlaps validation error", async () => {
      req = mockRequest({});
      (SettingsService.addRevenueBracket as jest.Mock).mockRejectedValue(new Error("Bracket overlaps"));

      await addRevenueBracket(req as any, res);

      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        { bracket: "Bracket overlaps" },
        "validation.failed",
        "en"
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest({});
      (SettingsService.addRevenueBracket as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await addRevenueBracket(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateRevenueBracket", () => {
    it("should update bracket successfully", async () => {
      req = mockRequest({ oldBracket: {}, newBracket: {} });
      (SettingsService.updateRevenueBracket as jest.Mock).mockResolvedValue([]);

      await updateRevenueBracket(req as any, res);

      expect(SettingsService.updateRevenueBracket).toHaveBeenCalledWith(
        req.body.oldBracket,
        req.body.newBracket,
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error", async () => {
      req = mockRequest({});
      (SettingsService.updateRevenueBracket as jest.Mock).mockRejectedValue(new Error("error.revenueBracketNotFound"));

      await updateRevenueBracket(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.notFound",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle overlaps error", async () => {
      req = mockRequest({});
      (SettingsService.updateRevenueBracket as jest.Mock).mockRejectedValue(new Error("Bracket overlaps"));

      await updateRevenueBracket(req as any, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle generic error", async () => {
      req = mockRequest({});
      (SettingsService.updateRevenueBracket as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updateRevenueBracket(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("deleteRevenueBracket", () => {
    it("should delete bracket successfully", async () => {
      req = mockRequest({ fromViews: 0 });
      (SettingsService.deleteRevenueBracket as jest.Mock).mockResolvedValue([]);

      await deleteRevenueBracket(req as any, res);

      expect(SettingsService.deleteRevenueBracket).toHaveBeenCalledWith(
        req.body,
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error", async () => {
      req = mockRequest({});
      (SettingsService.deleteRevenueBracket as jest.Mock).mockRejectedValue(new Error("error.revenueBracketNotFound"));

      await deleteRevenueBracket(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.notFound",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle generic error", async () => {
      req = mockRequest({});
      (SettingsService.deleteRevenueBracket as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await deleteRevenueBracket(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updatePayoutSettings", () => {
    it("should update payout settings", async () => {
      req = mockRequest({ payoutFrequencyDays: 30 });
      (SettingsService.updatePayoutSettings as jest.Mock).mockResolvedValue({});

      await updatePayoutSettings(req as any, res);

      expect(SettingsService.updatePayoutSettings).toHaveBeenCalledWith(
        { payoutFrequencyDays: 30 },
        "admin123"
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle generic error", async () => {
      req = mockRequest({});
      (SettingsService.updatePayoutSettings as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updatePayoutSettings(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });
});
