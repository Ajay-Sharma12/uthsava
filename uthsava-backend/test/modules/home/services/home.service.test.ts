/// <reference types="jest" />
import { homeService } from '../../../../src/modules/home/services/home.service';
import {
  User,
  UserProfile,
  Genre,
  Banner,
  Watchlist,
  ProfileType,
} from '../../../../src/models';
import mongoose, { Types } from 'mongoose';

jest.mock('../../../../src/models', () => {
  const original = jest.requireActual('../../../../src/models');
  return {
    ...original,
    Content: {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    },
    User: {
      findById: jest.fn(),
    },
    UserProfile: {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    },
    Genre: {
      find: jest.fn(),
      findOne: jest.fn(),
    },
    Banner: {
      find: jest.fn(),
    },
    Watchlist: {
      find: jest.fn(),
    },
  };
});

describe('HomeService Test Suite', () => {
  const mockUserId = new Types.ObjectId().toString();
  const mockProfileId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('getMetaData', () => {
    it('should return master metadata with banner containing content instead of contentId', async () => {
      const mockProfile = {
        _id: new Types.ObjectId(mockProfileId),
        userId: new Types.ObjectId(mockUserId),
        profileType: ProfileType.STANDARD,
        favoriteGenreIds: [],
      };
      (UserProfile.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfile),
      });

      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ genres: [] }),
        }),
      });

      (Genre.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const mockContentObj = {
        _id: new Types.ObjectId('6a7429d8ba2d5541d3dc248e'),
        title: 'Rise of Thriller 6',
        description: 'An immersive thriller experience',
        shortDescription: 'A compelling thriller movie',
        type: 'MOVIE',
        genreIds: ['6a708e16976d2541c8a754df'],
        releaseYear: 2026,
        poster: ['octal/uthsava/1785992766363-smiley.png'],
        banner: ['octal/uthsava/1785992766363-smiley.png'],
        thumbnail: 'octal/uthsava/1785992769643-frame-2085665423.png',
        teaserVideo: [],
      };

      const mockBannerItem = {
        _id: new Types.ObjectId('6a75871acb1f1f5458570e1c'),
        contentId: mockContentObj,
        customTitle: 'Rise of Thriller 6',
        customBannerImage: 'https://d1f23llskj06r6.cloudfront.net/octal/banners/1786087193448-pexels-njeromin-11900708.jpg',
        displayOrder: 1,
        status: 'ACTIVE',
      };

      const populateMock = jest.fn().mockImplementation(({ path, select }: any) => {
        if (path === 'contentId') {
          expect(select).toContain('title');
          expect(select).not.toContain('mainVideo');
        }
        return {
          populate: populateMock,
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockBannerItem]),
          }),
        };
      });

      (Banner.find as jest.Mock).mockReturnValue({
        populate: populateMock,
      });

      (Watchlist.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const data = await homeService.getMetaData(mockUserId, mockProfileId);

      expect(data.categories).toEqual([
        { id: 'all', name: 'All', slug: 'all' },
        { id: 'movie', name: 'Movie', slug: 'movie' },
        { id: 'series', name: 'Series', slug: 'series' },
      ]);
      expect(data.banner).toHaveLength(1);
      expect(data.banner[0]).toHaveProperty('content');
      expect(data.banner[0]).not.toHaveProperty('contentId');
      expect(data.banner[0].content.title).toBe('Rise of Thriller 6');
      expect(data.banner[0].title).toBe('Rise of Thriller 6');
      expect(data.banner[0].bannerImage).toBe('https://d1f23llskj06r6.cloudfront.net/octal/banners/1786087193448-pexels-njeromin-11900708.jpg');
      expect(data.banner[0]).not.toHaveProperty('customTitle');
      expect(data.banner[0]).not.toHaveProperty('customBannerImage');
    });
  });
});
