/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listProducers,
  getProducerById,
  createProducer,
  updateProducer,
  updateProducerStatus,
  deleteProducer,
} from "../../../../src/modules/admin/controllers/producer.controller";
import { ProducerService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/producer.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";
import { AuditLogService } from "../../../../src/modules/admin/services/audit-log.service";

jest.mock("../../../../src/modules/admin/services/producer.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock("../../../../src/modules/admin/services/audit-log.service");

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = undefined) => {
  return {
    query,
    params,
    body,
    user,
  } as unknown as Request;
};

describe("Producer Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("listProducers", () => {
    it("should list producers with pagination", async () => {
      req = mockRequest({ page: "1", limit: "10" });
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], pagination: {}, counts: {} };
      (ProducerService.listProducers as jest.Mock).mockResolvedValue(mockResult);

      await listProducers(req, res);

      expect(ProducerService.listProducers).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getProducerById", () => {
    it("should return producer successfully", async () => {
      req = mockRequest({}, { producerId: "1" });
      const mockItem = { _id: "1", email: "prod@example.com" };
      (ProducerService.getProducerById as jest.Mock).mockResolvedValue(mockItem);

      await getProducerById(req, res);

      expect(ProducerService.getProducerById).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error", async () => {
      req = mockRequest({}, { producerId: "1" });
      (ProducerService.getProducerById as jest.Mock).mockResolvedValue(null);

      await getProducerById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "producer.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });
  });

  describe("createProducer", () => {
    it("should create producer successfully", async () => {
      req = mockRequest({}, {}, { email: "new@example.com", password: "password" }, { sub: "admin1" });
      const mockItem = { _id: "1", email: "new@example.com" };
      (ProducerService.createProducer as jest.Mock).mockResolvedValue(mockItem);

      await createProducer(req, res);

      expect(ProducerService.createProducer).toHaveBeenCalled();
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle email exists error", async () => {
      req = mockRequest({}, {}, { email: "exist@example.com" }, { sub: "admin1" });
      (ProducerService.createProducer as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EMAIL_EXISTS));

      await createProducer(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  describe("updateProducer", () => {
    it("should update producer successfully", async () => {
      req = mockRequest({}, { producerId: "1" }, { email: "updated@example.com" }, { sub: "admin1" });
      const mockItem = { _id: "1", email: "updated@example.com" };
      (ProducerService.updateProducer as jest.Mock).mockResolvedValue(mockItem);

      await updateProducer(req, res);

      expect(ProducerService.updateProducer).toHaveBeenCalledWith("1", req.body);
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("updateProducerStatus", () => {
    it("should update status successfully", async () => {
      req = mockRequest({}, { producerId: "1" }, { status: "ACTIVE" }, { sub: "admin1" });
      const mockItem = { _id: "1", status: "ACTIVE" };
      (ProducerService.updateProducer as jest.Mock).mockResolvedValue(mockItem);

      await updateProducerStatus(req, res);

      expect(ProducerService.updateProducer).toHaveBeenCalledWith("1", { status: "ACTIVE", lastModifiedBy: "admin1" });
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("deleteProducer", () => {
    it("should delete producer successfully", async () => {
      req = mockRequest({}, { producerId: "1" }, {}, { sub: "admin1" });
      (ProducerService.deleteProducer as jest.Mock).mockResolvedValue(true);

      await deleteProducer(req, res);

      expect(ProducerService.deleteProducer).toHaveBeenCalledWith("1");
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });
});
