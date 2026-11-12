import { Request, Response } from 'express';
import { bannerAdminService } from '../services/banner.service';
import { ResponseHandler } from '../../../common/responses/response.handler';
import { getLanguage } from '../../shared/helpers/language.helper';
import { logger } from '../../../core/constants/logger';
import { HTTP_STATUS } from '../../../core/constants/app.constants';
import { JwtPayload } from '../../../common/types/auth.types';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * GET /api/v1/admin/banners
 * List Banners with pagination, search, status, type, and isKids filters.
 */
export const listBanners = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const search = req.query.search as string;
    const status = req.query.status as any;
    const type = req.query.type as string;
    const isKidsQuery = req.query.isKids as string;
    const isKids = isKidsQuery !== undefined ? isKidsQuery === 'true' : undefined;

    const result = await bannerAdminService.listBanners({
      page,
      limit,
      search,
      status,
      type,
      isKids,
    });

    return ResponseHandler.success(res, result, 'banner.listed', lang);
  } catch (error: any) {
    logger.error('List banners error:', error);
    const lang = getLanguage(req);
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * GET /api/v1/admin/banners/selectable-contents
 * List active Content/Series to pick when creating hero banners.
 */
export const getSelectableContents = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const isKidsQuery = req.query.isKids as string;
    const isKids = isKidsQuery !== undefined ? isKidsQuery === 'true' : undefined;

    const result = await bannerAdminService.getSelectableContents({
      page,
      limit,
      search,
      type,
      isKids,
    });

    return ResponseHandler.success(res, result, 'banner.selectableContentsListed', lang);
  } catch (error: any) {
    logger.error('Get selectable contents error:', error);
    const lang = getLanguage(req);
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * GET /api/v1/admin/banners/:id
 * Get single banner details
 */
export const getBannerById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { id } = req.params;

    const banner = await bannerAdminService.getBannerById(id);
    return ResponseHandler.success(res, banner, 'banner.fetched', lang);
  } catch (error: any) {
    logger.error('Get banner by id error:', error);
    const lang = getLanguage(req);
    if (error.message === 'BANNER_NOT_FOUND' || error.message === 'INVALID_BANNER_ID') {
      return ResponseHandler.error(res, 'banner.notFound', lang, HTTP_STATUS.NOT_FOUND);
    }
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * POST /api/v1/admin/banners
 * Create new banner
 */
export const createBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const adminId = req.user?.sub;

    const banner = await bannerAdminService.createBanner(req.body, adminId);
    return ResponseHandler.success(res, banner, 'banner.created', lang, HTTP_STATUS.CREATED);
  } catch (error: any) {
    logger.error('Create banner error:', error);
    const lang = getLanguage(req);
    if (error.message === 'CONTENT_NOT_FOUND' || error.message === 'INVALID_CONTENT_ID') {
      return ResponseHandler.error(res, 'banner.contentNotFound', lang, HTTP_STATUS.BAD_REQUEST);
    }
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * PUT /api/v1/admin/banners/:id
 * Update banner
 */
export const updateBanner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { id } = req.params;
    const adminId = req.user?.sub;

    const updated = await bannerAdminService.updateBanner(id, req.body, adminId);
    return ResponseHandler.success(res, updated, 'banner.updated', lang);
  } catch (error: any) {
    logger.error('Update banner error:', error);
    const lang = getLanguage(req);
    if (error.message === 'BANNER_NOT_FOUND' || error.message === 'INVALID_BANNER_ID') {
      return ResponseHandler.error(res, 'banner.notFound', lang, HTTP_STATUS.NOT_FOUND);
    }
    if (error.message === 'CONTENT_NOT_FOUND' || error.message === 'INVALID_CONTENT_ID') {
      return ResponseHandler.error(res, 'banner.contentNotFound', lang, HTTP_STATUS.BAD_REQUEST);
    }
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * PATCH /api/v1/admin/banners/:id/status
 * Update banner status
 */
export const updateStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?.sub;

    const updated = await bannerAdminService.updateStatus(id, status, adminId);
    return ResponseHandler.success(res, updated, 'banner.statusUpdated', lang);
  } catch (error: any) {
    logger.error('Update banner status error:', error);
    const lang = getLanguage(req);
    if (error.message === 'BANNER_NOT_FOUND' || error.message === 'INVALID_BANNER_ID') {
      return ResponseHandler.error(res, 'banner.notFound', lang, HTTP_STATUS.NOT_FOUND);
    }
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * DELETE /api/v1/admin/banners/:id
 * Delete banner
 */
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { id } = req.params;

    await bannerAdminService.deleteBanner(id);
    return ResponseHandler.success(res, { success: true }, 'banner.deleted', lang);
  } catch (error: any) {
    logger.error('Delete banner error:', error);
    const lang = getLanguage(req);
    if (error.message === 'BANNER_NOT_FOUND' || error.message === 'INVALID_BANNER_ID') {
      return ResponseHandler.error(res, 'banner.notFound', lang, HTTP_STATUS.NOT_FOUND);
    }
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};

/**
 * POST /api/v1/admin/banners/reorder
 * Reorder banners display order
 */
export const reorderBanners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { banners } = req.body;
    const adminId = req.user?.sub;

    await bannerAdminService.reorderBanners(banners, adminId);
    return ResponseHandler.success(res, { success: true }, 'banner.reordered', lang);
  } catch (error: any) {
    logger.error('Reorder banners error:', error);
    const lang = getLanguage(req);
    return ResponseHandler.error(res, 'general.error', lang, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }
};
