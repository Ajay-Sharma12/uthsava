/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listContents,
  getContentById,
  getProducerRejectedContent,
  createContent,
  updateContent,
  deleteContent,
  updateContentStatus,
  listSeasons,
  createSeason,
  getSeason,
  updateSeason,
  deleteSeason,
  listEpisodes,
  createEpisode,
  getEpisode,
  updateEpisode,
  deleteEpisode,
  getVideoDuration,
} from "../../../../src/modules/admin/controllers/content.controller";
import { ContentService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/content.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";
import { AuditLogService } from "../../../../src/modules/admin/services/audit-log.service";

// Mock Services, Helpers, and Winston Logger
jest.mock("../../../../src/modules/admin/services/content.service");
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

// Mock fluent-ffmpeg to support auto-duration testing offline
jest.mock("fluent-ffmpeg", () => {
  const mockFfprobe = jest.fn((url, cb) => cb(null, { format: { duration: 120 } }));
  return {
    ffprobe: mockFfprobe,
    setFfprobePath: jest.fn(),
    default: jest.fn(),
  };
});

// Helper to mock Express Response
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
};

// Helper to mock Express Request
const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = undefined) => {
  return {
    query,
    params,
    body,
    user,
  } as unknown as Request;
};

describe("Content Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ==========================================
  // listContents Test Cases
  // ==========================================
  describe("listContents", () => {
    it("should return paginated list of contents", async () => {
      // Positive Case: Get contents with standard query parameters
      req = mockRequest({ page: "1", limit: "10", type: "movie", status: "ACTIVE", isActive: "true" });
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], pagination: {}, counts: {} };
      (ContentService.listContents as jest.Mock).mockResolvedValue(mockResult);

      await listContents(req, res);

      expect(ContentService.listContents).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should list contents for a producer user role (filter by producer)", async () => {
      // Edge Case: Producer user request should filter content uploaded by the producer
      req = mockRequest(
        { page: "1", limit: "10", type: "movie" },
        {},
        {},
        { sub: "65c2a11b6d9154a1d48c8b66", role: "producer" }
      );
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      const mockResult = { data: [], pagination: {}, counts: {} };
      (ContentService.listContents as jest.Mock).mockResolvedValue(mockResult);

      await listContents(req, res);

      expect(ContentService.listContents).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle error", async () => {
      // Negative Case: Handle service exception/database failure gracefully
      req = mockRequest();
      (ContentService.listContents as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await listContents(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getContentById Test Cases
  // ==========================================
  describe("getContentById", () => {
    it("should return content successfully", async () => {
      // Positive Case: Retrieve content by a valid ID
      req = mockRequest({}, { contentId: "1" });
      const mockContent = { _id: "1", title: "Test Content" };
      (ContentService.getContentById as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await getContentById(req, res);

      expect(ContentService.getContentById).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { content: mockContent },
        "content.retrieved",
        "en"
      );
    });

    it("should handle not found error", async () => {
      // Negative Case: Retrieve content by an ID that does not exist
      req = mockRequest({}, { contentId: "1" });
      (ContentService.getContentById as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND));

      await getContentById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "content.not_found",
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });

    it("should handle validation error when ID is invalid", async () => {
      // Validation Case: Retrieve content by an invalid format ID
      req = mockRequest({}, { contentId: "invalid-id" });
      (ContentService.getContentById as jest.Mock).mockRejectedValue(new Error("Invalid ID format"));

      await getContentById(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getProducerRejectedContent Test Cases
  // ==========================================
  describe("getProducerRejectedContent", () => {
    it("should return producer rejected content successfully", async () => {
      // Positive Case: Get rejected content for an authenticated producer
      req = mockRequest({ page: "1", limit: "10", search: "test" }, {}, {}, { sub: "65c2a11b6d9154a1d48c8b66", role: "producer" });
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      const mockResult = { data: [], pagination: {} };
      (ContentService.listContents as jest.Mock).mockResolvedValue(mockResult);

      await getProducerRejectedContent(req, res);

      expect(ContentService.listContents).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle unauthorized access if no user in request", async () => {
      // Negative Case: Access rejected content without authorization token
      req = mockRequest();
      await getProducerRejectedContent(req, res);
      expect(ResponseHandler.unauthorized).toHaveBeenCalled();
    });

    it("should handle server error", async () => {
      // Negative Case: Database failure during fetch
      req = mockRequest({}, {}, {}, { sub: "65c2a11b6d9154a1d48c8b66" });
      (ContentService.listContents as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getProducerRejectedContent(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // createContent Test Cases
  // ==========================================
  describe("createContent", () => {
    it("should create content successfully", async () => {
      // Positive Case: Create content with valid payload
      req = mockRequest({}, {}, { title: "New Content" }, { sub: "admin1", role: "admin" });
      const mockContent = { _id: "1", title: "New Content" };
      (ContentService.createContent as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await createContent(req, res);

      expect(ContentService.createContent).toHaveBeenCalledWith(req.body, "admin1", "admin");
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { content: mockContent },
        "content.created",
        "en",
        HTTP_STATUS.CREATED
      );
    });

    it("should calculate duration automatically for a movie if not provided", async () => {
      // Edge Case: Auto-retrieve duration via ffprobe for MOVIE when duration is 0/missing
      req = mockRequest(
        {},
        {},
        { title: "Movie Content", type: "MOVIE", mainVideo: "some-key.mp4" },
        { sub: "admin1", role: "admin" }
      );
      const mockContent = { _id: "1", title: "Movie Content", duration: 2 };
      (ContentService.createContent as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await createContent(req, res);

      expect(ContentService.createContent).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle error when body validation or creation fails with Invalid", async () => {
      // Validation Case: Payload violates schema validations
      req = mockRequest({}, {}, { title: "New Content" }, { sub: "admin1", role: "admin" });
      (ContentService.createContent as jest.Mock).mockRejectedValue(new Error("Invalid content data"));

      await createContent(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle general error during creation", async () => {
      // Negative Case: Internal server error on creation
      req = mockRequest({}, {}, { title: "New Content" }, { sub: "admin1", role: "admin" });
      (ContentService.createContent as jest.Mock).mockRejectedValue(new Error("DB Connection Error"));

      await createContent(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // updateContent Test Cases
  // ==========================================
  describe("updateContent", () => {
    it("should update content successfully", async () => {
      // Positive Case: Update content attributes with valid body
      req = mockRequest({}, { contentId: "1" }, { title: "Updated Content" }, { sub: "admin1" });
      const mockContent = { _id: "1", title: "Updated Content" };
      (ContentService.updateContent as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await updateContent(req, res);

      expect(ContentService.updateContent).toHaveBeenCalledWith("1", req.body);
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle content not found error on update", async () => {
      // Negative Case: Update a content item that does not exist
      req = mockRequest({}, { contentId: "1" }, { title: "Updated Content" }, { sub: "admin1" });
      (ContentService.updateContent as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND));

      await updateContent(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });

    it("should handle validation error on update", async () => {
      // Validation Case: Validation failed for fields during update
      req = mockRequest({}, { contentId: "1" }, { title: "Updated Content" }, { sub: "admin1" });
      (ContentService.updateContent as jest.Mock).mockRejectedValue(new Error("Invalid field value"));

      await updateContent(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // deleteContent Test Cases
  // ==========================================
  describe("deleteContent", () => {
    it("should delete content successfully", async () => {
      // Positive Case: Delete content by valid ID
      req = mockRequest({}, { contentId: "1" }, {}, { sub: "admin1" });
      (ContentService.deleteContent as jest.Mock).mockResolvedValue(true);

      await deleteContent(req, res);

      expect(ContentService.deleteContent).toHaveBeenCalledWith("1");
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error on delete", async () => {
      // Negative Case: Delete content that does not exist
      req = mockRequest({}, { contentId: "1" });
      (ContentService.deleteContent as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND));

      await deleteContent(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });

    it("should handle validation error on delete", async () => {
      // Validation Case: Invalid ID structure on deletion
      req = mockRequest({}, { contentId: "invalid-id" });
      (ContentService.deleteContent as jest.Mock).mockRejectedValue(new Error("Invalid ID format"));

      await deleteContent(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // updateContentStatus Test Cases
  // ==========================================
  describe("updateContentStatus", () => {
    it("should update content status successfully", async () => {
      // Positive Case: Update status and toggling active state
      req = mockRequest({}, { contentId: "1" }, { status: "ACTIVE", isActive: true }, { sub: "admin1" });
      const mockContent = { _id: "1", status: "ACTIVE" };
      (ContentService.updateContentStatus as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await updateContentStatus(req, res);

      expect(ContentService.updateContentStatus).toHaveBeenCalledWith("1", true);
      expect(AuditLogService.logAction).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should toggle isActive based on status = ACTIVE when isActive body is undefined", async () => {
      // Edge Case: Auto-evaluate isActive state when only status is passed
      req = mockRequest({}, { contentId: "1" }, { status: "ACTIVE" }, { sub: "admin1" });
      const mockContent = { _id: "1", status: "ACTIVE" };
      (ContentService.updateContentStatus as jest.Mock).mockResolvedValue(mockContent);
      (ContentService.sanitizeContent as jest.Mock).mockReturnValue(mockContent);

      await updateContentStatus(req, res);

      expect(ContentService.updateContentStatus).toHaveBeenCalledWith("1", true);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error on status update", async () => {
      // Negative Case: Update status for non-existent content
      req = mockRequest({}, { contentId: "1" }, { status: "ACTIVE" });
      (ContentService.updateContentStatus as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND));

      await updateContentStatus(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  // ==========================================
  // listSeasons Test Cases
  // ==========================================
  describe("listSeasons", () => {
    it("should list seasons successfully", async () => {
      // Positive Case: Retrieve all seasons for series content
      req = mockRequest({}, { contentId: "1" });
      const mockSeasons = [{ _id: "season1", seasonNumber: 1 }];
      (ContentService.listSeasons as jest.Mock).mockResolvedValue(mockSeasons);

      await listSeasons(req, res);

      expect(ContentService.listSeasons).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle only series can have seasons error", async () => {
      // Negative Case: Attempting to retrieve seasons for a Movie
      req = mockRequest({}, { contentId: "1" });
      (ContentService.listSeasons as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.ONLY_SERIES_CAN_HAVE_SEASONS));

      await listSeasons(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "error.only_series_can_have_seasons", "en", HTTP_STATUS.BAD_REQUEST);
    });

    it("should handle content not found error", async () => {
      // Negative Case: Retrieve seasons of non-existent content
      req = mockRequest({}, { contentId: "1" });
      (ContentService.listSeasons as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.CONTENT_NOT_FOUND));

      await listSeasons(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  // ==========================================
  // createSeason Test Cases
  // ==========================================
  describe("createSeason", () => {
    it("should create season successfully", async () => {
      // Positive Case: Create season with unique number
      req = mockRequest({}, { contentId: "1" }, { seasonNumber: 2 });
      const mockSeason = { _id: "season2", seasonNumber: 2 };
      (ContentService.createSeason as jest.Mock).mockResolvedValue(mockSeason);

      await createSeason(req, res);

      expect(ContentService.createSeason).toHaveBeenCalledWith("1", req.body);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle season exists error", async () => {
      // Negative Case / Validation: Duplicate season creation attempt
      req = mockRequest({}, { contentId: "1" }, { seasonNumber: 2 });
      (ContentService.createSeason as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SEASON_EXISTS));

      await createSeason(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getSeason Test Cases
  // ==========================================
  describe("getSeason", () => {
    it("should get season by ID successfully", async () => {
      // Positive Case: Fetch specific season detail
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      const mockSeason = { _id: "2", seasonNumber: 1 };
      (ContentService.getSeasonById as jest.Mock).mockResolvedValue(mockSeason);

      await getSeason(req, res);

      expect(ContentService.getSeasonById).toHaveBeenCalledWith("1", "2");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle season not found error", async () => {
      // Negative Case: Season ID does not exist
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      (ContentService.getSeasonById as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SEASON_NOT_FOUND));

      await getSeason(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "season.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  // ==========================================
  // updateSeason Test Cases
  // ==========================================
  describe("updateSeason", () => {
    it("should update season successfully", async () => {
      // Positive Case: Update season number or description
      req = mockRequest({}, { contentId: "1", seasonId: "2" }, { seasonNumber: 3 });
      const mockSeason = { _id: "2", seasonNumber: 3 };
      (ContentService.updateSeason as jest.Mock).mockResolvedValue(mockSeason);

      await updateSeason(req, res);

      expect(ContentService.updateSeason).toHaveBeenCalledWith("1", "2", req.body);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle season exists error on update", async () => {
      // Validation Case: Attempt to update season to an already existing number
      req = mockRequest({}, { contentId: "1", seasonId: "2" }, { seasonNumber: 3 });
      (ContentService.updateSeason as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SEASON_EXISTS));

      await updateSeason(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // deleteSeason Test Cases
  // ==========================================
  describe("deleteSeason", () => {
    it("should delete season successfully", async () => {
      // Positive Case: Delete specific season
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      (ContentService.deleteSeason as jest.Mock).mockResolvedValue(true);

      await deleteSeason(req, res);

      expect(ContentService.deleteSeason).toHaveBeenCalledWith("1", "2");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle season not found error on delete", async () => {
      // Negative Case: Delete non-existent season
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      (ContentService.deleteSeason as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SEASON_NOT_FOUND));

      await deleteSeason(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // listEpisodes Test Cases
  // ==========================================
  describe("listEpisodes", () => {
    it("should list episodes successfully", async () => {
      // Positive Case: Retrieve episodes for a valid season
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      const mockEpisodes = [{ _id: "ep1", episodeNumber: 1 }];
      (ContentService.listEpisodes as jest.Mock).mockResolvedValue(mockEpisodes);

      await listEpisodes(req, res);

      expect(ContentService.listEpisodes).toHaveBeenCalledWith("1", "2");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle season not found error when listing episodes", async () => {
      // Negative Case: Retrieve episodes for invalid/non-existent season
      req = mockRequest({}, { contentId: "1", seasonId: "2" });
      (ContentService.listEpisodes as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SEASON_NOT_FOUND));

      await listEpisodes(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "season.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  // ==========================================
  // createEpisode Test Cases
  // ==========================================
  describe("createEpisode", () => {
    it("should create episode successfully", async () => {
      // Positive Case: Create episode with explicit duration
      req = mockRequest({}, { contentId: "1", seasonId: "2" }, { episodeNumber: 1, duration: 45 });
      const mockEpisode = { _id: "ep1", episodeNumber: 1 };
      (ContentService.createEpisode as jest.Mock).mockResolvedValue(mockEpisode);

      await createEpisode(req, res);

      expect(ContentService.createEpisode).toHaveBeenCalledWith("1", "2", req.body);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should auto-fetch duration if not provided but videoFile exists", async () => {
      // Edge Case: Retrieve duration via ffprobe when not explicitly provided
      req = mockRequest({}, { contentId: "1", seasonId: "2" }, { episodeNumber: 1, videoFile: "ep1.mp4" });
      const mockEpisode = { _id: "ep1", episodeNumber: 1, duration: 2 };
      (ContentService.createEpisode as jest.Mock).mockResolvedValue(mockEpisode);

      await createEpisode(req, res);

      expect(ContentService.createEpisode).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle episode exists error", async () => {
      // Negative Case: Create duplicate episode number in the same season
      req = mockRequest({}, { contentId: "1", seasonId: "2" }, { episodeNumber: 1 });
      (ContentService.createEpisode as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EPISODE_EXISTS));

      await createEpisode(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getEpisode Test Cases
  // ==========================================
  describe("getEpisode", () => {
    it("should get episode by ID successfully", async () => {
      // Positive Case: Get specific episode details
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" });
      const mockEpisode = { _id: "3", episodeNumber: 1 };
      (ContentService.getEpisodeById as jest.Mock).mockResolvedValue(mockEpisode);

      await getEpisode(req, res);

      expect(ContentService.getEpisodeById).toHaveBeenCalledWith("1", "2", "3");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle episode not found error", async () => {
      // Negative Case: Retrieve non-existent episode ID
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" });
      (ContentService.getEpisodeById as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EPISODE_NOT_FOUND));

      await getEpisode(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "episode.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  // ==========================================
  // updateEpisode Test Cases
  // ==========================================
  describe("updateEpisode", () => {
    it("should update episode successfully", async () => {
      // Positive Case: Update fields of an episode
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" }, { title: "New Title" });
      const mockEpisode = { _id: "3", title: "New Title" };
      (ContentService.updateEpisode as jest.Mock).mockResolvedValue(mockEpisode);

      await updateEpisode(req, res);

      expect(ContentService.updateEpisode).toHaveBeenCalledWith("1", "2", "3", req.body);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle episode exists error on update", async () => {
      // Validation Case: Try to update to an episode number that is already used
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" }, { episodeNumber: 2 });
      (ContentService.updateEpisode as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EPISODE_EXISTS));

      await updateEpisode(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  // ==========================================
  // deleteEpisode Test Cases
  // ==========================================
  describe("deleteEpisode", () => {
    it("should delete episode successfully", async () => {
      // Positive Case: Delete specific episode
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" });
      (ContentService.deleteEpisode as jest.Mock).mockResolvedValue(true);

      await deleteEpisode(req, res);

      expect(ContentService.deleteEpisode).toHaveBeenCalledWith("1", "2", "3");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle episode not found error on delete", async () => {
      // Negative Case: Delete non-existent episode ID
      req = mockRequest({}, { contentId: "1", seasonId: "2", episodeId: "3" });
      (ContentService.deleteEpisode as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EPISODE_NOT_FOUND));

      await deleteEpisode(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getVideoDuration Test Cases
  // ==========================================
  describe("getVideoDuration", () => {
    it("should get video duration successfully", async () => {
      // Positive Case: Get duration of a video by S3/CloudFront key
      req = mockRequest({}, {}, { videoKey: "some-video-key.mp4" });

      await getVideoDuration(req, res);

      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle validation error if videoKey is missing", async () => {
      // Validation Case: Send request without videoKey
      req = mockRequest({}, {}, {});

      await getVideoDuration(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });

    it("should handle EACCES error from ffprobe", async () => {
      // Edge Case: Handle local system permission issue (EACCES) gracefully
      req = mockRequest({}, {}, { videoKey: "some-video-key.mp4" });
      const err = new Error("Permission denied") as any;
      err.code = "EACCES";
      jest.spyOn(require("fluent-ffmpeg"), "ffprobe").mockImplementationOnce((url: any, cb: any) => {
        cb(err);
      });

      await getVideoDuration(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.ffprobe_permission_error", "en", HTTP_STATUS.INTERNAL_SERVER_ERROR, err);
    });

    it("should handle ENOTFOUND error from ffprobe", async () => {
      // Negative Case: Handle URL/file resolution issue (ENOTFOUND) gracefully
      req = mockRequest({}, {}, { videoKey: "some-video-key.mp4" });
      const err = new Error("Not found") as any;
      err.code = "ENOTFOUND";
      jest.spyOn(require("fluent-ffmpeg"), "ffprobe").mockImplementationOnce((url: any, cb: any) => {
        cb(err);
      });

      await getVideoDuration(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.video_url_not_accessible", "en", HTTP_STATUS.BAD_REQUEST, err);
    });

    it("should handle ETIMEDOUT error from ffprobe", async () => {
      // Edge Case: Handle network timeouts (ETIMEDOUT) gracefully
      req = mockRequest({}, {}, { videoKey: "some-video-key.mp4" });
      const err = new Error("Timed out") as any;
      err.code = "ETIMEDOUT";
      jest.spyOn(require("fluent-ffmpeg"), "ffprobe").mockImplementationOnce((url: any, cb: any) => {
        cb(err);
      });

      await getVideoDuration(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "content.video_duration_timeout", "en", HTTP_STATUS.SERVICE_UNAVAILABLE, err);
    });

    it("should handle generic unknown error from ffprobe", async () => {
      // Negative Case: Handle generic/unknown error from ffprobe
      req = mockRequest({}, {}, { videoKey: "some-video-key.mp4" });
      const err = new Error("Unknown probe error");
      jest.spyOn(require("fluent-ffmpeg"), "ffprobe").mockImplementationOnce((url: any, cb: any) => {
        cb(err);
      });

      await getVideoDuration(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "general.error", "en", HTTP_STATUS.INTERNAL_SERVER_ERROR, err);
    });

    it("should use videoKey directly if it is already a full HTTP URL", async () => {
      // Edge Case: Handle a videoKey that starts with http/https prefix
      req = mockRequest({}, {}, { videoKey: "https://example.com/movie.mp4" });
      const spy = jest.spyOn(require("fluent-ffmpeg"), "ffprobe").mockImplementationOnce((url: any, cb: any) => {
        cb(null, { format: { duration: 180 } });
      });

      await getVideoDuration(req, res);

      expect(spy).toHaveBeenCalledWith("https://example.com/movie.mp4", expect.any(Function));
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { duration: 180 },
        "duration.fetched",
        "en"
      );
    });
  });
});

