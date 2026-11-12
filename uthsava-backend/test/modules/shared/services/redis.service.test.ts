/// <reference types="jest" />
import { redis, setCache, getCache, delCache } from "../../../../src/modules/shared/services/redis.service";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => {
    return {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
  });
});

describe("Redis Cache Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("[Positive] should set cache key, value, and TTL successfully", async () => {
    (redis.set as jest.Mock).mockResolvedValue("OK");

    await setCache("testKey", "testVal", 3600);

    expect(redis.set).toHaveBeenCalledWith("testKey", "testVal", "EX", 3600);
  });

  it("[Positive] should retrieve cache value successfully", async () => {
    (redis.get as jest.Mock).mockResolvedValue("cached_value");

    const val = await getCache("testKey");

    expect(redis.get).toHaveBeenCalledWith("testKey");
    expect(val).toBe("cached_value");
  });

  it("[Positive] should delete cache key successfully", async () => {
    (redis.del as jest.Mock).mockResolvedValue(1);

    await delCache("testKey");

    expect(redis.del).toHaveBeenCalledWith("testKey");
  });

  it("[Edge] should propagate errors if the redis client fails during cache write", async () => {
    (redis.set as jest.Mock).mockRejectedValue(new Error("Connection lost"));

    await expect(setCache("testKey", "testVal", 100)).rejects.toThrow("Connection lost");
  });

  it("[Edge] should propagate errors if the redis client fails during cache read", async () => {
    (redis.get as jest.Mock).mockRejectedValue(new Error("Redis disconnected"));

    await expect(getCache("testKey")).rejects.toThrow("Redis disconnected");
  });
});
