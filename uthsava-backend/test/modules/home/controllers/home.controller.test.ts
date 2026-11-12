/// <reference types="jest" />
import { Request, Response } from 'express';
import { homeController } from '../../../../src/modules/home/controllers/home.controller';
import { homeService } from '../../../../src/modules/home/services/home.service';
import { ResponseHandler } from '../../../../src/common/responses/response.handler';
import { getLanguage } from '../../../../src/modules/shared/helpers/language.helper';
import { extractProfileId } from '../../../../src/modules/shared/helpers/profile.helper';

jest.mock('../../../../src/modules/home/services/home.service');
jest.mock('../../../../src/common/responses/response.handler');
jest.mock('../../../../src/modules/shared/helpers/language.helper', () => ({
  getLanguage: jest.fn().mockReturnValue('en'),
}));
jest.mock('../../../../src/modules/shared/helpers/profile.helper', () => ({
  extractProfileId: jest.fn().mockReturnValue('profile123'),
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (
  params: any = {},
  query: any = {},
  body: any = {},
  user: any = undefined,
  headers: any = {}
) => {
  return {
    params,
    query,
    body,
    user,
    headers,
  } as unknown as Request;
};

describe('HomeController Unit Tests', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  /* =========================================================================
   * getHomeScreen Tests
   * ========================================================================= */
  describe('getHomeScreen', () => {
    it('[Positive] should return home screen data successfully for authenticated user', async () => {
      req = mockRequest({}, { category: 'ALL', genreId: 'genre123' }, {}, { sub: 'user123' });
      const mockHomeData = {
        header: { greeting: 'Welcome', displayName: 'John' },
        heroBanner: [],
        rails: {},
      };
      (homeService.getHomeScreenData as jest.Mock).mockResolvedValue(mockHomeData);

      await homeController.getHomeScreen(req, res);

      expect(getLanguage).toHaveBeenCalledWith(req);
      expect(extractProfileId).toHaveBeenCalledWith(req);
      expect(homeService.getHomeScreenData).toHaveBeenCalledWith('user123', 'profile123', 'ALL', 'genre123');
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockHomeData,
        'home.dataRetrievedSuccess',
        'en'
      );
    });

    it('[Edge/Validation] should default category to ALL when omitted in query', async () => {
      req = mockRequest({}, {}, {}, { sub: 'user123' });
      (homeService.getHomeScreenData as jest.Mock).mockResolvedValue({});

      await homeController.getHomeScreen(req, res);

      expect(homeService.getHomeScreenData).toHaveBeenCalledWith('user123', 'profile123', 'ALL', undefined);
    });

    it('[Negative] should return 401 unauthorized when user sub is missing', async () => {
      req = mockRequest({}, {}, {}, undefined);

      await homeController.getHomeScreen(req, res);

      expect(ResponseHandler.unauthorized).toHaveBeenCalledWith(res, 'auth.unauthorized', 'en');
      expect(homeService.getHomeScreenData).not.toHaveBeenCalled();
    });

    it('[Negative] should return 404 notFound when profile is not found', async () => {
      req = mockRequest({}, {}, {}, { sub: 'user123' });
      (homeService.getHomeScreenData as jest.Mock).mockRejectedValue(new Error('PROFILE_NOT_FOUND'));

      await homeController.getHomeScreen(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, 'home.profileNotFound', 'en');
    });

    it('[Negative] should return 500 error when homeService throws unexpected error', async () => {
      req = mockRequest({}, {}, {}, { sub: 'user123' });
      const dbError = new Error('Database connection failed');
      (homeService.getHomeScreenData as jest.Mock).mockRejectedValue(dbError);

      await homeController.getHomeScreen(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, 'home.loadError', 'en', 500, dbError);
    });
  });

  /* =========================================================================
   * getContentByGenre Tests
   * ========================================================================= */
  describe('getContentByGenre', () => {
    it('[Positive] should return contents filtered by genreId from route params', async () => {
      req = mockRequest(
        { genreId: 'genre123' },
        { type: 'MOVIE', page: '2', limit: '10', sortBy: 'title', sortOrder: 'asc' },
        {}
      );
      const mockGenreData = {
        genre: { id: 'genre123', name: 'Action' },
        items: [],
        pagination: { total: 0, page: 2, limit: 10, totalPages: 1 },
      };
      (homeService.getContentByGenre as jest.Mock).mockResolvedValue(mockGenreData);

      await homeController.getContentByGenre(req, res);

      expect(homeService.getContentByGenre).toHaveBeenCalledWith('genre123', {
        type: 'MOVIE',
        profileId: 'profile123',
        page: 2,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockGenreData,
        'genre.contentRetrieved',
        'en'
      );
    });

    it('[Positive/Edge] should extract genre identifier from query.genreId or query.genre if route param is omitted', async () => {
      req = mockRequest({}, { genreId: 'genreFromQuery' }, {});
      (homeService.getContentByGenre as jest.Mock).mockResolvedValue({ items: [] });

      await homeController.getContentByGenre(req, res);

      expect(homeService.getContentByGenre).toHaveBeenCalledWith('genreFromQuery', expect.any(Object));
    });

    it('[Validation] should default page, limit, and sortOrder correctly when omitted or invalid', async () => {
      req = mockRequest({}, { genre: 'action', page: 'invalid', limit: 'notanumber', sortOrder: 'UNKNOWN' }, {});
      (homeService.getContentByGenre as jest.Mock).mockResolvedValue({ items: [] });

      await homeController.getContentByGenre(req, res);

      expect(homeService.getContentByGenre).toHaveBeenCalledWith('action', {
        type: undefined,
        profileId: 'profile123',
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortOrder: 'desc',
      });
    });

    it('[Validation/Negative] should return 400 badRequest when genre identifier is missing', async () => {
      req = mockRequest({}, {}, {});

      await homeController.getContentByGenre(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, 'auth.genreNotFound', 'en');
      expect(homeService.getContentByGenre).not.toHaveBeenCalled();
    });

    it('[Negative] should return 404 notFound when genre is not found in DB', async () => {
      req = mockRequest({ genreId: 'nonexistent' }, {}, {});
      (homeService.getContentByGenre as jest.Mock).mockRejectedValue(new Error('GENRE_NOT_FOUND'));

      await homeController.getContentByGenre(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, 'genre.notFound', 'en');
    });

    it('[Negative] should return 500 error when homeService throws unexpected error', async () => {
      req = mockRequest({ genreId: 'genre123' }, {}, {});
      const error = new Error('Unexpected service failure');
      (homeService.getContentByGenre as jest.Mock).mockRejectedValue(error);

      await homeController.getContentByGenre(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, 'general.error', 'en', 500, error);
    });
  });
});
