import request from 'supertest';
import express from 'express';
import homeRoutes from '../../../src/modules/home/home.routes';
import { homeController } from '../../../src/modules/home/controllers/home.controller';

jest.mock('../../../src/modules/home/controllers/home.controller', () => ({
  homeController: {
    getMetaData: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
    getSections: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  },
}));

jest.mock('../../../src/core/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    (req as any).user = { _id: 'mock-user-id' };
    next();
  }),
}));

describe('Home Routes Integration Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/home', homeRoutes);
  });

  /* =========================================================================
   * ROUTING VERIFICATION
   * ========================================================================= */
  it('[Positive] GET /api/v1/home/metadata should route to homeController.getMetaData', async () => {
    const res = await request(app).get('/api/v1/home/metadata');
    expect(res.status).toBe(200);
    expect(homeController.getMetaData).toHaveBeenCalled();
  });

  it('[Positive] GET /api/v1/home/content should route to homeController.getSections', async () => {
    const res = await request(app).get('/api/v1/home/content');
    expect(res.status).toBe(200);
    expect(homeController.getSections).toHaveBeenCalled();
  });
});
