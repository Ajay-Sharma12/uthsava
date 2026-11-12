import { Request } from 'express';

/**
 * Extracts the selected account / profile ID from HTTP request header (`id`), query param (`profileId` or `id`), or body (`profileId` or `id`).
 * Note: Express automatically lowercases header keys, so `req.headers['id']` reads the header key `id`.
 *
 * Example Header:
 *   id: 6a7024bd9333941fd92cc7b8
 *
 * @param req Express Request object
 * @returns Profile ID string if present, or undefined
 */
export const extractProfileId = (req: Request): string | undefined => {
  const rawId = req.headers['id'] as string;
  return rawId ? String(rawId).trim() : undefined;
};
