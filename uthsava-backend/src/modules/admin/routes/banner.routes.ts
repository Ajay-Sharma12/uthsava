import { Router } from 'express';
import {
  listBanners,
  getSelectableContents,
  getBannerById,
  createBanner,
  updateBanner,
  updateStatus,
  deleteBanner,
  reorderBanners,
} from '../controllers/banner.controller';
import { validateBody } from '../../../core/middleware/validate.middleware';
import {
  createBannerSchema,
  updateBannerSchema,
  updateBannerStatusSchema,
  reorderBannersSchema,
} from '../validators/banner.validator';

const router = Router();

// List selectable movies & series for adding to Banner Manager
router.get('/selectable-contents', getSelectableContents);

// Reorder banners display order
router.post('/reorder', validateBody(reorderBannersSchema), reorderBanners);

// CRUD Banners
router.get('/', listBanners);
router.post('/', validateBody(createBannerSchema), createBanner);
router.get('/:id', getBannerById);
router.put('/:id', validateBody(updateBannerSchema), updateBanner);
router.patch('/:id/status', validateBody(updateBannerStatusSchema), updateStatus);
router.delete('/:id', deleteBanner);

export default router;
