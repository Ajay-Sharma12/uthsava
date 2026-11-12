import { Types } from "mongoose";
import { FaqService } from "../../../../src/modules/admin/services/faq.service";
import { Faq, FaqStatus } from "../../../../src/models";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/models", () => {
  const mockSave = jest.fn().mockResolvedValue(true);
  const FaqMock = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
    toJSON: () => data,
  })) as any;
  
  FaqMock.findOne = jest.fn();
  FaqMock.find = jest.fn();
  FaqMock.findById = jest.fn();
  FaqMock.findByIdAndUpdate = jest.fn();
  FaqMock.updateMany = jest.fn();
  
  return {
    Faq: FaqMock,
    FaqStatus: {
      ACTIVE: "ACTIVE",
      INACTIVE: "INACTIVE",
      DELETED: "DELETED",
    }
  };
});

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("Faq Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockToJSON = (obj: any) => ({ ...obj, toJSON: () => obj });

  describe("createFaq", () => {
    it("should create faq successfully", async () => {
      const mockPayload = { question: "Q1", answer: "A1", order: 1 };
      (Faq.findOne as jest.Mock).mockResolvedValue(null);
      
      const result = await FaqService.createFaq(mockPayload, "admin1");
      expect(result).toMatchObject({ question: "Q1", answer: "A1", order: 1 });
    });

    it("should shift order if faq order exists", async () => {
      const mockPayload = { question: "Q1", answer: "A1", order: 1 };
      (Faq.findOne as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });
      (Faq.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      
      await FaqService.createFaq(mockPayload, "admin1");
      expect(Faq.updateMany).toHaveBeenCalledWith({ order: { $gte: 1 } }, { $inc: { order: 1 } });
    });
  });

  describe("getFaqById", () => {
    it("should get faq by id", async () => {
      const mockFaq = mockToJSON({ _id: "faq1" });
      (Faq.findById as jest.Mock).mockResolvedValue(mockFaq);

      const result = await FaqService.getFaqById("faq1");
      expect(result).toEqual({ _id: "faq1" });
    });

    it("should throw not found error", async () => {
      (Faq.findById as jest.Mock).mockResolvedValue(null);
      await expect(FaqService.getFaqById("faq1")).rejects.toThrow("error.faqNotFound");
    });
  });

  describe("updateFaq", () => {
    it("should update faq successfully", async () => {
      const mockFaq = mockToJSON({ _id: "faq1", order: 1 });
      (Faq.findById as jest.Mock).mockResolvedValue(mockFaq);
      (Faq.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFaq);

      const result = await FaqService.updateFaq("faq1", { question: "Updated" }, "admin1");
      expect(Faq.findByIdAndUpdate).toHaveBeenCalledWith("faq1", expect.any(Object), { new: true });
      expect(result).toEqual({ _id: "faq1", order: 1 });
    });

    it("should shift order if updating to existing order", async () => {
      const mockFaq = mockToJSON({ _id: "faq1", order: 1 });
      (Faq.findById as jest.Mock).mockResolvedValue(mockFaq);
      (Faq.findOne as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });
      (Faq.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFaq);

      await FaqService.updateFaq("faq1", { order: 2 }, "admin1");
      expect(Faq.updateMany).toHaveBeenCalledWith({ order: { $gte: 2 }, _id: { $ne: "faq1" } }, { $inc: { order: 1 } });
    });
  });

  describe("updateFaqStatus", () => {
    it("should update status successfully", async () => {
      const mockFaq = mockToJSON({ _id: "faq1" });
      (Faq.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFaq);

      const result = await FaqService.updateFaqStatus("faq1", FaqStatus.INACTIVE, "admin1");
      expect(result).toEqual({ _id: "faq1" });
    });

    it("should throw error for invalid status", async () => {
      await expect(FaqService.updateFaqStatus("faq1", "INVALID" as any)).rejects.toThrow("error.invalidStatusValue");
    });
  });

  describe("deleteFaq", () => {
    it("should soft delete faq", async () => {
      const mockFaq = mockToJSON({ _id: "faq1" });
      (Faq.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockFaq);

      const result = await FaqService.deleteFaq("faq1", "admin1");
      expect(result).toEqual({ _id: "faq1" });
      expect(Faq.findByIdAndUpdate).toHaveBeenCalledWith("faq1", expect.objectContaining({ status: "DELETED" }), { new: true });
    });
  });
});
