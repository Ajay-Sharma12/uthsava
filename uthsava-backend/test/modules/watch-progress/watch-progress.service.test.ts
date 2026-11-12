import { watchProgressService } from '../../../src/modules/watch-progress/services/watch-progress.service';

describe('WatchProgressService Unit Tests', () => {
  it('should be defined with core playback methods', () => {
    expect(watchProgressService).toBeDefined();
    expect(typeof watchProgressService.updateProgress).toBe('function');
    expect(typeof watchProgressService.removeFromContinueWatching).toBe('function');
    expect(typeof watchProgressService.getContinueWatchingList).toBe('function');
  });
});
