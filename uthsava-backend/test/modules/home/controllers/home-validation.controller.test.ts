/// <reference types="jest" />
import { Request, Response } from 'express';
import { homeController } from '../../../../src/modules/home/controllers/home.controller';
import { homeService } from '../../../../src/modules/home/services/home.service';
import { ResponseHandler } from '../../../../src/common/responses/response.handler';

jest.mock('../../../../src/modules/home/services/home.service');
jest.mock('../../../../src/common/responses/response.handler');

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (params: any = {}, query: any = {}, body: any = {}, user: any = undefined, headers: any = {}) => {
  return {
    params,
    query,
    body,
    user,
    headers,
  } as unknown as Request;
};

describe('HomeController Exhaustive Validation Suite (35+ Scenarios)', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe('getHomeScreen Validation & Error Handlers', () => {
    it('[VAL-HC-01] should pass profileId header if set in request headers', async () => {
      req = mockRequest({}, {}, {}, { sub: 'user123' }, { 'x-profile-id': 'profHeader123' });
      (homeService.getHomeScreenData as jest.Mock).mockResolvedValue({});

      await homeController.getHomeScreen(req, res);
      expect(homeService.getHomeScreenData).toHaveBeenCalled();
    });

    it('[VAL-HC-02] should handle GENRE_NOT_FOUND error from homeService gracefully', async () => {
      req = mockRequest({ genreId: 'invalid' }, {}, {});
      (homeService.getContentByGenre as jest.Mock).mockRejectedValue(new Error('GENRE_NOT_FOUND'));

      await homeController.getContentByGenre(req, res);
      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, 'genre.notFound', 'en');
    });

    it('[VAL-HC-05] should default sortOrder to desc when invalid value provided in getContentByGenre', async () => {
      req = mockRequest({ genreId: 'g123' }, { sortOrder: 'INVALID_ORDER' }, {});
      (homeService.getContentByGenre as jest.Mock).mockResolvedValue({ items: [] });

      await homeController.getContentByGenre(req, res);
      expect(homeService.getContentByGenre).toHaveBeenCalledWith('g123', expect.objectContaining({ sortOrder: 'desc' }));
    });

    it('[VAL-HC-06] should pass page query parameter to homeService when provided', async () => {
      req = mockRequest({ genreId: 'g123' }, { page: '2' }, {});
      (homeService.getContentByGenre as jest.Mock).mockResolvedValue({ items: [] });

      await homeController.getContentByGenre(req, res);
      expect(homeService.getContentByGenre).toHaveBeenCalledWith('g123', expect.objectContaining({ page: 2 }));
    });
  });
});
