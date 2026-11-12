import { Request, Response } from "express";
import { listTutorialSlides, getTutorialSlideById, createTutorialSlide, updateTutorialSlide, updateTutorialSlideStatus, getActiveTutorialSlides, deleteTutorialSlide } from "../../../../src/modules/admin/controllers/tutorial-slide.controller";
import { TutorialSlideService } from "../../../../src/modules/admin/services/tutorial-slide.service";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { SubAdminActivityHelper } from "../../../../src/modules/shared/helpers/subadmin-activity.helper";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Types } from "mongoose";

jest.mock("../../../../src/modules/admin/services/tutorial-slide.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/subadmin-activity.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("Admin TutorialSlide Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    (TutorialSlideService.formatListItem as jest.Mock).mockImplementation((slide: any) =>
      slide?.toJSON ? slide.toJSON() : slide
    );
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  /* =========================================================================
   * listTutorialSlides Tests
   * ========================================================================= */
  describe("listTutorialSlides", () => {
    it("[Positive] should list tutorial slides with filters and pagination successfully", async () => {
      mockReq = {
        query: {
          mediaType: "image",
          status: "active",
          search: "onboard",
          fromDate: "2026-01-01",
          toDate: "2026-12-31",
        },
      };
      const mockPagination = { page: 1, limit: 10, skip: 0, sort: { sequence: 1 } };
      const mockResult = { data: [{ _id: "1", title: "Slide 1" }], total: 1 };
      
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPagination);
      (TutorialSlideService.listSlides as jest.Mock).mockResolvedValue(mockResult);
      (TutorialSlideService.formatListItem as jest.Mock).mockImplementation((item) => item);

      await listTutorialSlides(mockReq as Request, mockRes as Response);

      expect(PaginationHelper.parseParams).toHaveBeenCalledWith(mockReq.query, expect.any(Array));
      expect(TutorialSlideService.listSlides).toHaveBeenCalledWith(
        mockPagination,
        {
          search: "onboard",
          mediaType: "image",
          status: "active",
          fromDate: "2026-01-01",
          toDate: "2026-12-31",
        }
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { ...mockResult, data: mockResult.data },
        "general.success",
        "en"
      );
    });

    it("[Positive] should handle empty query or 'all' filters", async () => {
      mockReq = {
        query: {
          mediaType: "all",
          status: "",
        },
      };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (TutorialSlideService.listSlides as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listTutorialSlides(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.listSlides).toHaveBeenCalledWith(
        {},
        {
          search: undefined,
          mediaType: undefined,
          status: undefined,
          fromDate: undefined,
          toDate: undefined,
        }
      );
    });

    it("[Edge] should return internal server error response if service throws error", async () => {
      mockReq = { query: {} };
      const error = new Error("Database failure");
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (TutorialSlideService.listSlides as jest.Mock).mockRejectedValue(error);

      await listTutorialSlides(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * getTutorialSlideById Tests
   * ========================================================================= */
  describe("getTutorialSlideById", () => {
    it("[Positive] should return tutorial slide data successfully if it exists", async () => {
      mockReq = { params: { slideId: "slide123" } };
      const mockSlide = { _id: "slide123", title: "Slide Title", toJSON: () => ({ _id: "slide123", title: "Slide Title" }) };
      (TutorialSlideService.getSlideById as jest.Mock).mockResolvedValue(mockSlide);

      await getTutorialSlideById(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.getSlideById).toHaveBeenCalledWith("slide123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockSlide.toJSON(),
        "general.success",
        "en"
      );
    });

    it("[Negative] should return 404 not found if tutorial slide does not exist", async () => {
      mockReq = { params: { slideId: "missing123" } };
      (TutorialSlideService.getSlideById as jest.Mock).mockResolvedValue(null);

      await getTutorialSlideById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, "tutorial_slide.not_found", "en");
    });

    it("[Edge] should return internal server error if service query fails", async () => {
      mockReq = { params: { slideId: "slide123" } };
      const error = new Error("DB Error");
      (TutorialSlideService.getSlideById as jest.Mock).mockRejectedValue(error);

      await getTutorialSlideById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * createTutorialSlide Tests
   * ========================================================================= */
  describe("createTutorialSlide", () => {
    it("[Positive] should successfully create tutorial slide and log activity", async () => {
      const mockActorId = new Types.ObjectId().toHexString();
      mockReq = {
        body: { title: "New Slide", description: "Body", mediaType: "image", image: "img.jpg", sequence: 1 },
        user: { sub: mockActorId, role: "admin" } as any,
        method: "POST",
        originalUrl: "/api/v1/admin/tutorial-slides",
        headers: { "user-agent": "jest" },
        socket: {} as any,
      };
      const mockCreatedSlide = { _id: "newslide123", title: "New Slide" };
      (TutorialSlideService.createSlide as jest.Mock).mockResolvedValue(mockCreatedSlide);

      await createTutorialSlide(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.createSlide).toHaveBeenCalledWith({
        title: "New Slide",
        description: "Body",
        mediaType: "image",
        image: "img.jpg",
        video: undefined,
        sequence: 1,
        status: undefined,
        createdBy: mockActorId,
      });
      expect(SubAdminActivityHelper.logActivity).toHaveBeenCalledWith({
        subAdminId: mockActorId,
        role: "admin",
        module: "TutorialSlide",
        action: "create",
        method: "POST",
        path: "/api/v1/admin/tutorial-slides",
        ipAddress: undefined,
        userAgent: "jest",
        statusCode: 201,
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockCreatedSlide,
        "tutorial_slide.created",
        "en",
        201
      );
    });

    it("[Edge] should return internal server error if service creation fails", async () => {
      mockReq = {
        body: {},
        user: { sub: "admin1" } as any,
        headers: {},
      };
      const error = new Error("Validation failed");
      (TutorialSlideService.createSlide as jest.Mock).mockRejectedValue(error);

      await createTutorialSlide(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * updateTutorialSlide Tests
   * ========================================================================= */
  describe("updateTutorialSlide", () => {
    it("[Positive] should update tutorial slide and log activity successfully", async () => {
      const mockActorId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { slideId: "slide123" },
        body: { title: "Updated Title" },
        user: { sub: mockActorId, role: "admin" } as any,
        method: "PUT",
        originalUrl: "/api/v1/admin/tutorial-slides/slide123",
        headers: { "user-agent": "jest" },
      };
      const mockUpdatedSlide = { _id: "slide123", title: "Updated Title" };
      (TutorialSlideService.updateSlide as jest.Mock).mockResolvedValue(mockUpdatedSlide);

      await updateTutorialSlide(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.updateSlide).toHaveBeenCalledWith("slide123", {
        title: "Updated Title",
        description: undefined,
        mediaType: undefined,
        image: undefined,
        video: undefined,
        sequence: undefined,
        status: undefined,
        updatedBy: mockActorId,
      });
      expect(SubAdminActivityHelper.logActivity).toHaveBeenCalledWith({
        subAdminId: mockActorId,
        role: "admin",
        module: "TutorialSlide",
        action: "edit",
        method: "PUT",
        path: "/api/v1/admin/tutorial-slides/slide123",
        ipAddress: undefined,
        userAgent: "jest",
        statusCode: 200,
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockUpdatedSlide,
        "tutorial_slide.updated",
        "en"
      );
    });

    it("[Negative] should return 404 if slide to update is not found", async () => {
      mockReq = {
        params: { slideId: "missing123" },
        body: {},
        user: { sub: "admin1" } as any,
        headers: {},
      };
      (TutorialSlideService.updateSlide as jest.Mock).mockResolvedValue(null);

      await updateTutorialSlide(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, "tutorial_slide.not_found", "en");
    });

    it("[Edge] should return internal server error if service update throws", async () => {
      mockReq = {
        params: { slideId: "slide123" },
        body: {},
        user: { sub: "admin1" } as any,
        headers: {},
      };
      const error = new Error("DB Connection Lost");
      (TutorialSlideService.updateSlide as jest.Mock).mockRejectedValue(error);

      await updateTutorialSlide(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * updateTutorialSlideStatus Tests
   * ========================================================================= */
  describe("updateTutorialSlideStatus", () => {
    it("[Positive] should toggle status successfully and log activity", async () => {
      const mockActorId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { slideId: "slide123" },
        body: { status: "inactive" },
        user: { sub: mockActorId, role: "admin" } as any,
        method: "PATCH",
        originalUrl: "/api/v1/admin/tutorial-slides/slide123/status",
        headers: { "user-agent": "jest" },
      };
      const mockUpdatedSlide = { _id: "slide123", status: "inactive" };
      (TutorialSlideService.updateSlideStatus as jest.Mock).mockResolvedValue(mockUpdatedSlide);

      await updateTutorialSlideStatus(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.updateSlideStatus).toHaveBeenCalledWith("slide123", "inactive", mockActorId);
      expect(SubAdminActivityHelper.logActivity).toHaveBeenCalledWith({
        subAdminId: mockActorId,
        role: "admin",
        module: "TutorialSlide",
        action: "edit",
        method: "PATCH",
        path: "/api/v1/admin/tutorial-slides/slide123/status",
        ipAddress: undefined,
        userAgent: "jest",
        statusCode: 200,
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockUpdatedSlide,
        "tutorial_slide.status_updated",
        "en"
      );
    });

    it("[Negative] should return 404 if slide is not found during status toggle", async () => {
      mockReq = {
        params: { slideId: "missing123" },
        body: { status: "active" },
        user: { sub: "admin1" } as any,
        headers: {},
      };
      (TutorialSlideService.updateSlideStatus as jest.Mock).mockResolvedValue(null);

      await updateTutorialSlideStatus(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, "tutorial_slide.not_found", "en");
    });

    it("[Edge] should return internal server error if service toggle fails", async () => {
      mockReq = {
        params: { slideId: "slide123" },
        body: { status: "active" },
        user: { sub: "admin1" } as any,
        headers: {},
      };
      const error = new Error("Toggle error");
      (TutorialSlideService.updateSlideStatus as jest.Mock).mockRejectedValue(error);

      await updateTutorialSlideStatus(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * getActiveTutorialSlides Tests
   * ========================================================================= */
  describe("getActiveTutorialSlides", () => {
    it("[Positive] should get and format all active slides successfully", async () => {
      mockReq = {};
      const mockActiveSlides = [{ _id: "1", title: "Welcome" }];
      (TutorialSlideService.getActiveSlides as jest.Mock).mockResolvedValue(mockActiveSlides);
      (TutorialSlideService.formatListItem as jest.Mock).mockImplementation((item) => item);

      await getActiveTutorialSlides(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.getActiveSlides).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        mockActiveSlides,
        "general.success",
        "en"
      );
    });

    it("[Edge] should return internal server error if active query fails", async () => {
      mockReq = {};
      const error = new Error("Find error");
      (TutorialSlideService.getActiveSlides as jest.Mock).mockRejectedValue(error);

      await getActiveTutorialSlides(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });

  /* =========================================================================
   * deleteTutorialSlide Tests
   * ========================================================================= */
  describe("deleteTutorialSlide", () => {
    it("[Positive] should delete tutorial slide and log activity successfully", async () => {
      const mockActorId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { slideId: "slide123" },
        user: { sub: mockActorId, role: "admin" } as any,
        method: "DELETE",
        originalUrl: "/api/v1/admin/tutorial-slides/slide123",
        headers: { "user-agent": "jest" },
      };
      (TutorialSlideService.deleteSlide as jest.Mock).mockResolvedValue(true);

      await deleteTutorialSlide(mockReq as Request, mockRes as Response);

      expect(TutorialSlideService.deleteSlide).toHaveBeenCalledWith("slide123");
      expect(SubAdminActivityHelper.logActivity).toHaveBeenCalledWith({
        subAdminId: mockActorId,
        role: "admin",
        module: "TutorialSlide",
        action: "delete",
        method: "DELETE",
        path: "/api/v1/admin/tutorial-slides/slide123",
        ipAddress: undefined,
        userAgent: "jest",
        statusCode: 200,
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { message: "Tutorial slide deleted successfully" },
        "tutorial_slide.deleted",
        "en"
      );
    });

    it("[Negative] should return 404 if delete slide service throws not found error", async () => {
      mockReq = {
        params: { slideId: "missing123" },
        user: { sub: "admin1" } as any,
        headers: {},
      };
      (TutorialSlideService.deleteSlide as jest.Mock).mockRejectedValue(new Error("tutorial_slide.not_found"));

      await deleteTutorialSlide(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, "tutorial_slide.not_found", "en");
    });

    it("[Edge] should return 500 error if delete slide service throws general error", async () => {
      mockReq = {
        params: { slideId: "slide123" },
        user: { sub: "admin1" } as any,
        headers: {},
      };
      const error = new Error("DB Error during delete");
      (TutorialSlideService.deleteSlide as jest.Mock).mockRejectedValue(error);

      await deleteTutorialSlide(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });
  });
});
