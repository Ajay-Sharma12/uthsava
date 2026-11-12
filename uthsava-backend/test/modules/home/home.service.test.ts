import { homeService } from '../../../src/modules/home/services/home.service';

describe('HomeService API Unit Tests', () => {
  it('should be defined and export core methods including getMetaData and getSections', () => {
    expect(homeService).toBeDefined();
    expect(typeof homeService.getMetaData).toBe('function');
    expect(typeof homeService.getSections).toBe('function');
  });
});
